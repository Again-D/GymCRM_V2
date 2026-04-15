package com.gymcrm.common.auth.bootstrap;

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
    private final String userName;
    private final String initialPassword;
    private final String initialRoleCode;

    public DevAdminUserSeeder(
            SecurityModeSettings securityModeSettings,
            Environment environment,
            JdbcClient jdbcClient,
            PasswordEncoder passwordEncoder,
            @Value("${app.security.dev-admin.seed-enabled:true}") boolean seedEnabled,
            @Value("${app.security.dev-admin.center-id:1}") long centerId,
            @Value("${app.security.dev-admin.login-id:center-admin}") String loginId,
            @Value("${app.security.dev-admin.display-name:Center Admin}") String userName,
            @Value("${app.security.dev-admin.initial-password:dev-admin-1234!}") String initialPassword,
            @Value("${app.security.dev-admin.initial-role-code:ROLE_ADMIN}") String initialRoleCode
    ) {
        this.securityModeSettings = securityModeSettings;
        this.environment = environment;
        this.jdbcClient = jdbcClient;
        this.passwordEncoder = passwordEncoder;
        this.seedEnabled = seedEnabled;
        this.centerId = centerId;
        this.loginId = loginId;
        this.userName = userName;
        this.initialPassword = initialPassword;
        this.initialRoleCode = initialRoleCode;
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
            normalizeExistingSeedUserRole();
            return;
        }
        if (initialPassword == null || initialPassword.isBlank()) {
            throw new IllegalStateException("app.security.dev-admin.initial-password must not be blank when seed is enabled");
        }

        Long userId = jdbcClient.sql("""
                INSERT INTO users (
                    center_id, login_id, password_hash, user_name, user_status,
                    created_by, updated_by
                )
                VALUES (
                    :centerId, :loginId, :passwordHash, :userName, 'ACTIVE',
                    0, 0
                )
                RETURNING user_id
                """)
                .param("centerId", centerId)
                .param("loginId", loginId.trim())
                .param("passwordHash", passwordEncoder.encode(initialPassword))
                .param("userName", userName.trim())
                .query(Long.class)
                .single();

        String normalizedRoleCode = initialRoleCode.trim().toUpperCase();
        jdbcClient.sql("""
                UPDATE users
                SET role_code = :roleCode
                WHERE user_id = :userId
                """)
                .param("userId", userId)
                .param("roleCode", normalizedRoleCode)
                .update();

        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 0
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", normalizedRoleCode)
                .update();

        log.warn("Seeded dev/staging admin user loginId='{}' roleCode='{}' for centerId={} (JWT mode). Change password after first use.", loginId, normalizedRoleCode, centerId);
    }

    private void normalizeExistingSeedUserRole() {
        Long userId = jdbcClient.sql("""
                SELECT user_id
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("loginId", loginId.trim())
                .query(Long.class)
                .single();

        String normalizedRoleCode = initialRoleCode.trim().toUpperCase();
        jdbcClient.sql("""
                DELETE FROM user_roles
                WHERE user_id = :userId
                """)
                .param("userId", userId)
                .update();

        jdbcClient.sql("""
                INSERT INTO user_roles (user_id, role_id, created_by)
                SELECT :userId, role_id, 0
                FROM roles
                WHERE role_code = :roleCode
                """)
                .param("userId", userId)
                .param("roleCode", normalizedRoleCode)
                .update();

        log.warn("Normalized existing dev/staging admin user loginId='{}' to roleCode='{}' for centerId={} (JWT mode).", loginId, normalizedRoleCode, centerId);
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
