ALTER TABLE trainer_schedules
    ADD COLUMN IF NOT EXISTS trainer_user_id BIGINT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'trainer_schedules_trainer_user_id_fkey'
    ) THEN
        ALTER TABLE trainer_schedules
            ADD CONSTRAINT trainer_schedules_trainer_user_id_fkey
            FOREIGN KEY (trainer_user_id) REFERENCES users (user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trainer_schedules_center_trainer_start_pt
    ON trainer_schedules (center_id, trainer_user_id, start_at)
    WHERE is_deleted = FALSE
      AND schedule_type = 'PT'
      AND trainer_user_id IS NOT NULL;
