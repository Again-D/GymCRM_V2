package com.gymcrm.common.api;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record ApiResponse<T>(
        boolean success,
        T data,
        String message,
        OffsetDateTime timestamp,
        ApiError error
) {
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message, OffsetDateTime.now(ZoneOffset.UTC), null);
    }

    public static <T> ApiResponse<T> error(String message, ApiError error) {
        return new ApiResponse<>(false, null, message, OffsetDateTime.now(ZoneOffset.UTC), error);
    }

    public record ApiError(
            String code,
            int status,
            String detail
    ) {}
}
