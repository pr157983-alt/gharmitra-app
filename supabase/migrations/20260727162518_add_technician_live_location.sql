/*
# Add Technician Live Location Tracking

1. New Tables
- `technician_locations`
  - `id` (uuid, primary key)
  - `technician_id` (uuid, references technicians table)
  - `booking_id` (uuid, references bookings table, nullable - to link location to a specific job)
  - `lat` (numeric, latitude)
  - `lng` (numeric, longitude)
  - `is_sharing` (boolean, whether technician is actively sharing location)
  - `updated_at` (timestamp, auto-updates on each location ping)

2. Purpose
- Allows technicians to broadcast their live GPS location while en route to / working on a booking.
- Customers can see the technician's real-time position on a map in the booking detail screen.

3. Security
- RLS enabled on `technician_locations`.
- anon + authenticated can read, insert, update, delete (no-auth app using anon key).
- All data is intentionally shared/public so customers can track their service provider.
*/

CREATE TABLE IF NOT EXISTS technician_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  is_sharing boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_technician_locations" ON technician_locations;
CREATE POLICY "anon_select_technician_locations" ON technician_locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_technician_locations" ON technician_locations;
CREATE POLICY "anon_insert_technician_locations" ON technician_locations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_technician_locations" ON technician_locations;
CREATE POLICY "anon_update_technician_locations" ON technician_locations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_technician_locations" ON technician_locations;
CREATE POLICY "anon_delete_technician_locations" ON technician_locations FOR DELETE
  TO anon, authenticated USING (true);

-- Index for fast lookups by technician and booking
CREATE INDEX IF NOT EXISTS idx_technician_locations_technician_id ON technician_locations(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_locations_booking_id ON technician_locations(booking_id);
