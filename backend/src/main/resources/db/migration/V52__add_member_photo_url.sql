ALTER TABLE members
    ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

COMMENT ON COLUMN members.photo_url IS 'Relative URL for member profile photo';
