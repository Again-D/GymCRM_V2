ALTER TABLE trainer_schedules
    ADD COLUMN IF NOT EXISTS trainer_user_id BIGINT NULL REFERENCES users (user_id);

CREATE INDEX IF NOT EXISTS idx_trainer_schedules_center_trainer_start_pt
    ON trainer_schedules (center_id, trainer_user_id, start_at)
    WHERE is_deleted = FALSE
      AND schedule_type = 'PT'
      AND trainer_user_id IS NOT NULL;
