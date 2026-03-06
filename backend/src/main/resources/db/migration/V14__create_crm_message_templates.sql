CREATE TABLE IF NOT EXISTS crm_message_templates (
    template_id BIGSERIAL PRIMARY KEY,
    center_id BIGINT NOT NULL REFERENCES centers (center_id),
    template_code VARCHAR(40) NOT NULL,
    template_name VARCHAR(120) NOT NULL,
    channel_type VARCHAR(20) NOT NULL DEFAULT 'SMS',
    template_type VARCHAR(20) NOT NULL DEFAULT 'MARKETING',
    template_body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NOT NULL,
    CONSTRAINT chk_crm_message_templates_channel
        CHECK (channel_type IN ('SMS', 'KAKAO', 'EMAIL')),
    CONSTRAINT chk_crm_message_templates_type
        CHECK (template_type IN ('MARKETING', 'TRANSACTIONAL')),
    CONSTRAINT chk_crm_message_templates_name
        CHECK (char_length(template_name) >= 1),
    CONSTRAINT chk_crm_message_templates_body
        CHECK (char_length(template_body) >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_crm_message_templates_code
    ON crm_message_templates (center_id, template_code)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_message_templates_center_active
    ON crm_message_templates (center_id, is_active, template_id)
    WHERE is_deleted = FALSE;
