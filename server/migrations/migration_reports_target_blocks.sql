ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_blocks UUID[] DEFAULT NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'community'; -- 'community', 'specific' (mapped from frontend 'blocks' or 'all' logic, but let's stick to what we used in Notices if relevant, or adapt)

-- In Notices we used 'all' vs 'blocks'.
-- In Reports current frontend uses 'community' vs 'specific'.
-- Let's stick to adding the columns. The logic will be handled in app code.
-- target_type in Notices was 'all' or 'blocks'.
-- Here we can use the same or map 'community' -> 'all', 'specific' -> 'blocks'.
-- Let's just add target_type as text.
