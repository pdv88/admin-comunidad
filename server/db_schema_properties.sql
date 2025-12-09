-- BLOCKS Table (Buildings, Streets, etc.)
create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- "Torre A", "Manzana 5"
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- UNITS Table (Apartments, Houses)
create table public.units (
  id uuid primary key default uuid_generate_v4(),
  block_id uuid references public.blocks(id) on delete cascade,
  unit_number text not null, -- "101", "PB-1"
  floor text,
  type text check (type in ('apartment', 'house', 'commercial', 'parking', 'storage')) default 'apartment',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add unit_id to PROFILES if not exists
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'unit_id') then
    alter table public.profiles add column unit_id uuid references public.units(id);
  end if; 
end $$;

-- RLS POLICIES
alter table public.blocks enable row level security;
create policy "Blocks are viewable by everyone" on public.blocks for select using (true);
create policy "Admins can manage blocks" on public.blocks for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role_id in (select id from public.roles where name in ('president', 'admin')))
);

alter table public.units enable row level security;
create policy "Units are viewable by everyone" on public.units for select using (true);
create policy "Admins can manage units" on public.units for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role_id in (select id from public.roles where name in ('president', 'admin')))
);
