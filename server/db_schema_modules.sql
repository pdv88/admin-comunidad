-- NOTICES Table
create table public.notices (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  priority text check (priority in ('low', 'normal', 'high', 'urgent')) default 'normal',
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- REPORTS Table (Incidencias)
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  title text not null,
  description text,
  category text check (category in ('maintenance', 'security', 'fines', 'other')) default 'maintenance',
  status text check (status in ('pending', 'in_progress', 'resolved', 'rejected')) default 'pending',
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- POLLS Table
create table public.polls (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  ends_at timestamp with time zone,
  is_active boolean default true
);

-- POLL OPTIONS Table
create table public.poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references public.polls(id) on delete cascade,
  option_text text not null
);

-- POLL VOTES Table
create table public.poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references public.polls(id) on delete cascade,
  option_id uuid references public.poll_options(id) on delete cascade,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(poll_id, user_id)
);

-- RLS POLICIES (Simplified)
alter table public.notices enable row level security;
create policy "Notices are viewable by everyone" on public.notices for select using (true);
create policy "Admins can insert notices" on public.notices for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role_id in (select id from public.roles where name in ('president', 'admin', 'secretary')))
);

alter table public.reports enable row level security;
create policy "Users can view own reports" on public.reports for select using (auth.uid() = user_id);
create policy "Admins can view all reports" on public.reports for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role_id in (select id from public.roles where name in ('president', 'admin', 'maintenance')))
);
create policy "Users can insert reports" on public.reports for insert with check (auth.uid() = user_id);

alter table public.polls enable row level security;
create policy "Polls are viewable by everyone" on public.polls for select using (true);

alter table public.poll_options enable row level security;
create policy "Poll options are viewable by everyone" on public.poll_options for select using (true);

alter table public.poll_votes enable row level security;
create policy "Users can vote once" on public.poll_votes for insert with check (auth.uid() = user_id);
create policy "Users can view own votes" on public.poll_votes for select using (auth.uid() = user_id);
