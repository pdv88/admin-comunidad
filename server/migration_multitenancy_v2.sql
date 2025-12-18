-- 1. Create community_members table
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, community_id)
);

-- 2. Migrate existing data
INSERT INTO public.community_members (profile_id, community_id, role_id)
SELECT id, community_id, role_id
FROM public.profiles
WHERE community_id IS NOT NULL;

-- 3. Cleanup profiles table
-- We drop these columns to strictly enforce the new architecture.
-- Any code referencing profile.community_id will now fail (as intended, so we can fix it).
ALTER TABLE public.profiles DROP COLUMN community_id;
ALTER TABLE public.profiles DROP COLUMN role_id;
