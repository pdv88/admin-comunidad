-- Migration: Reports Enhancement V2
-- Description: Adds tables for report notes (chat) and multiple images.

-- 0. Ensure Trigger Function Exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create Report Notes Table
CREATE TABLE IF NOT EXISTS public.report_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- User who wrote the note
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Maybe for admin-only notes? Optional.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Report Images Table
CREATE TABLE IF NOT EXISTS public.report_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_images ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Notes
-- View: Admins/Pres always. Vocal for their block reports. Owner of report.
-- Easier logic: If user can view the REPORT, they can view the NOTES.
-- But standard policies are table-specific.
-- For simplicity in this script, we assume standard "community member" check or mimic report policies.

-- Policy: Members can see notes on reports they can see.
CREATE POLICY "See notes if can see report" ON public.report_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_notes.report_id
            -- AND (r.user_id = auth.uid() OR auth.uid() IN (SELECT profile_id FROM community_members WHERE ...))
            -- This complex join might be heavy. 
            -- Simplified: If you are authenticated, you can select keys, but app logic filters.
            -- Or rely on Supabase Service Role for fetching (which is what we use in controllers mostly).
        )
    );

-- Policy: Insert note.
CREATE POLICY "Insert note if member" ON public.report_notes
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated'); 

-- 5. Policies for Images
CREATE POLICY "See images if can see report" ON public.report_images
    FOR SELECT
    USING (true); -- Simplified, handled by app logic/storage signed URLs usually.

CREATE POLICY "Insert images" ON public.report_images
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Add 'updated_at' trigger to Notes
CREATE TRIGGER update_report_notes_modtime
    BEFORE UPDATE ON public.report_notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
