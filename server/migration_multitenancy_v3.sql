BEGIN;

-- 1. Add community_id column to Notices, Reports, Campaigns, Payments
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id); -- Payments usually link to campaign, but general payments might not.

-- 2. Backfill Data (Best Effort Strategy)

-- Notices: Link to the creator's community.
UPDATE public.notices
SET community_id = (
    SELECT community_id
    FROM public.community_members
    WHERE profile_id = notices.created_by
    LIMIT 1
)
WHERE community_id IS NULL;

-- Reports: Link to the users's community
UPDATE public.reports
SET community_id = (
    SELECT community_id
    FROM public.community_members
    WHERE profile_id = reports.user_id
    LIMIT 1
)
WHERE community_id IS NULL;

-- Campaigns: Link to first community (Assumption: Single tenancy migration)
-- If target_blocks has values (it is uuid[]), try to use that
-- Note: array_length returns null if empty, so we check if it is not null
UPDATE public.campaigns
SET community_id = (
    SELECT community_id 
    FROM public.blocks 
    WHERE id = campaigns.target_blocks[1]
    LIMIT 1
)
WHERE community_id IS NULL 
  AND target_blocks IS NOT NULL 
  AND array_length(target_blocks, 1) > 0;

-- Fallback for Campaigns (Global or no blocks found)
UPDATE public.campaigns
SET community_id = (SELECT id FROM public.communities LIMIT 1)
WHERE community_id IS NULL;

-- Payments: Link to Campaign's community if exists
UPDATE public.payments
SET community_id = (
    SELECT community_id
    FROM public.campaigns
    WHERE id = payments.campaign_id
)
WHERE community_id IS NULL AND campaign_id IS NOT NULL;

-- Fallback for Payments (Non-campaign or failure): Link to Payer's community
UPDATE public.payments
SET community_id = (
    SELECT community_id
    FROM public.community_members
    WHERE profile_id = payments.user_id
    LIMIT 1
)
WHERE community_id IS NULL;

-- 3. Update RLS Policies

-- Notices Viewing
DROP POLICY IF EXISTS "Notices are viewable by everyone" ON public.notices;
DROP POLICY IF EXISTS "Notices are viewable by community members" ON public.notices;

CREATE POLICY "Notices are viewable by community members" ON public.notices
FOR SELECT USING (
  community_id IN (
    SELECT community_id FROM public.community_members WHERE profile_id = auth.uid()
  )
);

-- Notices Creation
DROP POLICY IF EXISTS "Admins can insert notices" ON public.notices;

CREATE POLICY "Admins can insert notices" ON public.notices
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    JOIN public.roles r ON cm.role_id = r.id
    WHERE cm.profile_id = auth.uid()
    AND cm.community_id = community_id -- Validate against the new notice's community_id
    AND r.name IN ('president', 'admin', 'secretary', 'vocal') -- Vocal added as they can post to blocks
  )
);

-- Reports Viewing (Admins/Staff)
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins and Reps can view reports" ON public.reports;

CREATE POLICY "Staff can view community reports" ON public.reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    JOIN public.roles r ON cm.role_id = r.id
    WHERE cm.profile_id = auth.uid()
    AND cm.community_id = reports.community_id
    AND r.name IN ('president', 'admin', 'secretary', 'treasurer', 'maintenance', 'vocal') 
    -- Note: Vocals usually restricted to their block, handled in App Logic or finer policy. 
    -- This policy allows "viewing reports in the community" broadly for staff, 
    -- limiting strictly by block in SQL is complex without joining units again.
    -- For now, we allow access at DB level and filter in Controller/Frontend.
  )
);

-- Reports Viewing (Own Reports) - usually satisfied by basic "Users can view own" policy if it exists.
-- Ensuring it exists:
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports" ON public.reports
FOR SELECT USING (
  auth.uid() = user_id
);


COMMIT;
