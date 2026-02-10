-- Migration: Add ON DELETE CASCADE to reports.block_id
-- Purpose: Allow deleting a Block to automatically delete associated Reports, resolving FK constraint errors.

BEGIN;

-- 1. Drop existing FK constraint. 
-- The name might be auto-generated as 'reports_block_id_fkey' or specific.
-- We use the name from the error message: "reports_block_id_fkey"
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_block_id_fkey;

-- 2. Re-add constraint with ON DELETE CASCADE
ALTER TABLE public.reports
ADD CONSTRAINT reports_block_id_fkey
FOREIGN KEY (block_id)
REFERENCES public.blocks(id)
ON DELETE CASCADE;

COMMIT;
