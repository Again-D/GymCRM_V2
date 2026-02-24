CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    login_id VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    user_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_users_role_code
        CHECK (role_code IN ('ROLE_CENTER_ADMIN', 'ROLE_DESK')),
    CONSTRAINT chk_users_status
        CHECK (user_status IN ('ACTIVE', 'INACTIVE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_users_center_login_active
    ON users (center_id, login_id)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_users_center_role_status
    ON users (center_id, role_code, user_status);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    refresh_token_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id),
    token_hash VARCHAR(255) NOT NULL,
    jti VARCHAR(100) NOT NULL,
    token_family_id VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    revoke_reason VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_auth_refresh_tokens_hash
    ON auth_refresh_tokens (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uk_auth_refresh_tokens_jti
    ON auth_refresh_tokens (jti);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_active
    ON auth_refresh_tokens (user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_family
    ON auth_refresh_tokens (token_family_id);
