package com.gymcrm.auth;

import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;

public class RedisAccessRevocationMarkerService implements AccessRevocationMarkerService {
    private static final String KEY_PREFIX = "auth:revoke-after:user:";

    private final StringRedisTemplate stringRedisTemplate;

    public RedisAccessRevocationMarkerService(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Override
    public void mirrorRevokeAfter(Long userId, OffsetDateTime revokedAfter) {
        if (userId == null || revokedAfter == null) {
            return;
        }
        stringRedisTemplate.opsForValue().set(key(userId), revokedAfter.toString());
    }

    @Override
    public OffsetDateTime resolveRevokeAfter(Long userId, OffsetDateTime canonicalValue) {
        if (userId == null) {
            return canonicalValue;
        }
        try {
            String value = stringRedisTemplate.opsForValue().get(key(userId));
            if (value == null || value.isBlank()) {
                if (canonicalValue != null) {
                    mirrorRevokeAfter(userId, canonicalValue);
                }
                return canonicalValue;
            }
            OffsetDateTime runtimeValue = OffsetDateTime.parse(value);
            if (canonicalValue == null || runtimeValue.isAfter(canonicalValue)) {
                return runtimeValue;
            }
            if (canonicalValue.isAfter(runtimeValue)) {
                mirrorRevokeAfter(userId, canonicalValue);
            }
            return canonicalValue;
        } catch (DateTimeParseException ex) {
            return canonicalValue;
        } catch (RuntimeException ex) {
            return canonicalValue;
        }
    }

    @Override
    public void clear(Long userId) {
        if (userId == null) {
            return;
        }
        stringRedisTemplate.delete(key(userId));
    }

    private String key(Long userId) {
        return KEY_PREFIX + userId;
    }
}
