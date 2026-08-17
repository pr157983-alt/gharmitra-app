-- Add password column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password text NOT NULL DEFAULT '';

-- Add password_reset_token for forgot password flow
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_reset_expires timestamptz;
