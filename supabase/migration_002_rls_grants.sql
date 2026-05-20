-- ============================================================
-- migration 002 · fix RLS grants + harden signup trigger
--
-- if you saw "permission denied for table profiles", this is the fix.
-- RLS policies alone aren't enough — the authenticated/anon roles also need
-- explicit table-level GRANTs. Supabase's Table Editor adds these automatically,
-- but the SQL Editor does not, so we set them here explicitly.
--
-- safe to re-run.
-- ============================================================

-- ---------- 1. schema usage ----------
grant usage on schema public to anon, authenticated;

-- ---------- 2. table-level grants ----------
-- profiles: users read/write their own row via RLS
grant select, insert, update on public.profiles to authenticated;

-- messages: users CRUD their own rows
grant select, insert, update, delete on public.messages to authenticated;

-- delivery_log: server-only. service role bypasses RLS, so no client grants needed.
-- (intentionally no grants to anon/authenticated)

-- ---------- 3. row-level security ----------
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.delivery_log enable row level security;

-- ---------- 4. profiles policies ----------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- 5. messages policies ----------
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
  on public.messages
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
  on public.messages
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- delivery_log: no policies = no client access (intentional)

-- ---------- 6. hardened signup trigger ----------
-- security definer so the function runs as the function owner (postgres) and
-- can bypass RLS on the profiles insert. on conflict + exception block ensure
-- signups never fail because of this trigger — the app's AuthContext has a
-- client-side fallback that self-inserts a profile if this trigger misses.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    plan,
    messages_limit,
    recipients_limit,
    window_expires_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    'free',
    1,
    1,
    now() + interval '3 years'
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- the function must be owned by postgres for SECURITY DEFINER to bypass RLS reliably
alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 7. quick verification ----------
-- run these in the SQL editor to confirm everything is wired up:
--
-- check policies exist:
--   select schemaname, tablename, policyname from pg_policies
--   where schemaname = 'public' order by tablename, policyname;
--
-- check grants:
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'profiles';
--
-- check trigger:
--   select tgname, tgenabled from pg_trigger
--   where tgname = 'on_auth_user_created';
