package com.gymcrm.membership.enums;

import com.gymcrm.common.error.ApiException;
import com.gymcrm.common.error.ErrorCode;

public enum RefundStatus {
    COMPLETED;

    public static RefundStatus from(String value) {
        if (value == null || value.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "refundStatus is required");
        }
        try {
            return RefundStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "refundStatus is invalid");
        }
    }
}
