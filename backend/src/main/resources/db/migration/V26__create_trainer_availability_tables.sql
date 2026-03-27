CREATE TABLE IF NOT EXISTS trainer_availability_rules (
    availability_rule_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    trainer_user_id BIGINT NOT NULL REFERENCES users (user_id),
    day_of_week SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_trainer_availability_rules_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT chk_trainer_availability_rules_time_order CHECK (end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trainer_availability_rules_active
    ON trainer_availability_rules (center_id, trainer_user_id, day_of_week)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_trainer_availability_rules_center_trainer
    ON trainer_availability_rules (center_id, trainer_user_id, day_of_week)
    WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS trainer_availability_exceptions (
    availability_exception_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    trainer_user_id BIGINT NOT NULL REFERENCES users (user_id),
    exception_date DATE NOT NULL,
    exception_type VARCHAR(20) NOT NULL,
    override_start_time TIME NULL,
    override_end_time TIME NULL,
    memo TEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_trainer_availability_exceptions_type CHECK (exception_type IN ('OFF', 'OVERRIDE')),
    CONSTRAINT chk_trainer_availability_exceptions_override CHECK (
        (exception_type = 'OFF' AND override_start_time IS NULL AND override_end_time IS NULL)
        OR
        (exception_type = 'OVERRIDE' AND override_start_time IS NOT NULL AND override_end_time IS NOT NULL AND override_end_time > override_start_time)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trainer_availability_exceptions_active
    ON trainer_availability_exceptions (center_id, trainer_user_id, exception_date)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_trainer_availability_exceptions_center_trainer_date
    ON trainer_availability_exceptions (center_id, trainer_user_id, exception_date)
    WHERE is_deleted = FALSE;
