-- Add visitor identity fields to access_logs for PIN users
ALTER TABLE access_logs
  ADD COLUMN IF NOT EXISTS visitor_name  TEXT,
  ADD COLUMN IF NOT EXISTS visitor_email TEXT;
