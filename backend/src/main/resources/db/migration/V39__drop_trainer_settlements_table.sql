DO $$
BEGIN
    IF to_regclass('public.trainer_settlements') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM trainer_settlements legacy
        WHERE legacy.is_deleted = FALSE
          AND legacy.trainer_user_id IS NULL
    ) THEN
        RAISE EXCEPTION 'V39 drop blocked: trainer_settlements contains NULL trainer_user_id rows';
    END IF;

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
          AND (
            canonical.settlement_id IS NULL
            OR detail.settlement_detail_id IS NULL
            OR detail.lesson_count <> legacy.completed_class_count
            OR detail.unit_price <> legacy.session_unit_price
            OR detail.amount <> legacy.payroll_amount
            OR detail.net_amount <> legacy.payroll_amount
          )
    ) THEN
        RAISE EXCEPTION 'V39 drop blocked: unresolved legacy trainer_settlements rows remain';
    END IF;
END
$$;

DROP TABLE IF EXISTS trainer_settlements;
