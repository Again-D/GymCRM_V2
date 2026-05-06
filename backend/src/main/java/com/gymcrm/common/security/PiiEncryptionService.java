package com.gymcrm.common.security;

import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class PiiEncryptionService {
    private static final String AES_GCM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final PiiKeyProvider piiKeyProvider;
    private final SecureRandom secureRandom = new SecureRandom();

    public PiiEncryptionService(PiiKeyProvider piiKeyProvider) {
        this.piiKeyProvider = piiKeyProvider;
    }

    public String encrypt(String plain) {
        return encryptWithActiveVersion(plain).cipherText();
    }

    public EncryptedPii encryptWithActiveVersion(String plain) {
        if (plain == null) {
            return new EncryptedPii(null, piiKeyProvider.activeKeyVersion());
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_GCM);
            cipher.init(Cipher.ENCRYPT_MODE, piiKeyProvider.activeKeySpec(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));

            byte[] payload = ByteBuffer.allocate(iv.length + encrypted.length)
                    .put(iv)
                    .put(encrypted)
                    .array();
            return new EncryptedPii(Base64.getEncoder().encodeToString(payload), piiKeyProvider.activeKeyVersion());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to encrypt PII", ex);
        }
    }

    public int activeKeyVersion() {
        return piiKeyProvider.activeKeyVersion();
    }

    public String decrypt(String encrypted) {
        return decrypt(encrypted, piiKeyProvider.activeKeyVersion());
    }

    public String decrypt(String encrypted, int keyVersion) {
        if (encrypted == null || encrypted.isBlank()) {
            return null;
        }
        try {
            byte[] payload = Base64.getDecoder().decode(encrypted);
            if (payload.length <= IV_LENGTH) {
                throw new IllegalStateException("Encrypted payload is invalid");
            }
            byte[] iv = new byte[IV_LENGTH];
            byte[] cipherText = new byte[payload.length - IV_LENGTH];
            System.arraycopy(payload, 0, iv, 0, IV_LENGTH);
            System.arraycopy(payload, IV_LENGTH, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(AES_GCM);
            SecretKeySpec keySpec = piiKeyProvider.keySpecForVersion(keyVersion);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to decrypt PII", ex);
        }
    }

    public record EncryptedPii(String cipherText, int keyVersion) {
    }
}
