-- Add representative_id to BLOCKS
alter table public.blocks add column representative_id uuid references auth.users(id);

-- Update Reports RLS to allow Representatives to view reports from their blocks
drop policy "Admins can view all reports" on public.reports;

create policy "Admins and Reps can view reports" on public.reports for select using (
  -- User is admin or president
  exists (select 1 from public.profiles where id = auth.uid() and role_id in (select id from public.roles where name in ('president', 'admin', 'maintenance', 'vice_president')))
  OR
  -- User is the representative of the block where the report creator lives
  auth.uid() in (
    select b.representative_id 
    from public.blocks b
    join public.units u on u.block_id = b.id
    join public.profiles p on p.unit_id = u.id
    where p.id = public.reports.user_id
  )
);
