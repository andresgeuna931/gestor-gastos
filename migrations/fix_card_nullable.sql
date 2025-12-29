-- Fix expenses table to allow null card (for non-card payment methods)
ALTER TABLE expenses ALTER COLUMN card DROP NOT NULL;

-- Set default value for existing nulls
UPDATE expenses SET card = '' WHERE card IS NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'card';
