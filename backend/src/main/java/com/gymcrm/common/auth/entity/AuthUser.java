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
        OffsetDateTime passwordChangedAt,
        OffsetDateTime lastLoginAt,
        OffsetDateTime accessRevokedAfter
) {
    public boolean isActive() {
        return "ACTIVE".equals(userStatus);
    }

    public boolean isPasswordChangeRecommended(int thresholdDays) {
        OffsetDateTime baseline = passwordChangedAt != null ? passwordChangedAt : lastLoginAt;
        if (baseline == null) {
            return false;
        }
        return baseline.plusDays(thresholdDays).isBefore(OffsetDateTime.now());
    }
}
