-- firegym_member initial schema
-- Personal gym customer/session/revenue management.
-- Revenue is computed on session-consumed basis (稼働ベース).

-- ============================================================
-- profiles: app users (owner / staff). Linked to auth.users.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup. Role defaults to 'staff'; promote to 'owner' manually.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- customers
-- ============================================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  tags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  created_at timestamptz not null default now()
);

create index customers_status_idx on public.customers(status);

-- ============================================================
-- pair_groups: a pair of two customers sharing pair-plan tickets
-- ============================================================
create table public.pair_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_a_id uuid not null references public.customers(id) on delete restrict,
  customer_b_id uuid not null references public.customers(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (customer_a_id <> customer_b_id)
);

create index pair_groups_a_idx on public.pair_groups(customer_a_id);
create index pair_groups_b_idx on public.pair_groups(customer_b_id);

-- ============================================================
-- plans: plan master (~4 patterns)
-- ============================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  session_count int not null check (session_count > 0),
  total_price int not null check (total_price >= 0),
  is_pair boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ticket_bundles: a purchased instance of a plan, owned by either
-- a customer (individual) OR a pair_group (pair-dedicated plan).
-- ============================================================
create table public.ticket_bundles (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  pair_group_id uuid references public.pair_groups(id) on delete restrict,
  purchase_date date not null default current_date,
  initial_count int not null check (initial_count > 0),
  remaining_count int not null check (remaining_count >= 0),
  override_total_price int check (override_total_price >= 0),
  status text not null default 'active' check (status in ('active', 'exhausted', 'expired')),
  note text,
  created_at timestamptz not null default now(),
  -- Exactly one of customer_id / pair_group_id must be set.
  check (
    (customer_id is not null and pair_group_id is null) or
    (customer_id is null and pair_group_id is not null)
  )
);

create index ticket_bundles_customer_idx on public.ticket_bundles(customer_id) where customer_id is not null;
create index ticket_bundles_pair_idx on public.ticket_bundles(pair_group_id) where pair_group_id is not null;
create index ticket_bundles_status_idx on public.ticket_bundles(status);

-- ============================================================
-- sessions: a scheduled (or completed/canceled) training slot.
-- status drives revenue accounting:
--   scheduled  = future plan, no revenue yet
--   confirmed  = session was completed (or same-day cancel that consumes a ticket)
--   canceled   = canceled without consumption
-- ============================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'canceled')),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index sessions_start_idx on public.sessions(start_at);
create index sessions_status_idx on public.sessions(status);

-- ============================================================
-- session_participants: links 1-2 customers to a session.
-- Holds the ticket bundle consumed and revenue accrued.
-- For pair-plan sessions, two participants both reference the
-- same ticket_bundle but only one row carries consumed=true.
-- ============================================================
create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  ticket_bundle_id uuid not null references public.ticket_bundles(id) on delete restrict,
  consumed boolean not null default false,
  revenue_amount int not null default 0 check (revenue_amount >= 0),
  is_pair_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (session_id, customer_id)
);

create index session_participants_session_idx on public.session_participants(session_id);
create index session_participants_customer_idx on public.session_participants(customer_id);
create index session_participants_bundle_idx on public.session_participants(ticket_bundle_id);

-- ============================================================
-- Monthly revenue view (session-consumed basis)
-- ============================================================
create view public.monthly_revenue as
select
  date_trunc('month', s.start_at)::date as month,
  sum(sp.revenue_amount) as revenue,
  count(*) filter (where sp.consumed) as consumed_sessions
from public.sessions s
join public.session_participants sp on sp.session_id = s.id
where s.status = 'confirmed' and sp.consumed = true
group by 1
order by 1 desc;

-- ============================================================
-- Customer remaining-ticket summary view
-- ============================================================
create view public.customer_ticket_summary as
select
  c.id as customer_id,
  c.name,
  c.status,
  coalesce(sum(tb.remaining_count) filter (where tb.customer_id = c.id and tb.status = 'active'), 0)
    + coalesce((
        select sum(tb2.remaining_count)
        from public.ticket_bundles tb2
        join public.pair_groups pg on pg.id = tb2.pair_group_id
        where tb2.status = 'active'
          and (pg.customer_a_id = c.id or pg.customer_b_id = c.id)
      ), 0) as remaining_tickets,
  (
    select max(s.start_at)
    from public.sessions s
    join public.session_participants sp on sp.session_id = s.id
    where sp.customer_id = c.id and s.status = 'confirmed' and sp.consumed = true
  ) as last_session_at
from public.customers c
left join public.ticket_bundles tb on tb.customer_id = c.id
group by c.id, c.name, c.status;

