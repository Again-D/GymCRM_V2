ALTER TABLE members
    ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS birth_date_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS pii_key_version INTEGER;

CREATE INDEX IF NOT EXISTS idx_members_center_pii_key_version
    ON members (center_id, pii_key_version)
    WHERE is_deleted = FALSE;
