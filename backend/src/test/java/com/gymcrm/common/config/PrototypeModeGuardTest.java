package com.gymcrm.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PrototypeModeGuardTest {

    @Test
    void allowsNoAuthInDevProfile() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");

        PrototypeModeSettings settings = new PrototypeModeSettings(true, environment);
        PrototypeModeGuard guard = new PrototypeModeGuard(settings);

        assertDoesNotThrow(() -> guard.run(null));
    }

    @Test
    void blocksNoAuthWhenNoAllowedProfileIsActive() {
        MockEnvironment environment = new MockEnvironment();

        PrototypeModeSettings settings = new PrototypeModeSettings(true, environment);
        PrototypeModeGuard guard = new PrototypeModeGuard(settings);

        assertThrows(IllegalStateException.class, () -> guard.run(null));
    }

    @Test
    void allowsWhenNoAuthIsDisabled() {
        MockEnvironment environment = new MockEnvironment();

        PrototypeModeSettings settings = new PrototypeModeSettings(false, environment);
        PrototypeModeGuard guard = new PrototypeModeGuard(settings);

        assertDoesNotThrow(() -> guard.run(null));
    }
}
