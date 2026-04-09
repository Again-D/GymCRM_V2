ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pt_session_unit_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS gx_session_unit_price NUMERIC(12, 2);

ALTER TABLE users
    ADD CONSTRAINT chk_users_pt_session_unit_price
        CHECK (pt_session_unit_price IS NULL OR pt_session_unit_price >= 0);

ALTER TABLE users
    ADD CONSTRAINT chk_users_gx_session_unit_price
        CHECK (gx_session_unit_price IS NULL OR gx_session_unit_price >= 0);

CREATE TABLE IF NOT EXISTS settlements (
    settlement_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    settlement_year INTEGER NOT NULL,
    settlement_month INTEGER NOT NULL,
    total_lesson_count INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    settlement_date DATE NOT NULL,
    confirmed_by BIGINT NULL REFERENCES users (user_id),
    confirmed_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL REFERENCES users (user_id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL REFERENCES users (user_id),
    CONSTRAINT uk_settlements_center_period
        UNIQUE (center_id, settlement_year, settlement_month),
    CONSTRAINT ck_settlements_status
        CHECK (status IN ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED')),
    CONSTRAINT ck_settlements_month
        CHECK (settlement_month BETWEEN 1 AND 12),
    CONSTRAINT ck_settlements_total_lesson_count
        CHECK (total_lesson_count >= 0),
    CONSTRAINT ck_settlements_total_amount
        CHECK (total_amount >= 0),
    CONSTRAINT ck_settlements_date_first_day
        CHECK (
            EXTRACT(YEAR FROM settlement_date) = settlement_year
            AND EXTRACT(MONTH FROM settlement_date) = settlement_month
            AND EXTRACT(DAY FROM settlement_date) = 1
        )
);

CREATE TABLE IF NOT EXISTS settlement_details (
    settlement_detail_id BIGSERIAL PRIMARY KEY,
    settlement_id BIGINT NOT NULL REFERENCES settlements (settlement_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (user_id),
    lesson_type VARCHAR(20) NOT NULL,
    lesson_count INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    deduction_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    memo VARCHAR(500) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL REFERENCES users (user_id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL REFERENCES users (user_id),
    CONSTRAINT uk_settlement_details_unique
        UNIQUE (settlement_id, user_id, lesson_type),
    CONSTRAINT ck_settlement_details_type
        CHECK (lesson_type IN ('PT', 'GX')),
    CONSTRAINT ck_settlement_details_lesson_count
        CHECK (lesson_count >= 0),
    CONSTRAINT ck_settlement_details_unit_price
        CHECK (unit_price >= 0),
    CONSTRAINT ck_settlement_details_amount
        CHECK (amount >= 0),
    CONSTRAINT ck_settlement_details_bonus
        CHECK (bonus_amount >= 0),
    CONSTRAINT ck_settlement_details_deduction
        CHECK (deduction_amount >= 0),
    CONSTRAINT ck_settlement_details_net
        CHECK (net_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_settlements_center_month
    ON settlements (center_id, settlement_year, settlement_month)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_settlement_details_settlement
    ON settlement_details (settlement_id);

CREATE INDEX IF NOT EXISTS idx_settlement_details_user
    ON settlement_details (user_id);
