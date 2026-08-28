-- LayerFlow :: SaaS plumbing
-- Subscriptions and audit logging.

create type subscription_plan as enum ('FREE', 'STARTER', 'PRO');

create type subscription_status as enum (
  'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED'
);

-- ---------------------------------------------------------------------------
-- subscriptions :: one per farm
-- ---------------------------------------------------------------------------
create table subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  farm_id                   uuid not null unique references farms (id) on delete cascade,
  plan                      subscription_plan not null default 'FREE',
  status                    subscription_status not null default 'ACTIVE',
  billing_provider          text,
  provider_customer_id      text,
  provider_subscription_id  text,
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index subscriptions_farm_idx on subscriptions (farm_id);

create trigger subscriptions_touch
  before update on subscriptions
  for each row execute function app.touch_updated_at();

-- Every farm always has a subscription row, so entitlement checks never have
-- to special-case a missing one.
create or replace function app.ensure_subscription()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.subscriptions (farm_id, plan, status)
  values (new.id, 'FREE', 'ACTIVE')
  on conflict (farm_id) do nothing;
  return new;
end;
$$;

create trigger farms_ensure_subscription
  after insert on farms
  for each row execute function app.ensure_subscription();

-- ---------------------------------------------------------------------------
-- audit_logs :: append-only. No update/delete policy is ever granted.
-- ---------------------------------------------------------------------------
create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index audit_logs_farm_created_idx on audit_logs (farm_id, created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);
