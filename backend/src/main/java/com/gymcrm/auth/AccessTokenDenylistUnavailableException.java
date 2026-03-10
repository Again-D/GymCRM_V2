package com.gymcrm.auth;

public class AccessTokenDenylistUnavailableException extends RuntimeException {
    public AccessTokenDenylistUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
