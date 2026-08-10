-- Gender onboarding field on the existing profiles table (not a new table -
-- reuses the same row created by handle_new_user()).
alter table profiles add column if not exists gender text check (gender in ('men', 'women'));

-- Re-defined (not a new trigger) to also capture gender from signUp()
-- metadata, same pattern as username already used.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, gender)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'gender'
  );
  return new;
end;
$$;
