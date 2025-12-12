-- Create unit_owners table
CREATE TABLE IF NOT EXISTS public.unit_owners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(profile_id, unit_id)
);

-- Enable RLS
ALTER TABLE public.unit_owners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Unit owners viewable by everyone" ON public.unit_owners FOR SELECT USING (true);
CREATE POLICY "Admins can manage unit owners" ON public.unit_owners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role_id IN (SELECT id FROM public.roles WHERE name IN ('president', 'admin')))
);

-- Migrate existing units from profiles table
INSERT INTO public.unit_owners (profile_id, unit_id, is_primary)
SELECT id, unit_id, true
FROM public.profiles
WHERE unit_id IS NOT NULL
ON CONFLICT (profile_id, unit_id) DO NOTHING;

-- Optional: Drop unit_id from profiles later? 
-- For backward compatibility during dev, we might keep it or drop it now.
-- Let's keep it for a moment but stop using it in new code, OR drop it to force clean update.
-- User asked for refactor. Dropping it ensures we don't have split source of truth.
-- BUT, dropping might break other queries immediately.
-- SAFE APPROACH: Keep it as "Primary Residence" or deprecated.
-- Let's leave it for now but prioritize unit_owners.
