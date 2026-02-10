-- Add block_id to notices table for target audience filtering
-- NULL block_id means "Global Community Notice"
-- Specific block_id means "Notice for that Block only"

ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.blocks(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notices_block_id ON public.notices(block_id);

-- Update RLS policies (Optional, mainly handled by Controller but good for security)
-- Allow Admins to view all
-- Allow Vocals to view Global + Their Blocks
-- Allow Residents to view Global + Their Block

-- For now, we are relying on Controller RBAC as per previous modules, 
-- but ensuring the column exists is key.
