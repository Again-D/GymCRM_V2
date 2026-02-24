package com.gymcrm.common.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class PrototypeModeGuard implements ApplicationRunner {
    private final PrototypeModeSettings settings;
    private final SecurityModeSettings securityModeSettings;

    public PrototypeModeGuard(PrototypeModeSettings settings, SecurityModeSettings securityModeSettings) {
        this.settings = settings;
        this.securityModeSettings = securityModeSettings;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!securityModeSettings.isPrototypeMode()) {
            return;
        }

        if (!settings.isNoAuthEnabled()) {
            return;
        }

        if (!settings.isNoAuthAllowedProfileActive()) {
            throw new IllegalStateException(
                    "Prototype no-auth mode is only allowed in dev/staging profiles."
            );
        }
    }
}
