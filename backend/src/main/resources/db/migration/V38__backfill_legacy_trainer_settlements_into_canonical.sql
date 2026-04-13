DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM trainer_settlements legacy
        WHERE legacy.is_deleted = FALSE
          AND legacy.trainer_user_id IS NULL
    ) THEN
        RAISE EXCEPTION 'V38 backfill blocked: trainer_settlements contains NULL trainer_user_id rows';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM trainer_settlements legacy
        JOIN settlements canonical
          ON canonical.center_id = legacy.center_id
         AND canonical.settlement_year = EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER
         AND canonical.settlement_month = EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER
         AND canonical.is_deleted = FALSE
        WHERE legacy.is_deleted = FALSE
        GROUP BY legacy.center_id, legacy.settlement_month
        HAVING COUNT(DISTINCT canonical.settlement_id) > 1
    ) THEN
        RAISE EXCEPTION 'V38 backfill blocked: duplicate canonical settlement batches exist for a legacy month';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM trainer_settlements legacy
        JOIN settlements canonical
          ON canonical.center_id = legacy.center_id
         AND canonical.settlement_year = EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER
         AND canonical.settlement_month = EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER
         AND canonical.is_deleted = FALSE
        WHERE legacy.is_deleted = FALSE
          AND canonical.status <> 'CONFIRMED'
    ) THEN
        RAISE EXCEPTION 'V38 backfill blocked: canonical settlement status must be CONFIRMED when matching legacy monthly data exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM trainer_settlements legacy
        JOIN settlements canonical
          ON canonical.center_id = legacy.center_id
         AND canonical.settlement_year = EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER
         AND canonical.settlement_month = EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER
         AND canonical.is_deleted = FALSE
        JOIN settlement_details detail
          ON detail.settlement_id = canonical.settlement_id
         AND detail.user_id = legacy.trainer_user_id
         AND detail.lesson_type = 'PT'
        WHERE legacy.is_deleted = FALSE
          AND (
            detail.lesson_count <> legacy.completed_class_count
            OR detail.unit_price <> legacy.session_unit_price
            OR detail.amount <> legacy.payroll_amount
            OR detail.bonus_amount <> 0
            OR detail.deduction_amount <> 0
            OR detail.net_amount <> legacy.payroll_amount
          )
    ) THEN
        RAISE EXCEPTION 'V38 backfill blocked: existing canonical PT detail conflicts with legacy monthly snapshot';
    END IF;
END
$$;

WITH legacy_monthly_totals AS (
    SELECT
        legacy.center_id,
        legacy.settlement_month,
        EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER AS settlement_year,
        EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER AS settlement_month_number,
        SUM(legacy.completed_class_count)::INTEGER AS total_lesson_count,
        SUM(legacy.payroll_amount)::NUMERIC(14, 2) AS total_amount,
        MAX(legacy.confirmed_at) AS confirmed_at,
        (ARRAY_AGG(legacy.confirmed_by ORDER BY legacy.confirmed_at DESC, legacy.settlement_id DESC))[1] AS confirmed_by,
        (ARRAY_AGG(legacy.created_by ORDER BY legacy.created_at DESC, legacy.settlement_id DESC))[1] AS actor_user_id
    FROM trainer_settlements legacy
    WHERE legacy.is_deleted = FALSE
    GROUP BY legacy.center_id, legacy.settlement_month
)
INSERT INTO settlements (
    center_id,
    settlement_year,
    settlement_month,
    total_lesson_count,
    total_amount,
    status,
    settlement_date,
    confirmed_by,
    confirmed_at,
    is_deleted,
    created_at,
    created_by,
    updated_at,
    updated_by
)
SELECT
    totals.center_id,
    totals.settlement_year,
    totals.settlement_month_number,
    totals.total_lesson_count,
    totals.total_amount,
    'CONFIRMED',
    totals.settlement_month,
    totals.confirmed_by,
    totals.confirmed_at,
    FALSE,
    COALESCE(totals.confirmed_at, CURRENT_TIMESTAMP),
    totals.actor_user_id,
    COALESCE(totals.confirmed_at, CURRENT_TIMESTAMP),
    totals.actor_user_id
FROM legacy_monthly_totals totals
LEFT JOIN settlements canonical
  ON canonical.center_id = totals.center_id
 AND canonical.settlement_year = totals.settlement_year
 AND canonical.settlement_month = totals.settlement_month_number
 AND canonical.is_deleted = FALSE
