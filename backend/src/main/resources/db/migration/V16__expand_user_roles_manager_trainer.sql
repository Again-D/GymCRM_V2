ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_role_code;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role_code
        CHECK (role_code IN ('ROLE_CENTER_ADMIN', 'ROLE_MANAGER', 'ROLE_TRAINER', 'ROLE_DESK'));
