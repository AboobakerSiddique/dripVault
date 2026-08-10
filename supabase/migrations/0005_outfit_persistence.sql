-- Phase 6: outfit persistence support. Additive only - extends the
-- existing outfits/outfit_items tables from 0001_init.sql rather than
-- creating parallel ones.

-- 'weather' was captured by the generator but never had a column to land in.
alter table outfits add column if not exists weather text;

-- outfit_items.role only allowed 5 values; the engine now has an
-- independent 'bag' slot (see lib/compatibility-engine.ts), so persisting
-- a saved outfit with a bag needs 'bag' to be a valid role too.
alter table outfit_items drop constraint if exists outfit_items_role_check;
alter table outfit_items add constraint outfit_items_role_check
  check (role in ('top','bottom','shoes','outerwear','accessory','bag'));

-- Used by "mark as worn" to jump straight to a user's saved outfits
-- ordered by recency without a full table scan.
create index if not exists outfits_user_created_idx on outfits (user_id, created_at desc);
