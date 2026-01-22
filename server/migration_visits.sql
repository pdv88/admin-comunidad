-- Create visits table
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    visitor_name TEXT NOT NULL,
    visit_date DATE NOT NULL,
    visit_time TEXT,
    type TEXT NOT NULL CHECK (type IN ('guest', 'family', 'provider', 'service', 'delivery')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'denied')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    access_code TEXT
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_visits_community_id ON public.visits(community_id);
CREATE INDEX IF NOT EXISTS idx_visits_unit_id ON public.visits(unit_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_by ON public.visits(created_by);
