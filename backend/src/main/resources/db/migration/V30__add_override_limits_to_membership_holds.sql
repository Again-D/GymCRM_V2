-- V30: Add override_limits to membership_holds for better audit trail
ALTER TABLE membership_holds ADD COLUMN override_limits BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN membership_holds.override_limits IS 'Whether hold limits were bypassed by an operator';
