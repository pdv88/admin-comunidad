-- Fix missing created_by column in campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Optional: Add RLS policy for creation if missing
-- (Assuming RLS is enabled, we ensure creator can see their campaign?)
-- create policy "Users can view own campaigns" on public.campaigns for select using (auth.uid() = created_by);
-- But usually campaigns are public/visible to community.

-- Ensure column is not null if required, but for existing rows it might be header.
-- For now, allow null or set default?
-- Better to leave nullable for now to avoid errors on existing rows.
