package com.gymcrm.auth;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class AuthUserRepository {
    private final JdbcClient jdbcClient;

    public AuthUserRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<AuthUser> findActiveByCenterAndLoginId(Long centerId, String loginId) {
        return jdbcClient.sql("""
                SELECT
                    user_id, center_id, login_id, password_hash, display_name, role_code, user_status, last_login_at
                FROM users
                WHERE center_id = :centerId
                  AND login_id = :loginId
                  AND is_deleted = FALSE
                """)
                .param("centerId", centerId)
                .param("loginId", loginId)
                .query(AuthUser.class)
                .optional();
    }

    public Optional<AuthUser> findActiveById(Long userId) {
        return jdbcClient.sql("""
                SELECT
                    user_id, center_id, login_id, password_hash, display_name, role_code, user_status, last_login_at
                FROM users
                WHERE user_id = :userId
                  AND is_deleted = FALSE
                """)
                .param("userId", userId)
                .query(AuthUser.class)
                .optional();
    }

    public int updateLastLoginAt(Long userId) {
        return jdbcClient.sql("""
                UPDATE users
                SET last_login_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :userId
                WHERE user_id = :userId
                  AND is_deleted = FALSE
                """)
                .param("userId", userId)
                .update();
    }
}
