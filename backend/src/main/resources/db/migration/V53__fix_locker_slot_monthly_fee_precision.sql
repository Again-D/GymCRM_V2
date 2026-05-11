-- V51 introduced monthly_fee as NUMERIC(12,0) which drops fractional cents.
-- This migration corrects the column precision to NUMERIC(12,2).
ALTER TABLE locker_slots
    ALTER COLUMN monthly_fee TYPE NUMERIC(12, 2) USING monthly_fee::NUMERIC(12, 2);
