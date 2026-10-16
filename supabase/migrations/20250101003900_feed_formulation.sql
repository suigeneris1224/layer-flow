-- LayerFlow :: feed formulation
--
-- A farm's own ingredients (with the nutrient values off the supplier's label
-- or from its nutritionist) and its own mixes of them. LayerFlow ships no
-- ingredient database and no recipe: it only does the weighted-average and
-- cost math (lib/domain/feed-formulation.ts). Same stance as alerts.ts.
--
-- Recipes are farm configuration, like pricing: MANAGER+ writes
-- (app.can_manage_farm), any member reads.

-- ---------------------------------------------------------------------------
-- feed_ingredients
-- ---------------------------------------------------------------------------
create table feed_ingredients (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references farms (id) on delete cascade,
  name                text not null check (length(btrim(name)) > 0),
  price_per_kg        numeric(12, 4) not null default 0 check (price_per_kg >= 0),
  protein_pct         numeric(6, 3) not null default 0 check (protein_pct between 0 and 100),
  energy_kcal_per_kg  numeric(8, 2) not null default 0
    check (energy_kcal_per_kg between 0 and 10000),
  calcium_pct         numeric(6, 3) not null default 0 check (calcium_pct between 0 and 100),
  phosphorus_pct      numeric(6, 3) not null default 0 check (phosphorus_pct between 0 and 100),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index feed_ingredients_farm_name_key
  on feed_ingredients (farm_id, lower(btrim(name)));

create trigger feed_ingredients_touch
  before update on feed_ingredients
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- feed_formulas
-- ---------------------------------------------------------------------------
create table feed_formulas (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid not null references farms (id) on delete cascade,
  name                text not null check (length(btrim(name)) > 0),
  batch_kg            numeric(10, 2) not null default 100 check (batch_kg > 0),
  -- Optional targets, entered by the farm. Null = no target shown.
  target_protein_pct  numeric(6, 3) check (target_protein_pct is null or target_protein_pct between 0 and 100),
  target_energy       numeric(8, 2) check (target_energy is null or target_energy between 0 and 10000),
  target_calcium_pct  numeric(6, 3) check (target_calcium_pct is null or target_calcium_pct between 0 and 100),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index feed_formulas_farm_name_key on feed_formulas (farm_id, lower(btrim(name)));

create trigger feed_formulas_touch
  before update on feed_formulas
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- feed_formula_items :: child rows, tenancy through the parent formula
-- ---------------------------------------------------------------------------
create table feed_formula_items (
  id             uuid primary key default gen_random_uuid(),
  formula_id     uuid not null references feed_formulas (id) on delete cascade,
  -- Deferred to commit: deleting an ingredient a recipe still uses is refused
  -- (the item row is still there at commit), but deleting a whole farm --
  -- which cascades to ingredients, formulas and their items in one
  -- transaction -- succeeds, because the items are gone by commit. RESTRICT,
  -- or a non-deferred NO ACTION, fires mid-cascade and blocks the farm delete
  -- (and with it account deletion).
  ingredient_id  uuid not null references feed_ingredients (id)
    on delete no action deferrable initially deferred,
  percent        numeric(6, 3) not null check (percent > 0 and percent <= 100),
  unique (formula_id, ingredient_id)
);

create index feed_formula_items_ingredient_idx on feed_formula_items (ingredient_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table feed_ingredients enable row level security;
alter table feed_formulas enable row level security;
alter table feed_formula_items enable row level security;

create policy feed_ingredients_select on feed_ingredients
  for select to authenticated using (app.is_farm_member(farm_id));
create policy feed_ingredients_write on feed_ingredients
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

create policy feed_formulas_select on feed_formulas
  for select to authenticated using (app.is_farm_member(farm_id));
create policy feed_formulas_write on feed_formulas
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));

-- The join IS the tenancy check, same as daily_egg_size_production. The write
-- check also requires the ingredient to be the same farm's, so a recipe can't
-- borrow another farm's ingredient by id.
create policy feed_formula_items_select on feed_formula_items
  for select to authenticated
  using (exists (
    select 1 from feed_formulas f
    where f.id = formula_id and app.is_farm_member(f.farm_id)
  ));

create policy feed_formula_items_write on feed_formula_items
  for all to authenticated
  using (exists (
    select 1 from feed_formulas f
    where f.id = formula_id and app.can_manage_farm(f.farm_id)
  ))
  with check (exists (
    select 1
    from feed_formulas f
    join feed_ingredients i on i.farm_id = f.farm_id
    where f.id = formula_id
      and i.id = ingredient_id
      and app.can_manage_farm(f.farm_id)
  ));

-- ---------------------------------------------------------------------------
-- save_feed_formula :: header + items in one transaction
-- ---------------------------------------------------------------------------
/**
 * Create (p_formula_id null) or replace a formula and its items atomically.
 *
 * SECURITY INVOKER: exists for atomicity, not privilege -- every statement
 * runs under the caller's RLS, so a worker or another farm is refused by the
 * policies above. Items are replaced wholesale; the editor always sends the
 * full list.
 */
create or replace function public.save_feed_formula(
  p_farm_id             uuid,
  p_name                text,
  p_batch_kg            numeric,
  p_items               jsonb,
  p_formula_id          uuid default null,
  p_target_protein_pct  numeric default null,
  p_target_energy       numeric default null,
  p_target_calcium_pct  numeric default null,
  p_notes               text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_formula_id is null then
    insert into public.feed_formulas (
      farm_id, name, batch_kg, target_protein_pct, target_energy, target_calcium_pct, notes
    )
    values (
      p_farm_id, p_name, p_batch_kg, p_target_protein_pct, p_target_energy,
      p_target_calcium_pct, p_notes
    )
    returning id into v_id;
  else
    update public.feed_formulas
    set name = p_name,
        batch_kg = p_batch_kg,
        target_protein_pct = p_target_protein_pct,
        target_energy = p_target_energy,
        target_calcium_pct = p_target_calcium_pct,
        notes = p_notes
    where id = p_formula_id and farm_id = p_farm_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Formula not found' using errcode = 'no_data_found';
    end if;

    delete from public.feed_formula_items where formula_id = v_id;
  end if;

  insert into public.feed_formula_items (formula_id, ingredient_id, percent)
  select v_id, (item ->> 'ingredient_id')::uuid, (item ->> 'percent')::numeric
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  return v_id;
end;
$$;

grant execute on function public.save_feed_formula(
  uuid, text, numeric, jsonb, uuid, numeric, numeric, numeric, text
) to authenticated;
