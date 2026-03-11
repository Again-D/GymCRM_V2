ALTER TABLE member_memberships
    ADD COLUMN IF NOT EXISTS assigned_trainer_id BIGINT REFERENCES users (user_id);

CREATE INDEX IF NOT EXISTS idx_member_memberships_assigned_trainer_id
    ON member_memberships (assigned_trainer_id)
    WHERE assigned_trainer_id IS NOT NULL AND is_deleted = FALSE;
