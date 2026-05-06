package com.gymcrm.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;

@ConfigurationProperties(prefix = "app.security.pii")
public record PiiKeyProperties(
        String encryptionKey,
        int keyVersion,
        boolean rotationEnabled,
        Map<Integer, String> keys
) {
    public PiiKeyProperties {
        keys = keys == null ? Map.of() : Map.copyOf(keys);
    }
}
