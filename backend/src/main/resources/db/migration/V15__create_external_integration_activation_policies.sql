CREATE TABLE IF NOT EXISTS external_integration_activation_policies (
    external_integration_activation_policy_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers(center_id),
    activation_stage VARCHAR(20) NOT NULL
        CHECK (activation_stage IN ('SANDBOX', 'STAGING', 'PRODUCTION')),
    payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    messaging_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    qr_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_drill_outcome VARCHAR(60),
    last_drill_at TIMESTAMPTZ,
    last_drill_summary VARCHAR(500),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_external_integration_activation_policies_center
    ON external_integration_activation_policies(center_id)
    WHERE is_deleted = FALSE;
