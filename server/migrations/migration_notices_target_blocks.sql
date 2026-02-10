-- Add target_blocks column to support multiple blocks targeting
ALTER TABLE notices ADD COLUMN target_blocks UUID[] DEFAULT NULL;

-- Keep target_type for consistency with campaigns (optional but good for future proofing)
ALTER TABLE notices ADD COLUMN target_type TEXT DEFAULT 'all';

-- Update RLS policies (if any) or controller logic will handle access control.
-- Existing policies might be based on block_id, need to check.
