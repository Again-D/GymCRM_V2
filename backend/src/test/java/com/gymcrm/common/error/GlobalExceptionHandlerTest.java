package com.gymcrm.common.error;

import com.gymcrm.common.api.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;

class GlobalExceptionHandlerTest {

    @Test
    void unexpectedExceptionDoesNotExposeRawMessage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        RuntimeException ex = new RuntimeException("db password leaked");

        ResponseEntity<ApiResponse<Void>> response = handler.handleUnexpected(ex);

        assertEquals(500, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertNotNull(response.getBody().error());
        assertEquals("INTERNAL_ERROR", response.getBody().error().code());
        assertEquals("Internal server error", response.getBody().error().detail());
        assertNotSame(ex.getMessage(), response.getBody().error().detail());
    }
}
