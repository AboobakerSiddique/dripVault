-- 1. Profile photos: exactly 0 or 1 per user (was unbounded).
-- Dedup first in case testing already created multiple rows, keeping only
-- the most recently active/created one, before the constraint can be added.
delete from profile_photos a using profile_photos b
  where a.user_id = b.user_id
    and (a.is_active, a.created_at, a.id) < (b.is_active, b.created_at, b.id);

alter table profile_photos add constraint profile_photos_user_id_unique unique (user_id);

-- 2. Duplicate-upload detection: a SHA-256 hash of the image bytes,
-- computed client-side (Web Crypto), checked against the user's own
-- wardrobe before upload. Indexed per-user since RLS already scopes
-- every query to auth.uid() = user_id.
alter table clothing_items add column if not exists image_hash text;
create index if not exists clothing_items_user_hash_idx on clothing_items (user_id, image_hash);
