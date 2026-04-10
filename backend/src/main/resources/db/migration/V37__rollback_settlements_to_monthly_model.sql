DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM settlements
        WHERE is_deleted = FALSE
          AND (
            period_start IS NULL
            OR period_end IS NULL
            OR period_start <> MAKE_DATE(settlement_year, settlement_month, 1)
            OR period_end <> (MAKE_DATE(settlement_year, settlement_month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
          )
    ) THEN
        RAISE EXCEPTION 'V37 rollback blocked: found non-month-full settlements rows';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM settlements
        WHERE is_deleted = FALSE
          AND scope_type <> 'ALL'
    ) THEN
        RAISE EXCEPTION 'V37 rollback blocked: found trainer-scoped settlements rows';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM settlements
        WHERE is_deleted = FALSE
        GROUP BY center_id, settlement_year, settlement_month
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'V37 rollback blocked: found duplicate center/year/month settlements rows';
    END IF;
END
$$;

DROP INDEX IF EXISTS uk_settlements_center_period_scope_exact;
DROP INDEX IF EXISTS idx_settlements_center_period_scope;

ALTER TABLE settlements
    DROP CONSTRAINT IF EXISTS ck_settlements_period_range,
    DROP CONSTRAINT IF EXISTS ck_settlements_scope_type,
    DROP CONSTRAINT IF EXISTS ck_settlements_scope_trainer,
    DROP CONSTRAINT IF EXISTS ck_settlements_date_matches_period_start;

ALTER TABLE settlements
    ADD CONSTRAINT uk_settlements_center_period
        UNIQUE (center_id, settlement_year, settlement_month),
    ADD CONSTRAINT ck_settlements_date_first_day
        CHECK (
            EXTRACT(YEAR FROM settlement_date) = settlement_year
            AND EXTRACT(MONTH FROM settlement_date) = settlement_month
            AND EXTRACT(DAY FROM settlement_date) = 1
        );

ALTER TABLE settlements
    DROP COLUMN IF EXISTS period_start,
    DROP COLUMN IF EXISTS period_end,
    DROP COLUMN IF EXISTS scope_type,
    DROP COLUMN IF EXISTS scope_trainer_user_id;
