CREATE TABLE IF NOT EXISTS trainer_settlements (
    settlement_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    settlement_month DATE NOT NULL,
    trainer_user_id BIGINT NULL REFERENCES users (user_id),
    trainer_name VARCHAR(100) NOT NULL,
    completed_class_count BIGINT NOT NULL,
    session_unit_price NUMERIC(12, 2) NOT NULL,
    payroll_amount NUMERIC(14, 2) NOT NULL,
    settlement_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    confirmed_at TIMESTAMPTZ NOT NULL,
    confirmed_by BIGINT NOT NULL REFERENCES users (user_id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL REFERENCES users (user_id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL REFERENCES users (user_id),
    CONSTRAINT chk_trainer_settlements_month_first_day
        CHECK (EXTRACT(DAY FROM settlement_month) = 1),
    CONSTRAINT chk_trainer_settlements_completed_count
        CHECK (completed_class_count >= 0),
    CONSTRAINT chk_trainer_settlements_session_unit_price
        CHECK (session_unit_price >= 0),
    CONSTRAINT chk_trainer_settlements_payroll_amount
        CHECK (payroll_amount >= 0),
    CONSTRAINT chk_trainer_settlements_status
        CHECK (settlement_status IN ('CONFIRMED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trainer_settlements_center_month_trainer
    ON trainer_settlements (
        center_id,
        settlement_month,
        COALESCE(trainer_user_id, -1),
        trainer_name
    )
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_trainer_settlements_center_month
    ON trainer_settlements (center_id, settlement_month)
    WHERE is_deleted = FALSE;
