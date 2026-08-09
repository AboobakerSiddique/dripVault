-- Username + password auth support (kept alongside magic-link, not instead of it).

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users read their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users update their own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-creates a profile row the moment a new auth.users row is created,
-- reading the username that was passed as signUp() metadata. Runs inside
-- the same transaction, so a duplicate username fails the whole signup -
-- which is exactly why the client pre-checks availability before calling
-- signUp (see check_username_available below), even though this trigger
-- is the actual source of truth for uniqueness.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Callable by anon (pre-signup, no session yet). Returns true/false only -
-- never exposes any row data, so it can't be used to enumerate accounts
-- beyond "does this exact username exist".
create or replace function check_username_available(p_username text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select not exists (select 1 from profiles where username = p_username);
$$;

grant execute on function check_username_available(text) to anon, authenticated;

-- Callable by anon (needed at login time, before a session exists) to
-- resolve "username" -> the email Supabase Auth actually needs for
-- signInWithPassword. Returns null if not found - same generic "invalid
-- credentials" message is shown either way on the client, so this can't
-- be used to distinguish "wrong username" from "wrong password".
create or replace function get_email_by_username(p_username text)
returns text
language sql
security definer set search_path = public
stable
as $$
  select email from profiles where username = p_username limit 1;
$$;

grant execute on function get_email_by_username(text) to anon, authenticated;
