CREATE UNIQUE INDEX IF NOT EXISTS uk_membership_holds_membership_active
    ON membership_holds (membership_id)
    WHERE hold_status = 'ACTIVE' AND is_deleted = FALSE;
