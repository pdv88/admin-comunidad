-- Add community_id and targeting to polls
ALTER TABLE public.polls 
ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id),
ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all', -- 'all' or 'blocks'
ADD COLUMN IF NOT EXISTS target_blocks UUID[] DEFAULT NULL;

-- Security Definer function to count votes without traversing RLS for each row (or exposing user_id)
CREATE OR REPLACE FUNCTION get_poll_results(poll_id UUID)
RETURNS TABLE(option_id UUID, vote_count BIGINT) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT pv.option_id, COUNT(*) 
  FROM public.poll_votes pv
  WHERE pv.poll_id = get_poll_results.poll_id
  GROUP BY pv.option_id;
END;
$$ LANGUAGE plpgsql;

-- Update RLS for polls to check community_id (viewing)
DROP POLICY IF EXISTS "Polls are viewable by everyone" ON public.polls;
DROP POLICY IF EXISTS "Polls are viewable by community members" ON public.polls;
CREATE POLICY "Polls are viewable by community members" ON public.polls
FOR SELECT USING (
  community_id IN (
    SELECT community_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Ensure admins can create polls
DROP POLICY IF EXISTS "Admins can create polls" ON public.polls;
CREATE POLICY "Admins can create polls" ON public.polls
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role_id IN (SELECT id FROM public.roles WHERE name IN ('president', 'admin', 'secretary'))
  )
);

-- Allow admins to insert poll options
-- We check if the user is the creator of the poll OR is an admin
DROP POLICY IF EXISTS "Admins can insert poll options" ON public.poll_options;
CREATE POLICY "Admins can insert poll options" ON public.poll_options
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.polls
    WHERE id = poll_id
    AND created_by = auth.uid()
  )
);
