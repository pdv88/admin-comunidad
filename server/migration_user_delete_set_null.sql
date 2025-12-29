-- Migration: Update user_id FKs to ON DELETE SET NULL
-- Purpose: Allow deleting users without losing Reports, Payments, or Fees history.
-- The record will remain, but user_id will be NULL.

BEGIN;

-- 1. Reports: Change user_id constraint
-- Current: reports_user_id_fkey_profiles (ON DELETE CASCADE)
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_user_id_fkey_profiles;

ALTER TABLE public.reports
ADD CONSTRAINT reports_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;


-- 2. Payments: Change user_id constraint
-- Assuming name is payments_user_id_fkey (default) or similar
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;


-- 3. Community Members: Currently cascades (which is correct - member is gone), nothing to do.


-- 4. Unit Owners: Currently cascades (correct - ownership is gone), nothing to do.


COMMIT;
