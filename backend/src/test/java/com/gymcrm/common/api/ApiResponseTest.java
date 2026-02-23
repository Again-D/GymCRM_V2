package com.gymcrm.common.api;

import org.junit.jupiter.api.Test;

import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiResponseTest {

    @Test
    void successTimestampIsGeneratedInUtc() {
        ApiResponse<String> response = ApiResponse.success("ok", "done");

        assertTrue(response.success());
        assertEquals(ZoneOffset.UTC, response.timestamp().getOffset());
    }

    @Test
    void errorTimestampIsGeneratedInUtc() {
        ApiResponse<Void> response = ApiResponse.error(
                "failed",
                new ApiResponse.ApiError("INTERNAL_ERROR", 500, "detail")
        );

        assertFalse(response.success());
        assertEquals(ZoneOffset.UTC, response.timestamp().getOffset());
    }
}
