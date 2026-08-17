/*
# Add Customer Registration, Complaints, Technician Working Hours & Payouts

## Purpose
This migration adds:
1. Customer registration system (phone + name based, no Supabase auth)
2. Complaints/ticket system for customers to raise issues against bookings
3. Technician working hours & availability management
4. Technician payouts/commission tracking with admin-controlled commission rate

## New Tables
- `customers` — customer accounts (phone + name, no password)
  - id (uuid, PK)
  - name (text, not null)
  - phone (text, not null, unique)
  - address (text, nullable)
  - created_at (timestamptz)

- `complaints` — customer complaints/tickets against bookings
  - id (uuid, PK)
  - booking_id (uuid, FK to bookings, nullable)
  - customer_id (uuid, FK to customers)
  - customer_name (text)
  - phone (text)
  - service_name (text)
  - subject (text, not null)
  - description (text, not null)
  - status (text, default 'open' — open, in_progress, resolved, closed)
  - admin_response (text, nullable)
  - created_at (timestamptz)
  - resolved_at (timestamptz, nullable)

- `technician_working_hours` — per-technician daily availability
  - id (uuid, PK)
  - technician_id (uuid, FK to technicians, ON DELETE CASCADE)
  - day_of_week (int, 0=Sunday..6=Saturday)
  - start_time (text, e.g. "09:00")
  - end_time (text, e.g. "18:00")
  - is_available (boolean, default true)
  - UNIQUE(technician_id, day_of_week)

- `technician_payouts` — payout records per technician per booking
  - id (uuid, PK)
  - technician_id (uuid, FK to technicians)
  - booking_id (uuid, FK to bookings)
  - booking_amount (numeric)
  - commission_rate (numeric, percentage, e.g. 20 = 20%)
  - commission_amount (numeric, calculated: booking_amount * commission_rate / 100)
  - payout_amount (numeric, calculated: booking_amount - commission_amount)
  - status (text, default 'pending' — pending, paid)
  - paid_at (timestamptz, nullable)
  - created_at (timestamptz)

## Modified Tables
- `bookings` — add `customer_id` (uuid, nullable, FK to customers)
- `admin_settings` — add `commission_rate` (numeric, default 20)

## Security
- RLS enabled on all new tables
- All tables use anon + authenticated access (no-auth app pattern, same as existing tables)
- Complaints: anyone can create & view (customer identifies by customer_id stored in sessionStorage)
- Working hours: anyone can read/write (technician identifies by tech_id in sessionStorage)
- Payouts: anyone can read/write (admin manages, technician views)

## Notes
- Commission rate is stored in admin_settings and controlled by admin
- When a booking is completed, admin can generate a payout record
- Technician sees their earnings, pending payouts, and paid history
- Customer registration is simple: phone + name, no OTP/password
- Session is stored in sessionStorage (same pattern as technician & admin login)
*/

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE
  TO anon, authenticated USING (true);

-- Add customer_id to bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'customer_id') THEN
    ALTER TABLE bookings ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  service_name text,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_complaints" ON complaints;
CREATE POLICY "anon_select_complaints" ON complaints FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_complaints" ON complaints;
CREATE POLICY "anon_insert_complaints" ON complaints FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_complaints" ON complaints;
CREATE POLICY "anon_update_complaints" ON complaints FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_complaints" ON complaints;
CREATE POLICY "anon_delete_complaints" ON complaints FOR DELETE
  TO anon, authenticated USING (true);

-- Technician working hours table
CREATE TABLE IF NOT EXISTS technician_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '18:00',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(technician_id, day_of_week)
);

ALTER TABLE technician_working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_working_hours" ON technician_working_hours;
CREATE POLICY "anon_select_working_hours" ON technician_working_hours FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_working_hours" ON technician_working_hours;
CREATE POLICY "anon_insert_working_hours" ON technician_working_hours FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_working_hours" ON technician_working_hours;
CREATE POLICY "anon_update_working_hours" ON technician_working_hours FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_working_hours" ON technician_working_hours;
CREATE POLICY "anon_delete_working_hours" ON technician_working_hours FOR DELETE
  TO anon, authenticated USING (true);

-- Technician payouts table
CREATE TABLE IF NOT EXISTS technician_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 20,
  commission_amount numeric NOT NULL DEFAULT 0,
  payout_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE technician_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payouts" ON technician_payouts;
CREATE POLICY "anon_select_payouts" ON technician_payouts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payouts" ON technician_payouts;
CREATE POLICY "anon_insert_payouts" ON technician_payouts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_payouts" ON technician_payouts;
CREATE POLICY "anon_update_payouts" ON technician_payouts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_payouts" ON technician_payouts;
CREATE POLICY "anon_delete_payouts" ON technician_payouts FOR DELETE
  TO anon, authenticated USING (true);

-- Add commission_rate to admin_settings
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 20;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_customer_id ON complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_working_hours_tech_id ON technician_working_hours(technician_id);
CREATE INDEX IF NOT EXISTS idx_payouts_tech_id ON technician_payouts(technician_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON technician_payouts(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);