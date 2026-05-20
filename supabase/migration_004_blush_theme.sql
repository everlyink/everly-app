-- ============================================================
-- migration 004 · replace warm_black theme with blush
--
-- the four themes are now: forest, terracotta, sand, blush.
-- blush uses #FCDFC8 bg, #1C1C1A text, with terracotta as the accent.
--
-- this migration:
--   1. converts any existing 'warm_black' rows to 'blush' so the new constraint accepts them
--   2. drops the old check constraint and adds the new one
--
-- safe to re-run.
-- ============================================================

-- 1. migrate existing rows. drop the check first so the update can't fail on
--    transitional state.
alter table public.messages drop constraint if exists messages_theme_check;

update public.messages
set theme = 'blush'
where theme = 'warm_black';

-- 2. re-add the constraint with the new set of valid themes.
alter table public.messages
  add constraint messages_theme_check
  check (theme in ('forest', 'terracotta', 'sand', 'blush'));

-- ---------- verification ----------
-- run to confirm no rows were left behind on the old value:
--   select theme, count(*) from public.messages group by theme;
