-- Add targeting columns to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN target_type TEXT DEFAULT 'all', -- 'all' or 'blocks'
ADD COLUMN target_blocks UUID[] DEFAULT NULL;

-- Example: target_type = 'blocks', target_blocks = '{uuid1, uuid2}'
