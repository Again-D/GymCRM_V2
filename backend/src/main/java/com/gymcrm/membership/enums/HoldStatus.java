package com.gymcrm.membership.enums;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;

public enum HoldStatus {
    ACTIVE,
    RESUMED;

    public static HoldStatus from(String value) {
        if (value == null || value.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "holdStatus is required");
        }
        try {
            return HoldStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "holdStatus is invalid");
        }
    }
}
