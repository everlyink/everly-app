-- ============================================================
-- migration 003 · re-sync drifted profile columns from the plan field
--
-- the messages_limit / recipients_limit / window_expires_at columns are
-- denormalised hints. they should always match what PLAN_LIMITS in
-- lib/plans.js says for the user's plan. they can drift if:
--   • the Stripe webhook missed
--   • someone edited a profile row manually in the Supabase Table Editor
--   • the schema's defaults were used during a manual plan change
--
-- this migration realigns every row. safe to re-run.
-- ============================================================

-- 1. messages_limit
update public.profiles
set messages_limit = case plan
  when 'free'     then 1
  when 'single'   then 3
  when 'bundle_s' then 15
  when 'bundle_m' then 100
  when 'legacy'   then 300
  else messages_limit
end
where plan in ('free', 'single', 'bundle_s', 'bundle_m', 'legacy');

-- 2. recipients_limit
update public.profiles
set recipients_limit = case plan
  when 'free'     then 1
  when 'single'   then 1
  when 'bundle_s' then 3
  when 'bundle_m' then 10
  when 'legacy'   then 30
  else recipients_limit
end
where plan in ('free', 'single', 'bundle_s', 'bundle_m', 'legacy');

-- 3. legacy plan never expires; clear the column so the UI shows "no expiry".
update public.profiles
set window_expires_at = null,
    is_window_expired = false
where plan = 'legacy';

-- 4. for paid (non-legacy) plans, the management window is 3 years from purchase.
--    (scheduling reach is a separate concept derived in lib/plans.js → maxScheduleDate;
--    paid users can schedule up to 10 years from purchase regardless.)
update public.profiles
set window_expires_at = coalesce(plan_purchased_at, created_at, now()) + interval '3 years'
where plan in ('single', 'bundle_s', 'bundle_m');

-- ---------- verification ----------
-- run this after to confirm every row matches its plan:
--   select plan, messages_limit, recipients_limit,
--          case plan when 'legacy' then 'no expiry' else window_expires_at::text end as window
--   from public.profiles order by plan;
