package com.gymcrm.auth;

import java.time.OffsetDateTime;

public record AuthUser(
        Long userId,
        Long centerId,
        String loginId,
        String passwordHash,
        String displayName,
        String phone,
        String roleCode,
        String userStatus,
        OffsetDateTime lastLoginAt,
        OffsetDateTime accessRevokedAfter
) {
    public boolean isActive() {
        return "ACTIVE".equals(userStatus);
    }
}
