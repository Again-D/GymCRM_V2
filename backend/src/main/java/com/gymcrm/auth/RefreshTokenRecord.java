package com.gymcrm.auth;

import java.time.OffsetDateTime;

public record RefreshTokenRecord(
        Long refreshTokenId,
        Long userId,
        String tokenHash,
        String jti,
        String tokenFamilyId,
        OffsetDateTime expiresAt,
        OffsetDateTime revokedAt,
        String revokeReason,
        OffsetDateTime createdAt,
        OffsetDateTime rotatedAt
) {
    public boolean isRevoked() {
        return revokedAt != null;
    }
}
