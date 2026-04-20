package com.gymcrm.common.auth.entity;

import java.time.OffsetDateTime;

public record AuthUser(
        Long userId,
        Long centerId,
        String loginId,
        String passwordHash,
        String userName,
        String phone,
        String roleCode,
        String userStatus,
        boolean passwordChangeRequired,
        OffsetDateTime lastLoginAt,
        OffsetDateTime accessRevokedAfter
) {
    public boolean isActive() {
        return "ACTIVE".equals(userStatus);
    }
}
