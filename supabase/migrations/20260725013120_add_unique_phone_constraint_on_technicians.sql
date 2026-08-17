-- Ensure each technician phone number is unique (one account per phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'technicians_phone_unique'
  ) THEN
    ALTER TABLE technicians ADD CONSTRAINT technicians_phone_unique UNIQUE (phone);
  END IF;
END $$;
