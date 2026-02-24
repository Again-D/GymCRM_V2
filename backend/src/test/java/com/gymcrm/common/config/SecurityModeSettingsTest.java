package com.gymcrm.common.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityModeSettingsTest {

    @Test
    void normalizesModeValue() {
        SecurityModeSettings settings = new SecurityModeSettings(" JWT ");

        assertEquals("jwt", settings.mode());
        assertTrue(settings.isJwtMode());
    }

    @Test
    void rejectsUnsupportedMode() {
        assertThrows(IllegalStateException.class, () -> new SecurityModeSettings("abc"));
    }
}
