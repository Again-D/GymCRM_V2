ALTER TABLE members DROP CONSTRAINT IF EXISTS chk_members_status;

ALTER TABLE members
    ADD CONSTRAINT chk_members_status
        CHECK (member_status IN ('ACTIVE', 'INACTIVE', 'WITHDRAWN'));
