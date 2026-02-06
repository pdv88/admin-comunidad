-- Migration: Add visibility column to reports table
-- Date: 2026-02-05
-- Description: Adds 'visibility' column to control whether reports are public or private

ALTER TABLE reports 
ADD COLUMN visibility TEXT DEFAULT 'public' 
CHECK (visibility IN ('public', 'private'));

-- Add comment for documentation
COMMENT ON COLUMN reports.visibility IS 'Controls who can see the report: public (block residents) or private (admins only)';
