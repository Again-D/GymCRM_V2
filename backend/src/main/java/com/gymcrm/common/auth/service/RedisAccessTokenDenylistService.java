package com.gymcrm.common.auth.service;

import org.springframework.data.redis.core.StringRedisTemplate;

import com.gymcrm.common.auth.AccessTokenDenylistUnavailableException;

import java.time.Duration;
import java.time.OffsetDateTime;

public class RedisAccessTokenDenylistService implements AccessTokenDenylistService {
    private static final String KEY_PREFIX = "auth:denylist:access:";

    private final StringRedisTemplate stringRedisTemplate;

    public RedisAccessTokenDenylistService(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Override
    public void deny(String jti, OffsetDateTime expiresAt, String reason) {
        if (jti == null || jti.isBlank() || expiresAt == null) {
            return;
        }
        Duration ttl = Duration.between(OffsetDateTime.now(), expiresAt);
        if (ttl.isZero() || ttl.isNegative()) {
            return;
        }
        try {
            stringRedisTemplate.opsForValue().set(key(jti), reason == null ? "DENIED" : reason, ttl);
        } catch (RuntimeException ex) {
            throw new AccessTokenDenylistUnavailableException("Failed to write access token denylist", ex);
        }
    }

    @Override
    public boolean isDenied(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }
        try {
            Boolean exists = stringRedisTemplate.hasKey(key(jti));
            return Boolean.TRUE.equals(exists);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private String key(String jti) {
        return KEY_PREFIX + jti;
    }
}
