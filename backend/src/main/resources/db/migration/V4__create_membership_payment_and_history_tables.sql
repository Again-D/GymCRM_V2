CREATE TABLE IF NOT EXISTS member_memberships (
    membership_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    member_id BIGINT NOT NULL REFERENCES members (member_id),
    product_id BIGINT NOT NULL REFERENCES products (product_id),
    membership_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    product_name_snapshot VARCHAR(120) NOT NULL,
    product_category_snapshot VARCHAR(20) NOT NULL,
    product_type_snapshot VARCHAR(20) NOT NULL,
    price_amount_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NULL,
    total_count INTEGER NULL,
    remaining_count INTEGER NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    hold_days_used INTEGER NOT NULL DEFAULT 0,
    hold_count_used INTEGER NOT NULL DEFAULT 0,
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_member_memberships_status
        CHECK (membership_status IN ('ACTIVE', 'HOLDING', 'REFUNDED', 'EXPIRED')),
    CONSTRAINT chk_member_memberships_product_category
        CHECK (product_category_snapshot IN ('MEMBERSHIP', 'PT', 'GX', 'ETC')),
    CONSTRAINT chk_member_memberships_product_type
        CHECK (product_type_snapshot IN ('DURATION', 'COUNT')),
    CONSTRAINT chk_member_memberships_price_amount
        CHECK (price_amount_snapshot >= 0),
    CONSTRAINT chk_member_memberships_total_count
        CHECK (total_count IS NULL OR total_count > 0),
    CONSTRAINT chk_member_memberships_remaining_count
        CHECK (remaining_count IS NULL OR remaining_count >= 0),
    CONSTRAINT chk_member_memberships_used_count
        CHECK (used_count >= 0),
    CONSTRAINT chk_member_memberships_count_consistency
        CHECK (
            (total_count IS NULL AND remaining_count IS NULL)
            OR
            (total_count IS NOT NULL AND remaining_count IS NOT NULL AND remaining_count <= total_count)
        ),
    CONSTRAINT chk_member_memberships_hold_days_used
        CHECK (hold_days_used >= 0),
    CONSTRAINT chk_member_memberships_hold_count_used
        CHECK (hold_count_used >= 0)
);

CREATE INDEX IF NOT EXISTS idx_member_memberships_center_member
    ON member_memberships (center_id, member_id);

CREATE INDEX IF NOT EXISTS idx_member_memberships_center_status
    ON member_memberships (center_id, membership_status);

CREATE INDEX IF NOT EXISTS idx_member_memberships_member_status
    ON member_memberships (member_id, membership_status);

CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    member_id BIGINT NOT NULL REFERENCES members (member_id),
    membership_id BIGINT NULL REFERENCES member_memberships (membership_id),
    payment_type VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
    amount NUMERIC(12, 2) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approval_ref VARCHAR(100),
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_payments_type
        CHECK (payment_type IN ('PURCHASE', 'REFUND')),
    CONSTRAINT chk_payments_status
        CHECK (payment_status IN ('COMPLETED', 'CANCELED', 'FAILED')),
    CONSTRAINT chk_payments_method
        CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'ETC')),
    CONSTRAINT chk_payments_amount
        CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_center_member
    ON payments (center_id, member_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_membership
    ON payments (membership_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_center_type
    ON payments (center_id, payment_type, paid_at DESC);

CREATE TABLE IF NOT EXISTS payment_details (
    payment_detail_id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payments (payment_id),
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    line_type VARCHAR(30) NOT NULL DEFAULT 'ITEM',
    item_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    line_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_payment_details_line_type
        CHECK (line_type IN ('ITEM', 'DISCOUNT', 'PENALTY', 'REFUND')),
    CONSTRAINT chk_payment_details_quantity
        CHECK (quantity > 0),
    CONSTRAINT chk_payment_details_unit_price
        CHECK (unit_price_amount >= 0),
    CONSTRAINT chk_payment_details_line_amount
        CHECK (line_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_details_payment
    ON payment_details (payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_details_center
    ON payment_details (center_id, payment_id);

CREATE TABLE IF NOT EXISTS membership_holds (
    membership_hold_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    membership_id BIGINT NOT NULL REFERENCES member_memberships (membership_id),
    hold_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    hold_start_date DATE NOT NULL,
    hold_end_date DATE NOT NULL,
    resumed_at TIMESTAMPTZ NULL,
    actual_hold_days INTEGER NULL,
    reason TEXT,
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_membership_holds_status
        CHECK (hold_status IN ('ACTIVE', 'RESUMED', 'CANCELED')),
    CONSTRAINT chk_membership_holds_date_order
        CHECK (hold_end_date >= hold_start_date),
    CONSTRAINT chk_membership_holds_actual_hold_days
        CHECK (actual_hold_days IS NULL OR actual_hold_days >= 0)
);

CREATE INDEX IF NOT EXISTS idx_membership_holds_membership
    ON membership_holds (membership_id, hold_status);

CREATE INDEX IF NOT EXISTS idx_membership_holds_center_status
    ON membership_holds (center_id, hold_status);

CREATE TABLE IF NOT EXISTS membership_refunds (
    membership_refund_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    membership_id BIGINT NOT NULL REFERENCES member_memberships (membership_id),
    refund_payment_id BIGINT NULL REFERENCES payments (payment_id),
    refund_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    refund_reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    original_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    used_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    penalty_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_membership_refunds_status
        CHECK (refund_status IN ('COMPLETED', 'CANCELED')),
    CONSTRAINT chk_membership_refunds_original_amount
        CHECK (original_amount >= 0),
    CONSTRAINT chk_membership_refunds_used_amount
        CHECK (used_amount >= 0),
    CONSTRAINT chk_membership_refunds_penalty_amount
        CHECK (penalty_amount >= 0),
    CONSTRAINT chk_membership_refunds_refund_amount
        CHECK (refund_amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_membership_refunds_membership_active
    ON membership_refunds (membership_id)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_membership_refunds_center_processed
    ON membership_refunds (center_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_refunds_refund_payment
    ON membership_refunds (refund_payment_id);
