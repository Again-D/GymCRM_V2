CREATE TABLE IF NOT EXISTS gx_schedule_rules (
    rule_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    trainer_user_id BIGINT NOT NULL REFERENCES users (user_id),
    class_name VARCHAR(120) NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL,
    effective_start_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_gx_schedule_rules_day_of_week
        CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT chk_gx_schedule_rules_time_order
        CHECK (end_time > start_time),
    CONSTRAINT chk_gx_schedule_rules_capacity
        CHECK (capacity > 0)
);

CREATE INDEX IF NOT EXISTS idx_gx_schedule_rules_center_active
    ON gx_schedule_rules (center_id, is_active, day_of_week);

CREATE TABLE IF NOT EXISTS gx_schedule_exceptions (
    exception_id BIGSERIAL PRIMARY KEY,
    rule_id BIGINT NOT NULL REFERENCES gx_schedule_rules (rule_id),
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    exception_date DATE NOT NULL,
    exception_type VARCHAR(20) NOT NULL,
    override_trainer_user_id BIGINT NULL REFERENCES users (user_id),
    override_start_time TIME NULL,
    override_end_time TIME NULL,
    override_capacity INTEGER NULL,
    memo TEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_gx_schedule_exceptions_type
        CHECK (exception_type IN ('OFF', 'OVERRIDE')),
    CONSTRAINT chk_gx_schedule_exceptions_override_time_order
        CHECK (
            (override_start_time IS NULL AND override_end_time IS NULL)
            OR (override_start_time IS NOT NULL AND override_end_time IS NOT NULL AND override_end_time > override_start_time)
        ),
    CONSTRAINT chk_gx_schedule_exceptions_override_capacity
        CHECK (override_capacity IS NULL OR override_capacity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_gx_schedule_exceptions_rule_date_active
    ON gx_schedule_exceptions (rule_id, exception_date)
    WHERE is_deleted = FALSE;

ALTER TABLE trainer_schedules
    ADD COLUMN IF NOT EXISTS source_rule_id BIGINT NULL REFERENCES gx_schedule_rules (rule_id);

ALTER TABLE trainer_schedules
    ADD COLUMN IF NOT EXISTS source_exception_id BIGINT NULL REFERENCES gx_schedule_exceptions (exception_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trainer_schedules_gx_rule_start_active
    ON trainer_schedules (center_id, source_rule_id, start_at)
    WHERE is_deleted = FALSE AND source_rule_id IS NOT NULL;
