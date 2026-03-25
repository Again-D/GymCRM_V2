package com.gymcrm.common.auth.service;

import java.time.OffsetDateTime;

public class NoOpAccessTokenDenylistService implements AccessTokenDenylistService {
    @Override
    public void deny(String jti, OffsetDateTime expiresAt, String reason) {
        // no-op when denylist is disabled
    }

    @Override
    public boolean isDenied(String jti) {
        return false;
    }
}
