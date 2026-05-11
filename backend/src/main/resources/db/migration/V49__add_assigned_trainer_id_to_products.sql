ALTER TABLE products
    ADD COLUMN IF NOT EXISTS assigned_trainer_id BIGINT NULL REFERENCES users (user_id);

CREATE INDEX IF NOT EXISTS idx_products_center_assigned_trainer
    ON products (center_id, assigned_trainer_id)
    WHERE is_deleted = FALSE AND assigned_trainer_id IS NOT NULL;
