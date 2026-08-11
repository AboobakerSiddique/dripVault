-- Root cause of duplicate uploads slipping through: 0007 only created a
-- plain index on (user_id, image_hash), never a UNIQUE constraint - so
-- nothing in the database actually prevented two rows with the same hash,
-- and the only check was a client-side query racing against the insert
-- (classic check-then-act gap). This is the actual fix: a real constraint
-- the database enforces unconditionally, plus the app-level check moves
-- server-side in the API route as a fast-path (see analyze-clothing route).

-- Clean up any duplicate rows created while the bug was live, keeping the
-- earliest of each (user_id, image_hash) group, before the constraint can
-- be added. Only touches rows that actually have a hash.
delete from clothing_items a using clothing_items b
  where a.user_id = b.user_id
    and a.image_hash = b.image_hash
    and a.image_hash is not null
    and a.created_at > b.created_at;

-- Partial unique index (not a full UNIQUE constraint) so legacy rows with
-- image_hash IS NULL are unaffected - Postgres treats every NULL as
-- distinct under a plain UNIQUE constraint anyway, but being explicit
-- here documents the intent rather than relying on that default.
create unique index if not exists clothing_items_user_hash_unique
  on clothing_items (user_id, image_hash)
  where image_hash is not null;

drop index if exists clothing_items_user_hash_idx;
