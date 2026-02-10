-- 1. Create Communities Table
CREATE TABLE public.communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    code TEXT UNIQUE DEFAULT substring(md5(random()::text) from 0 for 8) -- Simple code generation
);

-- 2. Add community_id to Blocks
ALTER TABLE public.blocks 
ADD COLUMN community_id UUID REFERENCES public.communities(id);

-- 3. Add community_id to Profiles
ALTER TABLE public.profiles 
ADD COLUMN community_id UUID REFERENCES public.communities(id);

-- 4. Create a Default Community for existing data
INSERT INTO public.communities (name, address, code)
VALUES ('Default Community', 'Existing Address', 'DEFAULT-1')
RETURNING id;

-- 5. Migrate existing data to Default Community
DO $$
DECLARE
    default_comm_id UUID;
BEGIN
    SELECT id INTO default_comm_id FROM public.communities WHERE code = 'DEFAULT-1';

    -- Update Blocks
    UPDATE public.blocks SET community_id = default_comm_id WHERE community_id IS NULL;

    -- Update Profiles
    UPDATE public.profiles SET community_id = default_comm_id WHERE community_id IS NULL;
END $$;

-- 6. Enforce Not Null constraints (Optional, after confirming migration)
-- ALTER TABLE public.blocks ALTER COLUMN community_id SET NOT NULL;
-- ALTER TABLE public.profiles ALTER COLUMN community_id SET NOT NULL;
