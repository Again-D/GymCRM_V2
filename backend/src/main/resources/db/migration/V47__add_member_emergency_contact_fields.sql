ALTER TABLE members
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50);

COMMENT ON COLUMN members.emergency_contact_name IS 'Emergency contact name captured during member registration';
COMMENT ON COLUMN members.emergency_contact_phone IS 'Emergency contact phone captured during member registration';
COMMENT ON COLUMN members.emergency_contact_relationship IS 'Relationship to the emergency contact';
