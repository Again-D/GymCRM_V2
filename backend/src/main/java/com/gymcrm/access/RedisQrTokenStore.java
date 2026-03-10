package com.gymcrm.access;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

public class RedisQrTokenStore implements QrTokenStore {
    private static final int REUSED_MARKER_GRACE_SECONDS = 10;
    private static final String TOKEN_KEY_PREFIX = "qr:token:";
    private static final String MEMBER_ACTIVE_KEY_PREFIX = "qr:member-active:";
    private static final String REUSED_KEY_PREFIX = "qr:reused:";
    private static final DefaultRedisScript<List> CONSUME_SCRIPT = new DefaultRedisScript<>(
            """
            local tokenKey = KEYS[1]
            local reusedKey = KEYS[2]
            local expectedCenterId = ARGV[1]
            local nowEpochMs = tonumber(ARGV[2])
            local reusedTtlMs = tonumber(ARGV[3])
            local memberActivePrefix = ARGV[4]

            local payload = redis.call('GET', tokenKey)
            if not payload then
              local reusedPayload = redis.call('GET', reusedKey)
              if reusedPayload then
                return {'REUSED', reusedPayload}
              end
              return {'INVALID'}
            end

            redis.call('DEL', tokenKey)

            local parts = {}
            for part in string.gmatch(payload, '([^|]+)') do
              table.insert(parts, part)
            end

            local centerId = parts[1]
            local memberId = parts[2]
            local issuedEpochMs = tonumber(parts[3])
            local expiresEpochMs = tonumber(parts[4])
            local memberActiveKey = memberActivePrefix .. centerId .. ':' .. memberId
            local activeToken = redis.call('GET', memberActiveKey)

            if centerId ~= expectedCenterId then
              return {'INVALID'}
            end

            if activeToken == parts[5] then
              redis.call('DEL', memberActiveKey)
            end

            if nowEpochMs >= expiresEpochMs then
              return {'EXPIRED', payload}
            end

            redis.call('SET', reusedKey, payload, 'PX', reusedTtlMs)
            return {'VALID', payload}
            """,
            List.class
    );

    private final StringRedisTemplate redisTemplate;

    public RedisQrTokenStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public IssuedToken issue(Long centerId, Long memberId, OffsetDateTime now, int ttlSeconds) {
        try {
            String token = "qr-" + UUID.randomUUID();
            OffsetDateTime expiresAt = now.plusSeconds(ttlSeconds);
            String tokenKey = tokenKey(token);
            String memberActiveKey = memberActiveKey(centerId, memberId);
            Duration activeTtl = Duration.ofSeconds(ttlSeconds + REUSED_MARKER_GRACE_SECONDS);

            String oldToken = redisTemplate.opsForValue().get(memberActiveKey);
            if (oldToken != null && !oldToken.isBlank()) {
                redisTemplate.delete(tokenKey(oldToken));
            }

            redisTemplate.opsForValue().set(tokenKey, serialize(centerId, memberId, now, expiresAt, token), activeTtl);
            redisTemplate.opsForValue().set(memberActiveKey, token, activeTtl);

            return new IssuedToken(token, centerId, memberId, now, expiresAt);
        } catch (RuntimeException ex) {
            throw new QrTokenStoreUnavailableException("Failed to issue QR token from Redis store", ex);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public ConsumedToken consume(Long centerId, String token, OffsetDateTime now) {
        try {
            List<String> result = redisTemplate.execute(
                    CONSUME_SCRIPT,
                    List.of(tokenKey(token), reusedKey(token)),
                    String.valueOf(centerId),
                    String.valueOf(toEpochMillis(now)),
                    String.valueOf(Duration.ofSeconds(REUSED_MARKER_GRACE_SECONDS).toMillis()),
                    MEMBER_ACTIVE_KEY_PREFIX
            );
            if (result == null || result.isEmpty()) {
                return ConsumedToken.invalid();
            }
            String status = result.get(0);
            if ("INVALID".equals(status)) {
                return ConsumedToken.invalid();
            }
            TokenPayload payload = TokenPayload.parse(result.get(1));
            return switch (status) {
                case "VALID" -> ConsumedToken.valid(payload.centerId(), payload.memberId(), payload.issuedAt(), payload.expiresAt());
                case "EXPIRED" -> ConsumedToken.expired(payload.centerId(), payload.memberId(), payload.issuedAt(), payload.expiresAt());
                case "REUSED" -> ConsumedToken.reused(payload.centerId(), payload.memberId(), payload.issuedAt(), payload.expiresAt());
                default -> ConsumedToken.invalid();
            };
        } catch (RuntimeException ex) {
            throw new QrTokenStoreUnavailableException("Failed to consume QR token from Redis store", ex);
        }
    }

    private String tokenKey(String token) {
        return TOKEN_KEY_PREFIX + token;
    }

    private String reusedKey(String token) {
        return REUSED_KEY_PREFIX + token;
    }

    private String memberActiveKey(Long centerId, Long memberId) {
        return MEMBER_ACTIVE_KEY_PREFIX + centerId + ":" + memberId;
    }
    private String serialize(Long centerId, Long memberId, OffsetDateTime issuedAt, OffsetDateTime expiresAt, String token) {
        return centerId + "|" + memberId + "|" + toEpochMillis(issuedAt) + "|" + toEpochMillis(expiresAt) + "|" + token;
    }

    private long toEpochMillis(OffsetDateTime value) {
        return value.toInstant().toEpochMilli();
    }

    private record TokenPayload(
            Long centerId,
            Long memberId,
            OffsetDateTime issuedAt,
            OffsetDateTime expiresAt,
            String token
    ) {
        static TokenPayload parse(String value) {
            String[] parts = value.split("\\|", -1);
            return new TokenPayload(
                    Long.parseLong(parts[0]),
                    Long.parseLong(parts[1]),
                    OffsetDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[2])), ZoneOffset.UTC),
                    OffsetDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[3])), ZoneOffset.UTC),
                    parts[4]
            );
        }
    }
}
