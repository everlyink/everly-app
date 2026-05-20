-- ============================================================
-- migration 001 · add theme column + update delivered RPC
-- run this if you've already deployed the original schema
-- safe to re-run (uses idempotent operations)
-- ============================================================

alter table public.messages
  add column if not exists theme text default 'forest';

-- add the check constraint only if it doesn't exist already
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_theme_check'
  ) then
    alter table public.messages
      add constraint messages_theme_check
      check (theme in ('forest', 'terracotta', 'sand', 'warm_black'));
  end if;
end$$;

-- update RPC to return theme column
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