WHERE canonical.settlement_id IS NULL;

INSERT INTO settlement_details (
    settlement_id,
    user_id,
    lesson_type,
    lesson_count,
    unit_price,
    amount,
    bonus_amount,
    deduction_amount,
    net_amount,
    memo,
    created_at,
    created_by,
    updated_at,
    updated_by
)
SELECT
    canonical.settlement_id,
    legacy.trainer_user_id,
    'PT',
    legacy.completed_class_count::INTEGER,
    legacy.session_unit_price,
    legacy.payroll_amount,
    0,
    0,
    legacy.payroll_amount,
    'Backfilled from trainer_settlements',
    COALESCE(legacy.created_at, CURRENT_TIMESTAMP),
    legacy.created_by,
    COALESCE(legacy.updated_at, CURRENT_TIMESTAMP),
    legacy.updated_by
FROM trainer_settlements legacy
JOIN settlements canonical
  ON canonical.center_id = legacy.center_id
 AND canonical.settlement_year = EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER
 AND canonical.settlement_month = EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER
 AND canonical.is_deleted = FALSE
LEFT JOIN settlement_details detail
  ON detail.settlement_id = canonical.settlement_id
 AND detail.user_id = legacy.trainer_user_id
 AND detail.lesson_type = 'PT'
WHERE legacy.is_deleted = FALSE
  AND detail.settlement_detail_id IS NULL;

WITH touched_settlements AS (
    SELECT DISTINCT canonical.settlement_id
    FROM trainer_settlements legacy
    JOIN settlements canonical
      ON canonical.center_id = legacy.center_id
     AND canonical.settlement_year = EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER
     AND canonical.settlement_month = EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER
     AND canonical.is_deleted = FALSE
    WHERE legacy.is_deleted = FALSE
),
legacy_confirm_metadata AS (
    SELECT
        canonical.settlement_id,
        MAX(legacy.confirmed_at) AS confirmed_at,
        (ARRAY_AGG(legacy.confirmed_by ORDER BY legacy.confirmed_at DESC, legacy.settlement_id DESC))[1] AS confirmed_by
    FROM trainer_settlements legacy
    JOIN settlements canonical
      ON canonical.center_id = legacy.center_id
     AND canonical.settlement_year = EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER
     AND canonical.settlement_month = EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER
     AND canonical.is_deleted = FALSE
    WHERE legacy.is_deleted = FALSE
    GROUP BY canonical.settlement_id
),
canonical_totals AS (
    SELECT
        detail.settlement_id,
        COALESCE(SUM(detail.lesson_count), 0)::INTEGER AS total_lesson_count,
        COALESCE(SUM(detail.net_amount), 0)::NUMERIC(14, 2) AS total_amount
    FROM settlement_details detail
    GROUP BY detail.settlement_id
)
UPDATE settlements settlement
SET total_lesson_count = totals.total_lesson_count,
    total_amount = totals.total_amount,
    status = 'CONFIRMED',
    confirmed_at = COALESCE(settlement.confirmed_at, metadata.confirmed_at),
    confirmed_by = COALESCE(settlement.confirmed_by, metadata.confirmed_by),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = COALESCE(settlement.updated_by, metadata.confirmed_by)
FROM canonical_totals totals
JOIN touched_settlements touched
  ON touched.settlement_id = totals.settlement_id
LEFT JOIN legacy_confirm_metadata metadata
  ON metadata.settlement_id = totals.settlement_id
WHERE settlement.settlement_id = totals.settlement_id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM trainer_settlements legacy
        LEFT JOIN settlements canonical
          ON canonical.center_id = legacy.center_id
         AND canonical.settlement_year = EXTRACT(YEAR FROM legacy.settlement_month)::INTEGER
         AND canonical.settlement_month = EXTRACT(MONTH FROM legacy.settlement_month)::INTEGER
         AND canonical.is_deleted = FALSE
        LEFT JOIN settlement_details detail
          ON detail.settlement_id = canonical.settlement_id
         AND detail.user_id = legacy.trainer_user_id
         AND detail.lesson_type = 'PT'
        WHERE legacy.is_deleted = FALSE
          AND (canonical.settlement_id IS NULL OR detail.settlement_detail_id IS NULL)
    ) THEN
        RAISE EXCEPTION 'V38 backfill failed: unresolved legacy trainer_settlements rows remain after canonical projection';
    END IF;
END
$$;
