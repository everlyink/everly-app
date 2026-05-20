-- ============================================================
-- migration 005 · paid management window is 3 years (was 10)
--
-- business rule split: the window_expires_at column now stores the
-- account-level "management window" (when add/edit/cancel is allowed),
-- which is 3 years from plan_purchased_at for paid plans (single,
-- bundle_s, bundle_m). after that, the account is read-only —
-- scheduled messages still deliver via the cron sender.
--
-- the "scheduling reach" (max date the user can schedule for) is a
-- separate concept now derived in lib/plans.js → maxScheduleDate.
-- it's 10 years from plan_purchased_at for paid, 3 years from signup
-- for free, and unlimited for legacy.
--
-- if you ran an earlier migration (or the old planUpdateForCheckout)
-- and have paid profiles with window_expires_at = purchase + 10 years,
-- this brings them back to + 3.
--
-- safe to re-run.
-- ============================================================

-- paid (non-legacy): 3 years from purchase
update public.profiles
set window_expires_at = coalesce(plan_purchased_at, created_at, now()) + interval '3 years'
where plan in ('single', 'bundle_s', 'bundle_m');

-- legacy: never expires
update public.profiles
set window_expires_at = null,
    is_window_expired = false
where plan = 'legacy';

-- free: 3 years from signup (unchanged, kept here for completeness)
update public.profiles
set window_expires_at = coalesce(window_expires_at, created_at + interval '3 years')
where plan = 'free';

-- ---------- verification ----------
-- after running, every paid user's window should equal plan_purchased_at + 3 years:
--
--   select plan,
--          plan_purchased_at::date as purchased,
--          window_expires_at::date as edit_window_closes,
--          (window_expires_at - plan_purchased_at) as gap
--   from public.profiles
--   where plan in ('single', 'bundle_s', 'bundle_m')
--   order by plan;
