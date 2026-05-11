ALTER TABLE crm_message_events
    ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(20);

UPDATE crm_message_events
SET delivery_mode = COALESCE(delivery_mode, 'PRIMARY')
WHERE delivery_mode IS NULL;

ALTER TABLE crm_message_events
    ALTER COLUMN delivery_mode SET DEFAULT 'PRIMARY';

ALTER TABLE crm_message_events
    ALTER COLUMN delivery_mode SET NOT NULL;

ALTER TABLE crm_message_events
    ADD CONSTRAINT chk_crm_message_events_delivery_mode
        CHECK (delivery_mode IN ('PRIMARY', 'SMS_FALLBACK'));
