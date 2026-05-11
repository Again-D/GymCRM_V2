ALTER TABLE products
    ADD COLUMN IF NOT EXISTS promotion_discount_type VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS promotion_discount_value NUMERIC(12, 2) NULL,
    ADD COLUMN IF NOT EXISTS promotion_start_date DATE NULL,
    ADD COLUMN IF NOT EXISTS promotion_end_date DATE NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_products_promotion_discount_type'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT chk_products_promotion_discount_type
                CHECK (promotion_discount_type IS NULL OR promotion_discount_type IN ('PERCENT', 'AMOUNT'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_products_promotion_discount_value'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT chk_products_promotion_discount_value
                CHECK (promotion_discount_value IS NULL OR promotion_discount_value > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_products_promotion_date_order'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT chk_products_promotion_date_order
                CHECK (promotion_start_date IS NULL OR promotion_end_date IS NULL OR promotion_end_date >= promotion_start_date);
    END IF;
END $$;
