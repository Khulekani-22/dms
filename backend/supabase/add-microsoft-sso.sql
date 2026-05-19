-- Run this in the Supabase SQL Editor
-- Adds Microsoft Entra user ID column to dms_profiles for SSO linking

ALTER TABLE dms_profiles
  ADD COLUMN IF NOT EXISTS microsoft_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS dms_profiles_microsoft_id_idx
  ON dms_profiles (microsoft_id);
