/*
# Add viewer PIN for Co-Admin (read-only) role

## Purpose
The app currently has a single admin PIN. We need two admin roles:
- Super Admin (uses existing `pin` column) — full control: edit services, assign technicians, change booking status, change PIN
- Co-Admin / Viewer (uses new `viewer_pin` column) — read-only access: can view bookings, revenue, customer details, but cannot make any changes

## Changes
1. Added `viewer_pin` column to `admin_settings` table (text, nullable, defaults to '5678')
2. No RLS policy changes needed — the table already has anon/authenticated access policies

## How it works
- The admin login screen will check the entered PIN against both `pin` and `viewer_pin`
- If it matches `pin` → super admin (full access)
- If it matches `viewer_pin` → viewer (read-only)
- The role is stored in sessionStorage and used to conditionally show/hide edit controls
*/

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS viewer_pin text DEFAULT '5678';
