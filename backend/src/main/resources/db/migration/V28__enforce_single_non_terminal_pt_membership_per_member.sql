CREATE UNIQUE INDEX IF NOT EXISTS uk_member_memberships_member_active_pt
    ON member_memberships (center_id, member_id)
    WHERE product_category_snapshot = 'PT'
      AND membership_status IN ('ACTIVE', 'HOLDING')
      AND is_deleted = FALSE;
