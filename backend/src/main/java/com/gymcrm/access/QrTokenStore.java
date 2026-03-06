package com.gymcrm.access;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface QrTokenStore {
    IssuedToken issue(Long centerId, Long memberId, OffsetDateTime now, int ttlSeconds);

    ConsumedToken consume(Long centerId, String token, OffsetDateTime now);

    record IssuedToken(
            String token,
            Long centerId,
            Long memberId,
            OffsetDateTime issuedAt,
            OffsetDateTime expiresAt
    ) {
    }

    record ConsumedToken(
            ConsumeStatus status,
            Long centerId,
            Long memberId,
            OffsetDateTime issuedAt,
            OffsetDateTime expiresAt
    ) {
        static ConsumedToken invalid() {
            return new ConsumedToken(ConsumeStatus.INVALID, null, null, null, null);
        }

        static ConsumedToken reused(Long centerId, Long memberId, OffsetDateTime issuedAt, OffsetDateTime expiresAt) {
            return new ConsumedToken(ConsumeStatus.REUSED, centerId, memberId, issuedAt, expiresAt);
        }

        static ConsumedToken expired(Long centerId, Long memberId, OffsetDateTime issuedAt, OffsetDateTime expiresAt) {
            return new ConsumedToken(ConsumeStatus.EXPIRED, centerId, memberId, issuedAt, expiresAt);
        }

        static ConsumedToken valid(Long centerId, Long memberId, OffsetDateTime issuedAt, OffsetDateTime expiresAt) {
            return new ConsumedToken(ConsumeStatus.VALID, centerId, memberId, issuedAt, expiresAt);
        }

        boolean matchesCenter(Long targetCenterId) {
            return status != ConsumeStatus.INVALID
                    && centerId != null
                    && centerId.equals(targetCenterId);
        }

        public Optional<Long> memberIdOptional() {
            return Optional.ofNullable(memberId);
        }
    }

    enum ConsumeStatus {
        VALID,
        EXPIRED,
        REUSED,
        INVALID
    }
}
