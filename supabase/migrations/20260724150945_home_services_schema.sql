
/*
# Home Services App - Full Schema

1. New Tables
  - `service_categories` - AC, Fan, Plumber, Carpenter, etc.
  - `services` - Individual services within each category
  - `service_packages` - Pricing packages for each service (Basic, Standard, Premium)
  - `bookings` - Customer bookings

2. Columns
  - service_categories: id, name, icon_name, image_url, sort_order
  - services: id, category_id, name, description, image_url, starting_price, rating, reviews_count, is_popular
  - service_packages: id, service_id, name, price, duration, description, includes (jsonb)
  - bookings: id, service_id, package_id, customer_name, phone, address, scheduled_date, scheduled_time, status, total_amount, notes, created_at

3. Security
  - RLS enabled on all tables
  - anon + authenticated can read categories, services, packages
  - anon + authenticated can create and read bookings (no login required)
*/

CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_name text NOT NULL,
  image_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES service_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  starting_price numeric NOT NULL DEFAULT 0,
  rating numeric DEFAULT 4.5,
  reviews_count int DEFAULT 0,
  is_popular boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL,
  duration text,
  description text,
  includes jsonb DEFAULT '[]',
  is_recommended boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id),
  package_id uuid REFERENCES service_packages(id),
  service_name text NOT NULL,
  package_name text NOT NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Categories: public read
DROP POLICY IF EXISTS "anon_select_categories" ON service_categories;
CREATE POLICY "anon_select_categories" ON service_categories FOR SELECT TO anon, authenticated USING (true);

-- Services: public read
DROP POLICY IF EXISTS "anon_select_services" ON services;
CREATE POLICY "anon_select_services" ON services FOR SELECT TO anon, authenticated USING (true);

-- Packages: public read
DROP POLICY IF EXISTS "anon_select_packages" ON service_packages;
CREATE POLICY "anon_select_packages" ON service_packages FOR SELECT TO anon, authenticated USING (true);

-- Bookings: anyone can create + read (no auth)
DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
CREATE POLICY "anon_update_bookings" ON bookings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;
CREATE POLICY "anon_delete_bookings" ON bookings FOR DELETE TO anon, authenticated USING (true);
