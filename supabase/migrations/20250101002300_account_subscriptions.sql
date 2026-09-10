-- ---------------------------------------------------------------------------
-- Account-wide subscriptions
-- ---------------------------------------------------------------------------
-- subscriptions used to be one row per farm, so a second farm always started
-- on FREE even when the owner's other farm was Pro -- confusing, and it
-- contradicts Pro's own pitch ("run several farms with a team"). Ownership is
-- already 1:1 (farms.owner_id, no co-ownership concept anywhere in the
-- schema) and one person already owns multiple farms today, so owner_id is
-- the natural key for a real account-level subscription.

alter table subscriptions add column owner_id uuid references auth.users (id) on delete cascade;

update subscriptions s
set owner_id = f.owner_id
from farms f
where f.id = s.farm_id;

-- Consolidate: an owner may already have several rows today (one per
-- existing farm, some possibly upgraded independently via the dev switcher).
-- Keep exactly one -- highest plan wins, ties broken by most recently
-- touched -- and drop the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by owner_id
      order by
        case plan when 'PRO' then 3 when 'STARTER' then 2 else 1 end desc,
        updated_at desc
    ) as rn
  from subscriptions
)
delete from subscriptions
where id in (select id from ranked where rn > 1);

alter table subscriptions alter column owner_id set not null;
alter table subscriptions add constraint subscriptions_owner_id_key unique (owner_id);

-- The old subscriptions_select policy (created in an earlier migration)
-- still reads farm_id, so it has to go before the column does -- dropping
-- the column first fails with "other objects depend on it". Its replacement
-- is created further down, once owner_id is the only key left.
drop policy subscriptions_select on subscriptions;

-- Cascades through the inline `farm_id ... unique references farms` -- its
-- constraint, supporting index, and subscriptions_farm_id_fkey all drop with
-- it. The new unique constraint on owner_id already backs its own index.
alter table subscriptions drop column farm_id;

-- One row per owner now: a second/third farm for the same owner is a
-- no-op here (the owner already has a row), which is exactly "reuse the
-- existing plan automatically" -- no app-level change needed anywhere a farm
-- gets created.
create or replace function app.ensure_subscription()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.subscriptions (owner_id, plan, status)
  values (new.owner_id, 'FREE', 'ACTIVE')
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

-- Any member of any farm this owner has may read the account's plan --
-- entitlement resolution (getFarmContext) runs for every team member, not
-- just the owner. (The old policy of this name was already dropped above,
-- before farm_id went away.)
create policy subscriptions_select on subscriptions
  for select to authenticated
  using (exists (
    select 1 from farms f
    where f.owner_id = subscriptions.owner_id
      and app.is_farm_member(f.id)
  ));
