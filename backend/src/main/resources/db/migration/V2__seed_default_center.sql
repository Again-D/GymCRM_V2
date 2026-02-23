DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM centers
        WHERE center_id = 1
    ) THEN
        INSERT INTO centers (
            center_id,
            center_name,
            phone,
            operating_hours_start,
            operating_hours_end,
            is_active,
            is_deleted,
            created_by,
            updated_by
        ) VALUES (
            1,
            'Prototype Center',
            '010-0000-0000',
            '06:00',
            '23:00',
            TRUE,
            FALSE,
            1,
            1
        );
    END IF;
END $$;

SELECT setval('centers_center_id_seq', COALESCE((SELECT MAX(center_id) FROM centers), 1), true);
