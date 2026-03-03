package com.gymcrm.integration;

public class ExternalAdapterException extends RuntimeException {
    private final String adapter;
    private final ExternalFailureMode failureMode;
    private final boolean retryable;

    public ExternalAdapterException(String adapter, ExternalFailureMode failureMode, boolean retryable, String message) {
        super(message);
        this.adapter = adapter;
        this.failureMode = failureMode;
        this.retryable = retryable;
    }

    public String adapter() {
        return adapter;
    }

    public ExternalFailureMode failureMode() {
        return failureMode;
    }

    public boolean retryable() {
        return retryable;
    }
}
