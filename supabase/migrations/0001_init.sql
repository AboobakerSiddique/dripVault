-- dripVault initial schema (brief section 43)
-- Run this in Supabase SQL editor, or via `supabase db push` if using the CLI.
create extension if not exists vector;

create table if not exists clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('top','bottom','shoes','accessory','bag','outerwear')),
  sub_category text,
  primary_color text not null,
  secondary_colors text[] default '{}',
  pattern text,
  fit text,
  silhouette text,
  material text,
  style text[] default '{}',
  formality int check (formality between 1 and 10) default 5,
  season text[] default '{}',
  image_url text,
  embedding vector(768),
  favorite boolean default false,
  wear_count int default 0,
  last_worn timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  occasion text,
  aesthetic text,
  score int,
  explanation text,
  created_at timestamptz default now()
);

create table if not exists outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid references outfits(id) on delete cascade not null,
  clothing_item_id uuid references clothing_items(id) on delete cascade not null,
  role text check (role in ('top','bottom','shoes','outerwear','accessory'))
);

create table if not exists outfit_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  outfit_id uuid references outfits(id) on delete cascade not null,
  rating text check (rating in ('love','like','dislike','never')),
  feedback text,
  created_at timestamptz default now()
);

create table if not exists wear_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  outfit_id uuid references outfits(id) on delete cascade not null,
  worn_at timestamptz default now()
);

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_styles text[] default '{}',
  preferred_colors text[] default '{}',
  preferred_fits text[] default '{}',
  disliked_styles text[] default '{}',
  disliked_colors text[] default '{}',
  temperature_preferences jsonb default '{}'
);

-- Enable pgvector for future embedding-based similarity search (section 39)


-- Row Level Security: every table is scoped to its own user
alter table clothing_items enable row level security;
alter table outfits enable row level security;
alter table outfit_items enable row level security;
alter table outfit_feedback enable row level security;
alter table wear_history enable row level security;
alter table user_preferences enable row level security;

create policy "Users manage their own clothing" on clothing_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own outfits" on outfits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own outfit items" on outfit_items
  for all using (
    exists (select 1 from outfits o where o.id = outfit_id and o.user_id = auth.uid())
  );

create policy "Users manage their own feedback" on outfit_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own wear history" on wear_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own preferences" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
