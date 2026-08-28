-- LayerFlow :: Row Level Security
--
-- Tenant isolation lives HERE, at the database, not in middleware. Every
-- farm-owned table is deny-by-default; a row is reachable only through a
-- farm_members row for the calling user.
--
-- Role model:
--   WORKER  -- records daily operations (production, feed, mortality)
--   MANAGER -- the above + commerce (sales, expenses, pricing, customers, setup)
--   OWNER   -- the above + team, billing, farm settings

-- ---------------------------------------------------------------------------
-- Role predicates
-- ---------------------------------------------------------------------------
create or replace function app.can_manage_farm(farm uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.has_farm_role(farm, 'OWNER'::farm_role, 'MANAGER'::farm_role);
$$;

create or replace function app.is_farm_owner(farm uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.has_farm_role(farm, 'OWNER'::farm_role);
$$;

-- Do we share any farm with this user? Gates profile visibility.
create or replace function app.shares_farm_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.farm_members mine
    join public.farm_members theirs on theirs.farm_id = mine.farm_id
    where mine.user_id = auth.uid()
      and theirs.user_id = other
  );
$$;

grant execute on function
  app.can_manage_farm(uuid),
  app.is_farm_owner(uuid),
  app.shares_farm_with(uuid)
to authenticated;

-- The creator of a farm becomes its OWNER in the same transaction. Without
-- this the new farm would be immediately invisible to the user who made it.
create or replace function app.claim_farm_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.farm_members (farm_id, user_id, role)
  values (new.id, new.owner_id, 'OWNER')
  on conflict (farm_id, user_id) do update set role = 'OWNER';
  return new;
end;
$$;

create trigger farms_claim_ownership
  after insert on farms
  for each row execute function app.claim_farm_ownership();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. Anything not explicitly allowed below is denied.
-- ---------------------------------------------------------------------------
alter table profiles                  enable row level security;
alter table farms                     enable row level security;
alter table farm_members              enable row level security;
alter table houses                    enable row level security;
alter table flocks                    enable row level security;
alter table egg_sizes                 enable row level security;
alter table egg_prices                enable row level security;
alter table daily_production          enable row level security;
alter table daily_egg_size_production enable row level security;
alter table feed_usage                enable row level security;
alter table mortality_records         enable row level security;
alter table vaccinations              enable row level security;
alter table customers                 enable row level security;
alter table egg_sales                 enable row level security;
alter table egg_sale_items            enable row level security;
alter table egg_inventory_adjustments enable row level security;
alter table expenses                  enable row level security;
alter table subscriptions             enable row level security;
alter table audit_logs                enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_self_or_teammate on profiles
  for select to authenticated
  using (id = auth.uid() or app.shares_farm_with(id));

create policy profiles_insert_self on profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- farms
-- ---------------------------------------------------------------------------
create policy farms_select_member on farms
  for select to authenticated
  using (app.is_farm_member(id));

-- A user may only create a farm they own. owner_id is never taken on trust
-- from the client; this check pins it to the authenticated session.
create policy farms_insert_self_owned on farms
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy farms_update_owner on farms
  for update to authenticated
  using (app.is_farm_owner(id))
  with check (app.is_farm_owner(id));

create policy farms_delete_owner on farms
  for delete to authenticated
  using (app.is_farm_owner(id));

-- ---------------------------------------------------------------------------
-- farm_members
-- ---------------------------------------------------------------------------
create policy farm_members_select_teammates on farm_members
  for select to authenticated
  using (app.is_farm_member(farm_id));

create policy farm_members_insert_owner on farm_members
  for insert to authenticated
  with check (app.is_farm_owner(farm_id));

create policy farm_members_update_owner on farm_members
  for update to authenticated
  using (app.is_farm_owner(farm_id))
  with check (app.is_farm_owner(farm_id));

-- An owner may not remove themselves; a farm must always keep an owner.
create policy farm_members_delete_owner on farm_members
  for delete to authenticated
  using (app.is_farm_owner(farm_id) and user_id <> auth.uid());

-- ---------------------------------------------------------------------------
-- Farm-scoped tables managed by OWNER/MANAGER
-- ---------------------------------------------------------------------------
create policy houses_select on houses
  for select to authenticated using (app.is_farm_member(farm_id));
create policy houses_write on houses
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy flocks_select on flocks
  for select to authenticated using (app.is_farm_member(farm_id));
create policy flocks_write on flocks
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy egg_sizes_select on egg_sizes
  for select to authenticated using (app.is_farm_member(farm_id));
create policy egg_sizes_write on egg_sizes
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy egg_prices_select on egg_prices
  for select to authenticated using (app.is_farm_member(farm_id));
create policy egg_prices_write on egg_prices
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy customers_select on customers
  for select to authenticated using (app.is_farm_member(farm_id));
create policy customers_write on customers
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy egg_sales_select on egg_sales
  for select to authenticated using (app.is_farm_member(farm_id));
create policy egg_sales_write on egg_sales
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy expenses_select on expenses
  for select to authenticated using (app.is_farm_member(farm_id));
create policy expenses_write on expenses
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy egg_inventory_adjustments_select on egg_inventory_adjustments
  for select to authenticated using (app.is_farm_member(farm_id));
create policy egg_inventory_adjustments_write on egg_inventory_adjustments
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

-- ---------------------------------------------------------------------------
-- Daily operations. Any member, including WORKER, may record these.
-- ---------------------------------------------------------------------------
create policy daily_production_select on daily_production
  for select to authenticated using (app.is_farm_member(farm_id));
create policy daily_production_write on daily_production
  for all to authenticated
  using (app.is_farm_member(farm_id))
  with check (app.is_farm_member(farm_id));

create policy feed_usage_select on feed_usage
  for select to authenticated using (app.is_farm_member(farm_id));
create policy feed_usage_write on feed_usage
  for all to authenticated
  using (app.is_farm_member(farm_id))
  with check (app.is_farm_member(farm_id));

create policy mortality_records_select on mortality_records
  for select to authenticated using (app.is_farm_member(farm_id));
create policy mortality_records_write on mortality_records
  for all to authenticated
  using (app.is_farm_member(farm_id))
  with check (app.is_farm_member(farm_id));

create policy vaccinations_select on vaccinations
  for select to authenticated using (app.is_farm_member(farm_id));
create policy vaccinations_write on vaccinations
  for all to authenticated
  using (app.is_farm_member(farm_id))
  with check (app.is_farm_member(farm_id));

-- ---------------------------------------------------------------------------
-- Child tables. These carry no farm_id, so they inherit access from their
-- parent row -- the join IS the tenancy check.
-- ---------------------------------------------------------------------------
create policy daily_egg_size_production_select on daily_egg_size_production
  for select to authenticated
  using (exists (
    select 1 from daily_production dp
    where dp.id = daily_production_id and app.is_farm_member(dp.farm_id)
  ));

create policy daily_egg_size_production_write on daily_egg_size_production
  for all to authenticated
  using (exists (
    select 1 from daily_production dp
    where dp.id = daily_production_id and app.is_farm_member(dp.farm_id)
  ))
  with check (exists (
    select 1 from daily_production dp
    where dp.id = daily_production_id and app.is_farm_member(dp.farm_id)
  ));

create policy egg_sale_items_select on egg_sale_items
  for select to authenticated
  using (exists (
    select 1 from egg_sales s
    where s.id = sale_id and app.is_farm_member(s.farm_id)
  ));

create policy egg_sale_items_write on egg_sale_items
  for all to authenticated
  using (exists (
    select 1 from egg_sales s
    where s.id = sale_id and app.can_manage_farm(s.farm_id)
  ))
  with check (exists (
    select 1 from egg_sales s
    where s.id = sale_id and app.can_manage_farm(s.farm_id)
  ));

-- ---------------------------------------------------------------------------
-- subscriptions :: readable by the team, writable only by billing webhooks
-- running as service_role (which bypasses RLS). No client write policy exists.
-- ---------------------------------------------------------------------------
create policy subscriptions_select on subscriptions
  for select to authenticated using (app.is_farm_member(farm_id));

-- ---------------------------------------------------------------------------
-- audit_logs :: append-only. Readable by managers; no update or delete policy
-- is defined anywhere, so the trail cannot be rewritten from the client.
-- ---------------------------------------------------------------------------
create policy audit_logs_select on audit_logs
  for select to authenticated using (app.can_manage_farm(farm_id));

create policy audit_logs_insert on audit_logs
  for insert to authenticated
  with check (app.is_farm_member(farm_id) and user_id = auth.uid());
