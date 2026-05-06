package com.gymcrm.common.security;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PiiEncryptionServiceTest {

    @Test
    void encryptUsesActiveKeyVersionAndDecryptsWithMatchingVersion() {
        PiiEncryptionService service = new PiiEncryptionService(new PiiKeyProvider(new PiiKeyProperties(
                "legacy-key",
                2,
                true,
                Map.of(
                        1, "old-key-v1",
                        2, "active-key-v2"
                )
        )));

        PiiEncryptionService.EncryptedPii encrypted = service.encryptWithActiveVersion("010-1234-5678");

        assertEquals(2, encrypted.keyVersion());
        assertNotNull(encrypted.cipherText());
        assertEquals("010-1234-5678", service.decrypt(encrypted.cipherText(), encrypted.keyVersion()));
    }

    @Test
    void decryptSupportsOlderConfiguredKeyVersion() {
        PiiEncryptionService previousService = new PiiEncryptionService(new PiiKeyProvider(new PiiKeyProperties(
                "legacy-key",
                1,
                true,
                Map.of(
                        1, "old-key-v1",
                        2, "active-key-v2"
                )
        )));
        String oldCipher = previousService.encryptWithActiveVersion("1990-10-10").cipherText();

        PiiEncryptionService service = new PiiEncryptionService(new PiiKeyProvider(new PiiKeyProperties(
                "legacy-key",
                2,
                true,
                Map.of(
                        1, "old-key-v1",
                        2, "active-key-v2"
                )
        )));

        assertEquals("1990-10-10", service.decrypt(oldCipher, 1));
    }

    @Test
    void decryptFailsWhenVersionIsUnknown() {
        PiiEncryptionService service = new PiiEncryptionService(new PiiKeyProvider(new PiiKeyProperties(
                "legacy-key",
                2,
                true,
                Map.of(
                        1, "old-key-v1",
                        2, "active-key-v2"
                )
        )));
        String cipher = service.encrypt("plain");

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> service.decrypt(cipher, 99));
        assertTrue(exception.getMessage().contains("Failed to decrypt PII"));
        assertTrue(exception.getCause() instanceof IllegalStateException);
        assertTrue(exception.getCause().getMessage().contains("Unknown PII key version: 99"));
    }

    @Test
    void rotationEnabledFailsFastWhenActiveVersionKeyMissing() {
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> new PiiKeyProvider(new PiiKeyProperties(
                "legacy-key",
                2,
                true,
                Map.of(1, "old-key-v1")
        )));

        assertTrue(exception.getMessage().contains("active key version is missing"));
        assertTrue(!exception.getMessage().contains("old-key-v1"));
    }

    @Test
    void rotationDisabledPreservesLegacySingleKeyBehavior() {
        PiiEncryptionService service = new PiiEncryptionService(new PiiKeyProvider(new PiiKeyProperties(
                "legacy-key",
                7,
                false,
                Map.of()
        )));

        String cipher = service.encrypt("legacy-plain");

        assertEquals("legacy-plain", service.decrypt(cipher));
        assertEquals("legacy-plain", service.decrypt(cipher, 999));
        assertEquals(7, service.encryptWithActiveVersion("legacy-plain").keyVersion());
    }
}
