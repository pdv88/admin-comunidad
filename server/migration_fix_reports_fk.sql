-- Fix Reports Foreign Key to allow joining with Profiles
-- PostgREST requires a foreign key to public.profiles to enable selecting profiles data

BEGIN;

-- 1. Drop the existing foreign key to auth.users if it exists (name might vary, valid try)
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_user_id_fkey;

-- 2. Add foreign key to public.profiles
-- This enables: .select('*, profiles:user_id(*)')
ALTER TABLE public.reports
ADD CONSTRAINT reports_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 3. (Re)-Ensure unit_id and block_id columns exist (in case previous migration wasn't run)
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id),
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.blocks(id);

COMMIT;
