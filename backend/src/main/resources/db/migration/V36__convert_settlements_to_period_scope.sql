ALTER TABLE settlements
    ADD COLUMN IF NOT EXISTS period_start DATE,
    ADD COLUMN IF NOT EXISTS period_end DATE,
    ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS scope_trainer_user_id BIGINT NULL REFERENCES users (user_id);

UPDATE settlements
SET period_start = MAKE_DATE(settlement_year, settlement_month, 1),
    period_end = (MAKE_DATE(settlement_year, settlement_month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
    scope_type = 'ALL',
    scope_trainer_user_id = NULL
WHERE period_start IS NULL
   OR period_end IS NULL
   OR scope_type IS NULL;

ALTER TABLE settlements
    ALTER COLUMN period_start SET NOT NULL,
    ALTER COLUMN period_end SET NOT NULL,
    ALTER COLUMN scope_type SET NOT NULL;

ALTER TABLE settlements
    DROP CONSTRAINT IF EXISTS uk_settlements_center_period,
    DROP CONSTRAINT IF EXISTS ck_settlements_date_first_day;

ALTER TABLE settlements
    ADD CONSTRAINT ck_settlements_period_range
        CHECK (period_start <= period_end),
    ADD CONSTRAINT ck_settlements_scope_type
        CHECK (scope_type IN ('ALL', 'TRAINER')),
    ADD CONSTRAINT ck_settlements_scope_trainer
        CHECK (
            (scope_type = 'ALL' AND scope_trainer_user_id IS NULL)
            OR (scope_type = 'TRAINER' AND scope_trainer_user_id IS NOT NULL)
        ),
    ADD CONSTRAINT ck_settlements_date_matches_period_start
        CHECK (settlement_date = period_start);

CREATE UNIQUE INDEX IF NOT EXISTS uk_settlements_center_period_scope_exact
    ON settlements (center_id, period_start, period_end, scope_type, COALESCE(scope_trainer_user_id, -1))
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_settlements_center_period_scope
    ON settlements (center_id, period_start, period_end, scope_type, scope_trainer_user_id)
    WHERE is_deleted = FALSE;
