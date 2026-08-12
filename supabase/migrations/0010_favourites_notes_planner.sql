-- clothing_items.favorite already existed since 0001_init.sql - only
-- outfits needs it added. Reusing that same boolean pattern here.
alter table outfits add column if not exists favorite boolean default false;

-- Saved outfit notes: 100 chars, enforced at the database level too (not
-- just client/API), trimmed before the length check so whitespace padding
-- can't be used to sneak past the limit.
alter table outfits add column if not exists note text;
alter table outfits drop constraint if exists outfits_note_length;
alter table outfits add constraint outfits_note_length check (note is null or char_length(trim(note)) <= 100);

-- Shared by both the monthly Calendar and the Weekly Planner (per the
-- brief's explicit instruction to use one underlying architecture) -
-- references an existing saved outfit, never duplicates outfit_items.
-- Multiple outfits per date are allowed (no unique constraint on date
-- alone), since the same day can have a gym outfit and a dinner outfit.
create table if not exists outfit_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  outfit_id uuid references outfits(id) on delete cascade not null,
  planned_date date not null,
  note text,
  created_at timestamptz default now()
);

alter table outfit_plans drop constraint if exists outfit_plans_note_length;
alter table outfit_plans add constraint outfit_plans_note_length check (note is null or char_length(trim(note)) <= 150);

create index if not exists outfit_plans_user_date_idx on outfit_plans (user_id, planned_date);

alter table outfit_plans enable row level security;

create policy "Users manage their own outfit plans"
  on outfit_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
