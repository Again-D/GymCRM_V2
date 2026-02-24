package com.gymcrm.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;

@Component
public class PrototypeModeSettings {
    private static final Set<String> NO_AUTH_ALLOWED_PROFILES = Set.of("dev", "staging");

    private final boolean noAuthEnabled;
    private final Environment environment;

    public PrototypeModeSettings(
            @Value("${app.prototype.no-auth-enabled:true}") boolean noAuthEnabled,
            Environment environment
    ) {
        this.noAuthEnabled = noAuthEnabled;
        this.environment = environment;
    }

    public boolean isNoAuthEnabled() {
        return noAuthEnabled;
    }

    public boolean isProdProfileActive() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase);
    }

    public boolean isNoAuthAllowedProfileActive() {
        if (isProdProfileActive()) {
            return false;
        }
        return Arrays.stream(environment.getActiveProfiles())
                .map(String::toLowerCase)
                .anyMatch(NO_AUTH_ALLOWED_PROFILES::contains);
    }
}
