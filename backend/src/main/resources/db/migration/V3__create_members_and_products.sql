CREATE TABLE IF NOT EXISTS members (
    member_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    member_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    gender VARCHAR(20),
    birth_date DATE,
    member_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    consent_sms BOOLEAN NOT NULL DEFAULT FALSE,
    consent_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    memo TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_members_status
        CHECK (member_status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_members_gender
        CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_members_center_phone_active
    ON members (center_id, phone)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_members_center_status
    ON members (center_id, member_status);

CREATE INDEX IF NOT EXISTS idx_members_center_name
    ON members (center_id, member_name);

CREATE TABLE IF NOT EXISTS products (
    product_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    product_name VARCHAR(120) NOT NULL,
    product_category VARCHAR(20) NOT NULL DEFAULT 'MEMBERSHIP',
    product_type VARCHAR(20) NOT NULL,
    price_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    validity_days INTEGER NULL,
    total_count INTEGER NULL,
    allow_hold BOOLEAN NOT NULL DEFAULT FALSE,
    max_hold_days INTEGER NULL,
    max_hold_count INTEGER NULL,
    allow_transfer BOOLEAN NOT NULL DEFAULT FALSE,
    product_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_products_category
        CHECK (product_category IN ('MEMBERSHIP', 'PT', 'GX', 'ETC')),
    CONSTRAINT chk_products_type
        CHECK (product_type IN ('DURATION', 'COUNT')),
    CONSTRAINT chk_products_status
        CHECK (product_status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_products_price_amount
        CHECK (price_amount >= 0),
    CONSTRAINT chk_products_validity_days
        CHECK (validity_days IS NULL OR validity_days > 0),
    CONSTRAINT chk_products_total_count
        CHECK (total_count IS NULL OR total_count > 0),
    CONSTRAINT chk_products_max_hold_days
        CHECK (max_hold_days IS NULL OR max_hold_days >= 0),
    CONSTRAINT chk_products_max_hold_count
        CHECK (max_hold_count IS NULL OR max_hold_count >= 0),
    CONSTRAINT chk_products_duration_or_count
        CHECK (
            (product_type = 'DURATION' AND validity_days IS NOT NULL AND total_count IS NULL)
            OR
            (product_type = 'COUNT' AND total_count IS NOT NULL AND validity_days IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_products_center_status
    ON products (center_id, product_status);

CREATE INDEX IF NOT EXISTS idx_products_center_category
    ON products (center_id, product_category);

CREATE UNIQUE INDEX IF NOT EXISTS uk_products_center_name_active
    ON products (center_id, product_name)
    WHERE is_deleted = FALSE;
