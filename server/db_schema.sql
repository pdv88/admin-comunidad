-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ROLES Table
create table public.roles (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  description text,
  permissions jsonb default '{}'::jsonb
);

-- Insert Default Roles
insert into public.roles (name, description, permissions) values
('president', 'Presidente de la comunidad. Acceso total.', '{"all": true}'),
('vice_president', 'Vicepresidente. Acceso delegado.', '{"finances": true, "minutes": true}'),
('secretary', 'Secretario. Gestión de actas y comunicados.', '{"minutes": true, "communication": true}'),
('admin', 'Administrador de fincas. Gestión operativa.', '{"finances": true, "maintenance": true, "communication": true}'),
('treasurer', 'Tesorero. Gestión financiera.', '{"finances": true}'),
('neighbor', 'Vecino. Acceso básico.', '{"voting": true, "view_docs": true}');

-- PROFILES Table (Linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  unit_number text,
  phone text,
  role_id uuid references public.roles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Function to handle new user signup (Trigger)
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  neighbor_role_id uuid;
begin
  select id into neighbor_role_id from public.roles where name = 'neighbor';
  
  insert into public.profiles (id, full_name, role_id)
  values (new.id, new.raw_user_meta_data->>'full_name', neighbor_role_id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
