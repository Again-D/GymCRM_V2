CREATE SEQUENCE IF NOT EXISTS member_code_seq START WITH 1000 INCREMENT BY 1;

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS member_code VARCHAR(20);

ALTER TABLE members
    ALTER COLUMN member_code SET DEFAULT (
        'MBR-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYY') || '-' || LPAD(nextval('member_code_seq')::TEXT, 6, '0')
    );

UPDATE members
SET member_code = 'MBR-' || TO_CHAR(COALESCE(created_at, CURRENT_TIMESTAMP), 'YYYY') || '-' || LPAD(nextval('member_code_seq')::TEXT, 6, '0')
WHERE member_code IS NULL;

ALTER TABLE members
    ALTER COLUMN member_code SET NOT NULL;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_member_code;

ALTER TABLE members
    ADD CONSTRAINT chk_members_member_code
        CHECK (member_code ~ '^MBR-[0-9]{4}-[0-9]{6}$');

CREATE UNIQUE INDEX IF NOT EXISTS uk_members_center_member_code_active
    ON members (center_id, member_code)
    WHERE is_deleted = FALSE;
