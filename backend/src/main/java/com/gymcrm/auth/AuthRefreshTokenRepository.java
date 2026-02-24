package com.gymcrm.auth;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class AuthRefreshTokenRepository {
    private final JdbcClient jdbcClient;

    public AuthRefreshTokenRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public RefreshTokenRecord insert(InsertCommand command) {
        return jdbcClient.sql("""
                INSERT INTO auth_refresh_tokens (
                    user_id, token_hash, jti, token_family_id, expires_at
                )
                VALUES (
                    :userId, :tokenHash, :jti, :tokenFamilyId, :expiresAt
                )
                RETURNING
                    refresh_token_id, user_id, token_hash, jti, token_family_id, expires_at,
                    revoked_at, revoke_reason, created_at, rotated_at
                """)
                .paramSource(command)
                .query(RefreshTokenRecord.class)
                .single();
    }

    public Optional<RefreshTokenRecord> findByTokenHash(String tokenHash) {
        return jdbcClient.sql("""
                SELECT
                    refresh_token_id, user_id, token_hash, jti, token_family_id, expires_at,
                    revoked_at, revoke_reason, created_at, rotated_at
                FROM auth_refresh_tokens
                WHERE token_hash = :tokenHash
                """)
                .param("tokenHash", tokenHash)
                .query(RefreshTokenRecord.class)
                .optional();
    }

    public int revokeIfActive(Long refreshTokenId, String reason) {
        return jdbcClient.sql("""
                UPDATE auth_refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP,
                    revoke_reason = :reason,
                    rotated_at = CASE WHEN :reason = 'ROTATED' THEN CURRENT_TIMESTAMP ELSE rotated_at END
                WHERE refresh_token_id = :refreshTokenId
                  AND revoked_at IS NULL
                """)
                .param("refreshTokenId", refreshTokenId)
                .param("reason", reason)
                .update();
    }

    public int revokeByTokenHashIfActive(String tokenHash, String reason) {
        return jdbcClient.sql("""
                UPDATE auth_refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP,
                    revoke_reason = :reason
                WHERE token_hash = :tokenHash
                  AND revoked_at IS NULL
                """)
                .param("tokenHash", tokenHash)
                .param("reason", reason)
                .update();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeFamilyIfActive(String tokenFamilyId, String reason) {
        return jdbcClient.sql("""
                UPDATE auth_refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP,
                    revoke_reason = :reason
                WHERE token_family_id = :tokenFamilyId
                  AND revoked_at IS NULL
                """)
                .param("tokenFamilyId", tokenFamilyId)
                .param("reason", reason)
                .update();
    }

    public record InsertCommand(
            Long userId,
            String tokenHash,
            String jti,
            String tokenFamilyId,
            OffsetDateTime expiresAt
    ) {}
}
