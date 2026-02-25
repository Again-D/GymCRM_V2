INSERT INTO trainer_schedules (
    center_id, schedule_type, trainer_name, slot_title, start_at, end_at, capacity, current_count,
    memo, created_by, updated_by
)
SELECT
    1, 'PT', 'Prototype Trainer', 'PT 체험 슬롯',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '1 day 50 minutes',
    1, 0,
    'Phase 7 dev seed PT slot', 0, 0
WHERE NOT EXISTS (
    SELECT 1
    FROM trainer_schedules
    WHERE center_id = 1
      AND schedule_type = 'PT'
      AND slot_title = 'PT 체험 슬롯'
      AND is_deleted = FALSE
);

INSERT INTO trainer_schedules (
    center_id, schedule_type, trainer_name, slot_title, start_at, end_at, capacity, current_count,
    memo, created_by, updated_by
)
SELECT
    1, 'GX', 'Prototype Coach', 'GX 그룹 클래스',
    CURRENT_TIMESTAMP + INTERVAL '1 day 2 hours',
    CURRENT_TIMESTAMP + INTERVAL '1 day 3 hours',
    10, 0,
    'Phase 7 dev seed GX slot', 0, 0
WHERE NOT EXISTS (
    SELECT 1
    FROM trainer_schedules
    WHERE center_id = 1
      AND schedule_type = 'GX'
      AND slot_title = 'GX 그룹 클래스'
      AND is_deleted = FALSE
);
