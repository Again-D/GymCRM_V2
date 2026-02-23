CREATE TABLE IF NOT EXISTS centers (
    center_id BIGSERIAL PRIMARY KEY,
    center_name VARCHAR(100) NOT NULL,
    business_number VARCHAR(20),
    representative_name VARCHAR(50),
    phone VARCHAR(20),
    address VARCHAR(300),
    address_detail VARCHAR(200),
    zipcode VARCHAR(10),
    operating_hours_start TIME DEFAULT '06:00',
    operating_hours_end TIME DEFAULT '23:00',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_centers_business_number
    ON centers (business_number)
    WHERE business_number IS NOT NULL;

