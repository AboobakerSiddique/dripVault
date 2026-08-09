-- Architecture scaffold for the future "see how I look wearing this"
-- try-on feature (brief 2.1). No UI or generation logic uses this yet -
-- this migration only prepares the schema so that feature can be added
-- cleanly later without another migration + RLS design pass.
--
-- Additive only: does not touch clothing_items, outfits, outfit_items,
-- profiles, or the existing clothing-images bucket/policies.

create table if not exists profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  image_url text not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

alter table profile_photos enable row level security;

create policy "Users manage their own profile photos"
  on profile_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Private bucket, unlike clothing-images - try-on photos are sensitive
-- personal images, so reads need an RLS policy too, not just writes.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

create policy "Users manage their own profile photo files"
  on storage.objects for all to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
