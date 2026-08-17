/*
# Add Technician System

1. New Tables
  - `technicians` — stores technician profiles
    - id (uuid, primary key)
    - name (text, not null) — technician's full name
    - phone (text, not null) — mobile number for login
    - pin (text, not null, default '1234') — PIN for technician login
    - skills (text, not null) — comma-separated service categories they handle (e.g. "AC, Fan")
    - is_active (boolean, default true) — admin can deactivate a technician
    - created_at (timestamptz)

2. Modified Tables
  - `bookings` — add `technician_id` (uuid, nullable, references technicians)
    - When null, booking is unassigned (admin hasn't assigned yet)
    - When set, the assigned technician can see and update it
    - Add `assigned_at` (timestamptz, nullable) to track when assignment happened

3. Security
  - RLS enabled on `technicians`
  - anon + authenticated can read/insert/update technicians (no-auth app, shared admin access)
  - bookings already has full anon CRUD; technician_id column inherits those policies

4. Notes
  - Seeds one demo technician: name "Ramesh Kumar", phone "9876543210", pin "1234", skills "AC, Fan, Bijli"
  - Admin manually assigns technicians to bookings from the admin portal
  - Technicians log in with phone + PIN to see their assigned bookings
*/

CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  pin text NOT NULL DEFAULT '1234',
  skills text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_technicians" ON technicians;
CREATE POLICY "anon_select_technicians" ON technicians FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_technicians" ON technicians;
CREATE POLICY "anon_insert_technicians" ON technicians FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_technicians" ON technicians;
CREATE POLICY "anon_update_technicians" ON technicians FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_technicians" ON technicians;
CREATE POLICY "anon_delete_technicians" ON technicians FOR DELETE
  TO anon, authenticated USING (true);

-- Add technician_id and assigned_at to bookings (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'technician_id') THEN
    ALTER TABLE bookings ADD COLUMN technician_id uuid REFERENCES technicians(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'assigned_at') THEN
    ALTER TABLE bookings ADD COLUMN assigned_at timestamptz;
  END IF;
END $$;

-- Seed a demo technician
INSERT INTO technicians (name, phone, pin, skills)
SELECT 'Ramesh Kumar', '9876543210', '1234', 'AC, Fan, Bijli'
WHERE NOT EXISTS (SELECT 1 FROM technicians WHERE phone = '9876543210');
