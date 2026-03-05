CREATE INDEX IF NOT EXISTS idx_member_memberships_center_member_status_end_date
    ON member_memberships (center_id, member_id, membership_status, end_date, membership_id)
    WHERE is_deleted = FALSE;
