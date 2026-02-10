-- Migration V2: Update ALL user references to ON DELETE SET NULL
-- Purpose: comprehensive fix to allow user deletion while keeping history for blocks, notices, polls.

BEGIN;

-- 1. Blocks: Representative
ALTER TABLE public.blocks 
DROP CONSTRAINT IF EXISTS blocks_representative_id_fkey;

ALTER TABLE public.blocks
ADD CONSTRAINT blocks_representative_id_fkey
FOREIGN KEY (representative_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;


-- 2. Notices: Created By
-- Check constraints name, often auto-generated. We drop by columns if possible or standard name.
-- Assuming: notices_created_by_fkey
ALTER TABLE public.notices
DROP CONSTRAINT IF EXISTS notices_created_by_fkey;

ALTER TABLE public.notices
ADD CONSTRAINT notices_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;


-- 3. Polls: Created By
ALTER TABLE public.polls
DROP CONSTRAINT IF EXISTS polls_created_by_fkey;

ALTER TABLE public.polls
ADD CONSTRAINT polls_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;


-- 4. Poll Votes: User ID (If we want to keep the vote count!)
-- If we delete the user, we might want to keep the vote anonymous?
-- Or maybe CASCADE is better? "Delete user -> Delete their vote".
-- Let's stick to SET NULL to preserve the "Vote Count" integrity if that's desired.
-- Current: poll_votes_user_id_fkey (Unique constraint poll_id+user_id might conflict if multiple NULLs?)
-- UNIQUE(poll_id, user_id) -> If user_id is NULL, multiple NULLs are allowed in SQL standard usually.
ALTER TABLE public.poll_votes
DROP CONSTRAINT IF EXISTS poll_votes_user_id_fkey;

ALTER TABLE public.poll_votes
ADD CONSTRAINT poll_votes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;


COMMIT;
