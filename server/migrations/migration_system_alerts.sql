-- Create system_alerts table
create table if not exists system_alerts (
    id uuid default uuid_generate_v4() primary key,
    community_id uuid references communities(id) on delete cascade,
    type text not null, -- 'email_failure', 'system_warning', etc.
    title text not null,
    message text,
    metadata jsonb default '{}'::jsonb, -- Store details like recipient email, error stack
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table system_alerts enable row level security;

-- Policies
-- Admins can view alerts for their community
create policy "Admins can view alerts"
    on system_alerts for select
    using (
        exists (
            select 1 from community_members cm
            join roles r on r.id = cm.role_id
            where cm.profile_id = auth.uid()
            and cm.community_id = system_alerts.community_id
            and r.name in ('super_admin', 'admin', 'president', 'secretary')
        )
    );

-- Admins can update (mark as read)
create policy "Admins can update alerts"
    on system_alerts for update
    using (
        exists (
            select 1 from community_members cm
            join roles r on r.id = cm.role_id
            where cm.profile_id = auth.uid()
            and cm.community_id = system_alerts.community_id
            and r.name in ('super_admin', 'admin', 'president', 'secretary')
        )
    );

-- System (service role) can insert
-- (No policy needed for service role as it bypasses RLS, but for clarity if using authenticated client)
-- create policy "System can insert alerts" ... 
