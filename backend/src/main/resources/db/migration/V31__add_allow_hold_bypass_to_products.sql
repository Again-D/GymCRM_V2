-- V31: Add allow_hold_bypass to products for policy flexibility
ALTER TABLE products ADD COLUMN allow_hold_bypass BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN products.allow_hold_bypass IS 'Whether to allow bypassing hold limits for this product by default (policy hint)';
