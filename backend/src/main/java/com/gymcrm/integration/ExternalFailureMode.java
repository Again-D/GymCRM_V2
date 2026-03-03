package com.gymcrm.integration;

public enum ExternalFailureMode {
    NONE,
    TIMEOUT,
    HTTP_5XX,
    OFFLINE;

    public static ExternalFailureMode from(String value) {
        if (value == null || value.isBlank()) {
            return NONE;
        }
        String normalized = value.trim().toUpperCase();
        return switch (normalized) {
            case "NONE" -> NONE;
            case "TIMEOUT" -> TIMEOUT;
            case "HTTP_5XX", "5XX", "SERVER_ERROR" -> HTTP_5XX;
            case "OFFLINE" -> OFFLINE;
            default -> throw new IllegalArgumentException("Unsupported failure mode: " + value);
        };
    }
}
