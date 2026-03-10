package com.gymcrm.access;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryQrTokenStore implements QrTokenStore {
    private static final int REUSED_MARKER_GRACE_SECONDS = 10;

    private final Map<String, ActiveToken> activeByToken = new ConcurrentHashMap<>();
    private final Map<MemberKey, String> activeTokenByMember = new ConcurrentHashMap<>();
    private final Map<String, ConsumedMarker> consumedByToken = new ConcurrentHashMap<>();

    @Override
    public IssuedToken issue(Long centerId, Long memberId, OffsetDateTime now, int ttlSeconds) {
        purge(now);

        MemberKey key = new MemberKey(centerId, memberId);
        String token = "qr-" + UUID.randomUUID();
        OffsetDateTime expiresAt = now.plusSeconds(ttlSeconds);
        ActiveToken activeToken = new ActiveToken(token, centerId, memberId, now, expiresAt);

        String oldToken = activeTokenByMember.put(key, token);
        if (oldToken != null) {
            activeByToken.remove(oldToken);
        }

        activeByToken.put(token, activeToken);
        return new IssuedToken(token, centerId, memberId, now, expiresAt);
    }

    @Override
    public ConsumedToken consume(Long centerId, String token, OffsetDateTime now) {
        purge(now);

        ActiveToken activeToken = activeByToken.remove(token);
        if (activeToken == null) {
            ConsumedMarker consumedMarker = consumedByToken.get(token);
            if (consumedMarker != null && now.isBefore(consumedMarker.markerExpiresAt())) {
                return ConsumedToken.reused(
                        consumedMarker.centerId(),
                        consumedMarker.memberId(),
                        consumedMarker.issuedAt(),
                        consumedMarker.expiresAt()
                );
            }
            return ConsumedToken.invalid();
        }

        if (!centerId.equals(activeToken.centerId())) {
            return ConsumedToken.invalid();
        }

        activeTokenByMember.remove(new MemberKey(activeToken.centerId(), activeToken.memberId()), token);

        if (!now.isBefore(activeToken.expiresAt())) {
            return ConsumedToken.expired(
                    activeToken.centerId(),
                    activeToken.memberId(),
                    activeToken.issuedAt(),
                    activeToken.expiresAt()
            );
        }

        consumedByToken.put(token, new ConsumedMarker(
                activeToken.centerId(),
                activeToken.memberId(),
                activeToken.issuedAt(),
                activeToken.expiresAt(),
                activeToken.expiresAt().plusSeconds(REUSED_MARKER_GRACE_SECONDS)
        ));
        return ConsumedToken.valid(
                activeToken.centerId(),
                activeToken.memberId(),
                activeToken.issuedAt(),
                activeToken.expiresAt()
        );
    }

    private void purge(OffsetDateTime now) {
        activeByToken.entrySet().removeIf(entry ->
                !now.isBefore(entry.getValue().expiresAt().plusSeconds(REUSED_MARKER_GRACE_SECONDS))
        );
        consumedByToken.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().markerExpiresAt()));
    }

    private record MemberKey(Long centerId, Long memberId) {
    }

    private record ActiveToken(
            String token,
            Long centerId,
            Long memberId,
            OffsetDateTime issuedAt,
            OffsetDateTime expiresAt
    ) {
    }

    private record ConsumedMarker(
            Long centerId,
            Long memberId,
            OffsetDateTime issuedAt,
            OffsetDateTime expiresAt,
            OffsetDateTime markerExpiresAt
    ) {
    }
}
