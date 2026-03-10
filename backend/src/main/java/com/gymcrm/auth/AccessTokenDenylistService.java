package com.gymcrm.auth;

import java.time.OffsetDateTime;

public interface AccessTokenDenylistService {
    void deny(String jti, OffsetDateTime expiresAt, String reason);

    boolean isDenied(String jti);
}
