/*
# Add admin_settings table for admin portal PIN login

1. New Tables
  - `admin_settings` — stores admin portal credentials (PIN-based login)
    - id (uuid, primary key)
    - pin (text, not null) — admin access PIN
    - created_at (timestamptz)

2. Security
  - RLS enabled on admin_settings
  - anon + authenticated can read/insert/update (no auth app, shared admin access)

3. Notes
  - Seeds a default PIN of "1234" so admin can log in immediately
  - Admin can change PIN later from within the portal
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin text NOT NULL DEFAULT '1234',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_admin_settings" ON admin_settings;
CREATE POLICY "anon_select_admin_settings" ON admin_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_settings" ON admin_settings;
CREATE POLICY "anon_insert_admin_settings" ON admin_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_admin_settings" ON admin_settings;
CREATE POLICY "anon_update_admin_settings" ON admin_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed default row if not exists
INSERT INTO admin_settings (pin)
SELECT '1234'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);