-- ============================================================
-- Row Level Security
-- All authenticated app users (owner or staff) can read & write
-- almost everything. Revenue dashboard is filtered to owner-only
-- at the application layer.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.pair_groups enable row level security;
alter table public.plans enable row level security;
alter table public.ticket_bundles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;

-- Helper: is the current user a known profile?
create or replace function public.is_app_user()
returns boolean
language sql stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_owner()
returns boolean
language sql stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

-- profiles: everyone can read; only owner can update roles.
create policy "profiles_select" on public.profiles
  for select using (public.is_app_user());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_owner_all" on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- Generic read/write for all app users on operational tables.
create policy "customers_rw" on public.customers
  for all using (public.is_app_user()) with check (public.is_app_user());

create policy "pair_groups_rw" on public.pair_groups
  for all using (public.is_app_user()) with check (public.is_app_user());

create policy "plans_select" on public.plans
  for select using (public.is_app_user());

create policy "plans_owner_write" on public.plans
  for all using (public.is_owner()) with check (public.is_owner());

create policy "ticket_bundles_rw" on public.ticket_bundles
  for all using (public.is_app_user()) with check (public.is_app_user());

create policy "sessions_rw" on public.sessions
  for all using (public.is_app_user()) with check (public.is_app_user());

create policy "session_participants_rw" on public.session_participants
  for all using (public.is_app_user()) with check (public.is_app_user());

-- Allow views to be read by app users.
grant select on public.monthly_revenue to authenticated;
grant select on public.customer_ticket_summary to authenticated;

-- ============================================================
-- Session confirmation RPCs.
-- Centralizing the logic in SQL keeps ticket counts and revenue
-- consistent regardless of which client triggers the action.
-- ============================================================

-- Mark a session as confirmed (実施 or 当日キャンセル消化).
-- Decrements remaining_count on each participant's bundle and
-- sets revenue_amount based on the bundle's effective unit price.
-- For pair-plan sessions: only the primary participant consumes
-- and carries revenue; the partner row stays at consumed=false / revenue=0.
create or replace function public.confirm_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_app_user() then
    raise exception 'not authorized';
  end if;

  update public.session_participants sp
  set
    consumed = sp.is_pair_primary,
    revenue_amount = case
      when sp.is_pair_primary then (
        select coalesce(tb.override_total_price, p.total_price) / p.session_count
        from public.ticket_bundles tb
        join public.plans p on p.id = tb.plan_id
        where tb.id = sp.ticket_bundle_id
      )
      else 0
    end
  where sp.session_id = p_session_id;

  -- Decrement ticket bundle counts. For pair plans both participants share
  -- the same bundle but only one carries consumed=true, so the bundle gets
  -- exactly one decrement per session.
  update public.ticket_bundles tb
  set
    remaining_count = greatest(tb.remaining_count - sub.delta, 0),
    status = case when greatest(tb.remaining_count - sub.delta, 0) = 0 then 'exhausted' else tb.status end
  from (
    select sp.ticket_bundle_id as bundle_id, count(*) as delta
    from public.session_participants sp
    where sp.session_id = p_session_id and sp.consumed = true
    group by sp.ticket_bundle_id
  ) sub
  where tb.id = sub.bundle_id;

  update public.sessions
  set status = 'confirmed', confirmed_at = now(), confirmed_by = v_uid
  where id = p_session_id;
end;
$$;

-- Cancel a session without consumption (キャンセル返却).
create or replace function public.cancel_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_app_user() then
    raise exception 'not authorized';
  end if;

  update public.session_participants
  set consumed = false, revenue_amount = 0
  where session_id = p_session_id;

  update public.sessions
  set status = 'canceled', confirmed_at = now(), confirmed_by = auth.uid()
  where id = p_session_id;
end;
$$;

-- Revert a confirmation back to scheduled (in case of mistake).
create or replace function public.revert_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_app_user() then
    raise exception 'not authorized';
  end if;

  -- Restore ticket counts for any rows that had consumed=true.
  update public.ticket_bundles tb
  set
    remaining_count = tb.remaining_count + sub.delta,
    status = case when tb.status = 'exhausted' and (tb.remaining_count + sub.delta) > 0 then 'active' else tb.status end
  from (
    select sp.ticket_bundle_id as bundle_id, count(*) as delta
    from public.session_participants sp
    where sp.session_id = p_session_id and sp.consumed = true
    group by sp.ticket_bundle_id
  ) sub
  where tb.id = sub.bundle_id;

  update public.session_participants
  set consumed = false, revenue_amount = 0
  where session_id = p_session_id;

  update public.sessions
  set status = 'scheduled', confirmed_at = null, confirmed_by = null
  where id = p_session_id;
end;
$$;

grant execute on function public.confirm_session(uuid) to authenticated;
grant execute on function public.cancel_session(uuid) to authenticated;
grant execute on function public.revert_session(uuid) to authenticated;
