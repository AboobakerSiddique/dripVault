-- Storage bucket for clothing photos (brief section 8)
insert into storage.buckets (id, name, public)
values ('clothing-images', 'clothing-images', true)
on conflict (id) do nothing;

-- Users upload into a folder named after their own user id: {user_id}/filename.jpg
create policy "Users upload their own clothing images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clothing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update their own clothing images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'clothing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own clothing images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'clothing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket is public=true above, so reads (viewing photos in the app) don't need a policy.
