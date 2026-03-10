ALTER TABLE users
    ADD COLUMN access_revoked_after TIMESTAMPTZ NULL;

CREATE INDEX idx_users_access_revoked_after
    ON users(access_revoked_after)
    WHERE is_deleted = FALSE;
