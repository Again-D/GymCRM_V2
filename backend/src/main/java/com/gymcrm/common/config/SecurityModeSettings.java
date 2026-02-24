package com.gymcrm.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class SecurityModeSettings {
    private final String mode;

    public SecurityModeSettings(@Value("${app.security.mode:prototype}") String mode) {
        this.mode = normalize(mode);
    }

    public String mode() {
        return mode;
    }

    public boolean isPrototypeMode() {
        return "prototype".equals(mode);
    }

    public boolean isJwtMode() {
        return "jwt".equals(mode);
    }

    private String normalize(String value) {
        if (value == null) {
            return "prototype";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!"prototype".equals(normalized) && !"jwt".equals(normalized)) {
            throw new IllegalStateException("Unsupported app.security.mode: " + value + " (expected prototype|jwt)");
        }
        return normalized;
    }
}
