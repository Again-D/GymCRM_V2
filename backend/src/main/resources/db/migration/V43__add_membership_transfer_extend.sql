ALTER TABLE member_memberships
    DROP CONSTRAINT IF EXISTS chk_member_memberships_status;

ALTER TABLE member_memberships
    ADD CONSTRAINT chk_member_memberships_status
        CHECK (membership_status IN ('ACTIVE', 'HOLDING', 'REFUNDED', 'EXPIRED', 'TRANSFERRED', 'EXTENDED'));

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS chk_payments_type;

ALTER TABLE payments
    ADD CONSTRAINT chk_payments_type
        CHECK (payment_type IN ('PURCHASE', 'REFUND', 'TRANSFER_FEE', 'EXTENSION'));

CREATE TABLE IF NOT EXISTS membership_transfers (
    membership_transfer_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    transferor_membership_id BIGINT NOT NULL REFERENCES member_memberships (membership_id),
    transferee_membership_id BIGINT NOT NULL REFERENCES member_memberships (membership_id),
    transferor_member_id BIGINT NOT NULL REFERENCES members (member_id),
    transferee_member_id BIGINT NOT NULL REFERENCES members (member_id),
    transfer_fee_payment_id BIGINT NULL REFERENCES payments (payment_id),
    reason TEXT,
    memo TEXT,
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_membership_transfers_center
    ON membership_transfers (center_id, transferred_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_transfers_transferor_membership
    ON membership_transfers (transferor_membership_id);

CREATE INDEX IF NOT EXISTS idx_membership_transfers_transferee_membership
    ON membership_transfers (transferee_membership_id);

CREATE INDEX IF NOT EXISTS idx_membership_transfers_transferee_member
    ON membership_transfers (transferee_member_id);

CREATE INDEX IF NOT EXISTS idx_membership_transfers_fee_payment
    ON membership_transfers (transfer_fee_payment_id);

CREATE TABLE IF NOT EXISTS membership_extensions (
    membership_extension_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    membership_id BIGINT NOT NULL REFERENCES member_memberships (membership_id),
    original_end_date DATE NOT NULL,
    new_end_date DATE NOT NULL,
    extension_days INTEGER NOT NULL,
    extension_payment_id BIGINT NOT NULL REFERENCES payments (payment_id),
    reason TEXT,
    memo TEXT,
    extended_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_membership_extensions_days
        CHECK (extension_days > 0),
    CONSTRAINT chk_membership_extensions_date_order
        CHECK (new_end_date >= original_end_date)
);

CREATE INDEX IF NOT EXISTS idx_membership_extensions_center
    ON membership_extensions (center_id, extended_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_extensions_membership
    ON membership_extensions (membership_id);

CREATE INDEX IF NOT EXISTS idx_membership_extensions_payment
    ON membership_extensions (extension_payment_id);
