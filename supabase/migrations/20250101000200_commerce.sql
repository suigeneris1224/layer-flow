-- LayerFlow :: commerce domain
-- Customers, egg sales, expenses, inventory adjustments + the inventory view.

create type payment_status as enum ('PAID', 'PARTIAL', 'UNPAID');

create type expense_category as enum (
  'FEED', 'CHICKS', 'MEDICINE', 'VACCINE', 'LABOR',
  'ELECTRICITY', 'WATER', 'TRANSPORT', 'EQUIPMENT', 'OTHER'
);

-- One tray is 30 eggs. Defined once so SQL and TypeScript cannot disagree.
create or replace function app.eggs_per_tray()
returns integer
language sql
immutable
as $$ select 30; $$;

grant execute on function app.eggs_per_tray() to authenticated;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table customers (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index customers_farm_id_idx on customers (farm_id, name);

create trigger customers_touch
  before update on customers
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- egg_sales
-- ---------------------------------------------------------------------------
create table egg_sales (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid not null references farms (id) on delete cascade,
  flock_id        uuid references flocks (id) on delete set null,
  customer_id     uuid references customers (id) on delete set null,
  sale_date       date not null,
  total_amount    numeric(14, 2) not null default 0 check (total_amount >= 0),
  payment_status  payment_status not null default 'PAID',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index egg_sales_farm_date_idx on egg_sales (farm_id, sale_date desc);
create index egg_sales_customer_idx on egg_sales (customer_id);

create trigger egg_sales_touch
  before update on egg_sales
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- egg_sale_items
--
-- price_per_egg / price_per_tray are COPIED from egg_prices at sale time.
-- Repricing the farm must never restate a past sale.
-- ---------------------------------------------------------------------------
create table egg_sale_items (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references egg_sales (id) on delete cascade,
  egg_size_id     uuid not null references egg_sizes (id) on delete restrict,
  quantity_eggs   integer not null default 0 check (quantity_eggs >= 0),
  quantity_trays  integer not null default 0 check (quantity_trays >= 0),
  price_per_egg   numeric(12, 4) not null default 0 check (price_per_egg >= 0),
  price_per_tray  numeric(12, 4) not null default 0 check (price_per_tray >= 0),
  subtotal        numeric(14, 2) not null default 0 check (subtotal >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint egg_sale_items_nonempty check (quantity_eggs > 0 or quantity_trays > 0)
);

create index egg_sale_items_sale_idx on egg_sale_items (sale_id);
create index egg_sale_items_size_idx on egg_sale_items (egg_size_id);

create trigger egg_sale_items_touch
  before update on egg_sale_items
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- egg_inventory_adjustments :: manual corrections (spoilage, own use, recount)
-- ---------------------------------------------------------------------------
create table egg_inventory_adjustments (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid not null references farms (id) on delete cascade,
  egg_size_id      uuid not null references egg_sizes (id) on delete restrict,
  adjustment_date  date not null default current_date,
  -- Signed: negative removes stock (spoilage), positive adds it (recount up).
  quantity_eggs    integer not null check (quantity_eggs <> 0),
  reason           text not null default '',
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index egg_inventory_adjustments_farm_idx
  on egg_inventory_adjustments (farm_id, adjustment_date desc);

create trigger egg_inventory_adjustments_touch
  before update on egg_inventory_adjustments
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table expenses (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references farms (id) on delete cascade,
  flock_id      uuid references flocks (id) on delete set null,
  category      expense_category not null default 'OTHER',
  description   text not null default '',
  amount        numeric(14, 2) not null check (amount >= 0),
  expense_date  date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index expenses_farm_date_idx on expenses (farm_id, expense_date desc);
create index expenses_flock_idx on expenses (flock_id);
create index expenses_category_idx on expenses (farm_id, category);

create trigger expenses_touch
  before update on expenses
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- egg_inventory_balances :: produced + adjusted - sold, per farm per size.
--
-- A view rather than a running-total column: it cannot drift, and at MVP data
-- volumes the aggregate is cheap. Revisit if a farm ever outgrows it.
-- ---------------------------------------------------------------------------
create or replace view egg_inventory_balances
with (security_invoker = true)
as
with produced as (
  select dp.farm_id, d.egg_size_id, sum(d.quantity)::bigint as eggs
  from daily_egg_size_production d
  join daily_production dp on dp.id = d.daily_production_id
  group by dp.farm_id, d.egg_size_id
),
sold as (
  select s.farm_id,
         i.egg_size_id,
         sum(i.quantity_eggs + i.quantity_trays * app.eggs_per_tray())::bigint as eggs
  from egg_sale_items i
  join egg_sales s on s.id = i.sale_id
  group by s.farm_id, i.egg_size_id
),
adjusted as (
  select a.farm_id, a.egg_size_id, sum(a.quantity_eggs)::bigint as eggs
  from egg_inventory_adjustments a
  group by a.farm_id, a.egg_size_id
)
select
  sz.farm_id,
  sz.id            as egg_size_id,
  sz.code          as egg_size_code,
  sz.name          as egg_size_name,
  sz.sort_order,
  coalesce(p.eggs, 0) as eggs_produced,
  coalesce(s.eggs, 0) as eggs_sold,
  coalesce(a.eggs, 0) as eggs_adjusted,
  coalesce(p.eggs, 0) + coalesce(a.eggs, 0) - coalesce(s.eggs, 0) as eggs_available
from egg_sizes sz
left join produced p on p.farm_id = sz.farm_id and p.egg_size_id = sz.id
left join sold     s on s.farm_id = sz.farm_id and s.egg_size_id = sz.id
left join adjusted a on a.farm_id = sz.farm_id and a.egg_size_id = sz.id;

grant select on egg_inventory_balances to authenticated;
