import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://seoedwxenattjfifivvl.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlb2Vkd3hlbmF0dGpmaWZpdnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDE5MzYsImV4cCI6MjEwMDQ3NzkzNn0.sdNIAHXAFgjRjVde8EpXqUsIz9PlafsJ8DH7jLRXIHU';

let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

export type ServiceCategory = {
  id: string;
  name: string;
  icon_name: string;
  image_url: string | null;
  sort_order: number;
};

export type Service = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  starting_price: number;
  rating: number;
  reviews_count: number;
  is_popular: boolean;
};

export type ServicePackage = {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration: string;
  description: string | null;
  includes: string[];
  is_recommended: boolean;
};

export type Booking = {
  id: string;
  service_id: string;
  package_id: string;
  service_name: string;
  package_name: string;
  customer_name: string;
  phone: string;
  address: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  technician_id: string | null;
  assigned_at: string | null;
  customer_id: string | null;
};

export type Technician = {
  id: string;
  name: string;
  phone: string;
  pin: string;
  skills: string;
  is_active: boolean;
  created_at: string;
};

export type TechnicianLocation = {
  id: string;
  technician_id: string;
  booking_id: string | null;
  lat: number;
  lng: number;
  is_sharing: boolean;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  created_at: string;
};

export type Complaint = {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  service_name: string | null;
  subject: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type WorkingHour = {
  id: string;
  technician_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
};

export type Payout = {
  id: string;
  technician_id: string;
  booking_id: string;
  booking_amount: number;
  commission_rate: number;
  commission_amount: number;
  payout_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type AdminSettings = {
  id: string;
  pin: string;
  viewer_pin: string;
  commission_rate: number;
};
