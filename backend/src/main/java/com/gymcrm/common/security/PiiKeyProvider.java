package com.gymcrm.common.security;

import org.springframework.stereotype.Component;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

@Component
public class PiiKeyProvider {
    private final boolean rotationEnabled;
    private final int activeKeyVersion;
    private final SecretKeySpec legacySecretKeySpec;
    private final SecretKeySpec activeSecretKeySpec;
    private final Map<Integer, SecretKeySpec> keySpecsByVersion;

    public PiiKeyProvider(PiiKeyProperties properties) {
        this.rotationEnabled = properties.rotationEnabled();
        this.activeKeyVersion = properties.keyVersion();
        this.legacySecretKeySpec = toSecretKey(properties.encryptionKey(), "legacy encryption-key");

        if (!rotationEnabled) {
            this.activeSecretKeySpec = legacySecretKeySpec;
            this.keySpecsByVersion = Map.of();
            return;
        }

        Map<Integer, String> configuredKeys = properties.keys();
        if (configuredKeys.isEmpty()) {
            throw new IllegalStateException("PII rotation is enabled but no key map is configured");
        }
        String activeRawKey = configuredKeys.get(activeKeyVersion);
        if (activeRawKey == null || activeRawKey.isBlank()) {
            throw new IllegalStateException("PII rotation is enabled but active key version is missing in configured key map");
        }

        Map<Integer, SecretKeySpec> generated = new HashMap<>();
        for (Map.Entry<Integer, String> entry : configuredKeys.entrySet()) {
            Integer version = entry.getKey();
            if (version == null) {
                throw new IllegalStateException("PII rotation key map contains null version");
            }
            generated.put(version, toSecretKey(entry.getValue(), "configured key for version " + version));
        }

        this.activeSecretKeySpec = generated.get(activeKeyVersion);
        this.keySpecsByVersion = Map.copyOf(generated);
    }

    public int activeKeyVersion() {
        return activeKeyVersion;
    }

    public SecretKeySpec activeKeySpec() {
        return activeSecretKeySpec;
    }

    public SecretKeySpec keySpecForVersion(int keyVersion) {
        if (!rotationEnabled) {
            return legacySecretKeySpec;
        }
        SecretKeySpec keySpec = keySpecsByVersion.get(keyVersion);
        if (keySpec == null) {
            throw new IllegalStateException("Unknown PII key version: " + keyVersion);
        }
        return keySpec;
    }

    private SecretKeySpec toSecretKey(String rawKey, String sourceLabel) {
        if (rawKey == null || rawKey.isBlank()) {
            throw new IllegalStateException("PII key material is missing for " + sourceLabel);
        }
        return new SecretKeySpec(sha256(rawKey), "AES");
    }

    private byte[] sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to initialize PII encryption key", ex);
        }
    }
}
