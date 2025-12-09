-- Update handle_new_user to assign 'president' role if is_admin_registration is true
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  target_role_id uuid;
  role_name text;
begin
  -- Check if metadata indicates this is an admin registration
  if (new.raw_user_meta_data->>'is_admin_registration')::boolean = true then
      role_name := 'president';
  else
      role_name := 'neighbor';
  end if;

  select id into target_role_id from public.roles where name = role_name;
  
  insert into public.profiles (id, full_name, role_id)
  values (new.id, new.raw_user_meta_data->>'full_name', target_role_id);
  
  return new;
end;
$$ language plpgsql security definer;
