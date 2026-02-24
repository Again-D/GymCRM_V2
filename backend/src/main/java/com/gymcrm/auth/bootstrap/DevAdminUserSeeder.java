package com.gymcrm.auth.bootstrap;

import com.gymcrm.common.config.SecurityModeSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Set;

@Component
public class DevAdminUserSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DevAdminUserSeeder.class);
    private static final Set<String> ALLOWED_PROFILES = Set.of("dev", "staging");

    private final SecurityModeSettings securityModeSettings;
    private final Environment environment;
    private final JdbcClient jdbcClient;
    private final PasswordEncoder passwordEncoder;
    private final boolean seedEnabled;
    private final long centerId;
    private final String loginId;
    private final String displayName;
    private final String initialPassword;

    public DevAdminUserSeeder(
            SecurityModeSettings securityModeSettings,
            Environment environment,
            JdbcClient jdbcClient,
            PasswordEncoder passwordEncoder,
            @Value("${app.security.dev-admin.seed-enabled:true}") boolean seedEnabled,
            @Value("${app.security.dev-admin.center-id:1}") long centerId,
            @Value("${app.security.dev-admin.login-id:center-admin}") String loginId,
            @Value("${app.security.dev-admin.display-name:Center Admin}") String displayName,
            @Value("${app.security.dev-admin.initial-password:dev-admin-1234!}") String initialPassword
    ) {
        this.securityModeSettings = securityModeSettings;
        this.environment = environment;
        this.jdbcClient = jdbcClient;
        this.passwordEncoder = passwordEncoder;
        this.seedEnabled = seedEnabled;
        this.centerId = centerId;
        this.loginId = loginId;
        this.displayName = displayName;
        this.initialPassword = initialPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!securityModeSettings.isJwtMode()) {
            return;
        }
        if (!seedEnabled || !isAllowedProfileActive()) {
            return;
        }
        if (existsActiveUser()) {
            return;
        }
        if (initialPassword == null || initialPassword.isBlank()) {
            throw new IllegalStateException("app.security.dev-admin.initial-password must not be blank when seed is enabled");
        }

        jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, display_name, role_code, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :displayName, 'ROLE_CENTER_ADMIN', 'ACTIVE',
                    0, 0
                )
                """)
                .param("centerId", centerId)
                .param("loginId", loginId.trim())
                .param("passwordHash", passwordEncoder.encode(initialPassword))
                .param("displayName", displayName.trim())
                .update();

        log.warn("Seeded dev/staging admin user loginId='{}' for centerId={} (JWT mode). Change password after first use.", loginId, centerId);
    }

    private boolean existsActiveUser() {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(*)
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("loginId", loginId.trim())
                .query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    private boolean isAllowedProfileActive() {
        boolean prodActive = Arrays.stream(environment.getActiveProfiles())
                .anyMatch("prod"::equalsIgnoreCase);
        if (prodActive) {
            return false;
        }
        return Arrays.stream(environment.getActiveProfiles())
                .map(String::toLowerCase)
                .anyMatch(ALLOWED_PROFILES::contains);
    }
}
