-- ============================================================
-- everly · supabase schema
-- run in Supabase SQL editor on a fresh project
-- ============================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  first_name text,
  plan text default 'free' check (plan in ('free', 'single', 'bundle_s', 'bundle_m', 'legacy')),
  stripe_customer_id text,
  stripe_session_id text,
  plan_purchased_at timestamptz,
  window_expires_at timestamptz,
  is_window_expired boolean default false,
  messages_limit int default 1,
  recipients_limit int default 1,
  messages_used int default 0,
  onboarding_complete boolean default false,
  notify_window_expiry boolean default true,
  created_at timestamptz default now()
);

-- ---------- messages ----------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  recipient_name text not null,
  recipient_email text,
  recipient_phone text,
  delivery_channel text default 'email' check (delivery_channel in ('email', 'sms')),
  subject text,
  body text not null,
  deliver_at timestamptz not null,
  status text default 'draft' check (status in ('draft', 'scheduled', 'delivered', 'cancelled')),
  theme text default 'forest' check (theme in ('forest', 'terracotta', 'sand', 'blush')),
  delivery_token uuid default gen_random_uuid(),
  delivered_at timestamptz,
  written_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists messages_user_id_idx on public.messages(user_id);
create index if not exists messages_status_deliver_at_idx on public.messages(status, deliver_at);
create unique index if not exists messages_delivery_token_idx on public.messages(delivery_token);

-- ---------- delivery_log ----------
create table if not exists public.delivery_log (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  channel text,
  status text,
  provider_response jsonb,
  attempted_at timestamptz default now()
);

create index if not exists delivery_log_message_id_idx on public.delivery_log(message_id);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists messages_touch_updated_at on public.messages;
create trigger messages_touch_updated_at
  before update on public.messages
  for each row execute function public.touch_updated_at();

-- ---------- table-level grants ----------
-- supabase's SQL editor does not auto-grant table privileges to anon/authenticated.
-- without these, "permission denied for table X" errors fire even with RLS policies in place.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
-- delivery_log is server-only: the service role bypasses RLS, no client grants needed.

-- ---------- profile auto-create on signup ----------
-- security definer so the function bypasses RLS on the profiles insert.
-- on conflict + exception block ensure signups never fail because of this trigger —
-- the app's AuthContext has a client-side fallback that self-inserts if this misses.
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

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.delivery_log enable row level security;

-- profiles: a user can read, insert, and update their own row
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

-- messages: a user can CRUD their own messages
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

-- delivery_log: no policies = no client access (intentional).
-- the cron sender uses the service role key which bypasses RLS.

-- ---------- public delivery-token lookup (for recipient page) ----------
-- recipient pages must read a single delivered message by token without auth.
-- expose a security-definer function that returns only delivered messages.
create or replace function public.get_delivered_message(token uuid)
returns table (
  recipient_name text,
  body text,
  deliver_at timestamptz,
  delivered_at timestamptz,
  written_at timestamptz,
  sender_first_name text,
  theme text
)
language sql
security definer
set search_path = public
as $$
  select
    m.recipient_name,
    m.body,
    m.deliver_at,
    m.delivered_at,
    m.written_at,
    p.first_name as sender_first_name,
    coalesce(m.theme, 'forest') as theme
  from public.messages m
  join public.profiles p on p.id = m.user_id
  where m.delivery_token = token
    and m.status = 'delivered';
$$;

grant execute on function public.get_delivered_message(uuid) to anon, authenticated;
