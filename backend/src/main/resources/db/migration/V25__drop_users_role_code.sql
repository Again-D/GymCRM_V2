DROP INDEX IF EXISTS idx_users_center_role_status;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_role_code;

ALTER TABLE users
    DROP COLUMN IF EXISTS role_code;
