-- Add email column to dms_profiles so Microsoft SSO users can be looked up by email
ALTER TABLE public.dms_profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill from auth.users for existing rows
UPDATE public.dms_profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
