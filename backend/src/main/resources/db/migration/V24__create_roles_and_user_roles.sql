CREATE TABLE IF NOT EXISTS roles (
    role_id BIGSERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL,
    description VARCHAR(200) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_roles_role_code UNIQUE (role_code)
);

INSERT INTO roles (role_code, description, created_by, updated_by)
VALUES
    ('ROLE_SUPER_ADMIN', '시스템 최고 관리자', 0, 0),
    ('ROLE_CENTER_ADMIN', '센터 관리자', 0, 0),
    ('ROLE_MANAGER', '운영 관리자', 0, 0),
    ('ROLE_TRAINER', '트레이너', 0, 0),
    ('ROLE_DESK', '데스크', 0, 0)
ON CONFLICT (role_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles (role_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_user_roles_user_id UNIQUE (user_id),
    CONSTRAINT uk_user_roles_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
    ON user_roles (role_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users u
        LEFT JOIN roles r ON r.role_code = u.role_code
        WHERE r.role_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Unmapped users.role_code found while backfilling user_roles';
    END IF;
END $$;

INSERT INTO user_roles (user_id, role_id, created_at, created_by)
SELECT
    u.user_id,
    r.role_id,
    COALESCE(u.created_at, CURRENT_TIMESTAMP),
    COALESCE(u.created_by, 0)
FROM users u
JOIN roles r ON r.role_code = u.role_code
LEFT JOIN user_roles ur ON ur.user_id = u.user_id
WHERE ur.user_role_id IS NULL;
