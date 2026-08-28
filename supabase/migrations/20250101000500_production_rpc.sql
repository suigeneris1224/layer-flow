-- LayerFlow :: atomic daily production write
--
-- Recording a day touches four tables. supabase-js cannot span statements, so
-- the whole write lives in one function and therefore one transaction.

-- Link feed to the production record that created it, mirroring how
-- mortality_records already works. Without this the write is not idempotent:
-- re-saving a day would stack duplicate feed rows.
alter table feed_usage
  add column daily_production_id uuid references daily_production (id) on delete cascade;

-- At most one auto-generated feed row per production record. Ad-hoc feed
-- entries leave the column null, and NULLs do not collide in a unique index.
create unique index feed_usage_daily_production_id_key
  on feed_usage (daily_production_id)
  where daily_production_id is not null;

/**
 * Record (or correct) one flock-day.
 *
 * SECURITY INVOKER on purpose. This function exists for atomicity, NOT for
 * privilege: every statement inside still runs under the caller's RLS
 * policies. Do not change it to DEFINER -- that would turn a convenience
 * wrapper into a hole straight through tenant isolation.
 *
 * Upserts on (flock_id, production_date). That satisfies the "no duplicate
 * records" rule while making the call idempotent, which is what lets the
 * offline queue retry a submission safely without creating a second day.
 */
create or replace function public.record_daily_production(
  p_flock_id            uuid,
  p_production_date     date,
  p_hens_present        integer,
  p_eggs_collected      integer,
  p_broken_eggs         integer default 0,
  p_dirty_eggs          integer default 0,
  p_mortality           integer default 0,
  p_average_egg_weight  numeric default null,
  p_feed_kg             numeric default 0,
  p_feed_cost_per_kg    numeric default 0,
  p_notes               text default null,
  p_sizes               jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_farm_id       uuid;
  v_production_id uuid;
  v_feed_cost     numeric(14, 2);
  v_stray_sizes   integer;
begin
  -- farm_id is derived, never supplied. Under RLS this select returns nothing
  -- for a flock the caller cannot see, so a guessed id fails here.
  select f.farm_id into v_farm_id
  from public.flocks f
  where f.id = p_flock_id;

  if v_farm_id is null then
    raise exception 'Flock not found' using errcode = 'no_data_found';
  end if;

  insert into public.daily_production as dp (
    farm_id, flock_id, production_date, hens_present, eggs_collected,
    broken_eggs, dirty_eggs, average_egg_weight, mortality, notes
  )
  values (
    v_farm_id, p_flock_id, p_production_date, p_hens_present, p_eggs_collected,
    p_broken_eggs, p_dirty_eggs, p_average_egg_weight, p_mortality, p_notes
  )
  on conflict (flock_id, production_date) do update set
    hens_present       = excluded.hens_present,
    eggs_collected     = excluded.eggs_collected,
    broken_eggs        = excluded.broken_eggs,
    dirty_eggs         = excluded.dirty_eggs,
    average_egg_weight = excluded.average_egg_weight,
    mortality          = excluded.mortality,
    notes              = excluded.notes
  returning dp.id into v_production_id;

  -- ---------------------------------------------------------------------
  -- Egg size breakdown. Replaced wholesale so removing a size actually
  -- removes it. The deferred trigger checks the total at commit.
  -- ---------------------------------------------------------------------

  -- Reject sizes belonging to another farm. RLS on the child table only
  -- checks the parent production row, so without this a caller could attach
  -- a foreign farm's egg_size_id to their own record.
  select count(*) into v_stray_sizes
  from jsonb_to_recordset(coalesce(p_sizes, '[]'::jsonb))
    as s(egg_size_id uuid, quantity integer)
  left join public.egg_sizes es
    on es.id = s.egg_size_id and es.farm_id = v_farm_id
  where es.id is null;

  if v_stray_sizes > 0 then
    raise exception 'Unknown egg size for this farm' using errcode = 'foreign_key_violation';
  end if;

  delete from public.daily_egg_size_production
  where daily_production_id = v_production_id;

  insert into public.daily_egg_size_production (daily_production_id, egg_size_id, quantity)
  select v_production_id, s.egg_size_id, s.quantity
  from jsonb_to_recordset(coalesce(p_sizes, '[]'::jsonb))
    as s(egg_size_id uuid, quantity integer)
  where s.quantity > 0;

  -- ---------------------------------------------------------------------
  -- Feed. Zero means "no feed today", which must clear a previous entry.
  -- ---------------------------------------------------------------------
  if coalesce(p_feed_kg, 0) > 0 then
    v_feed_cost := round(coalesce(p_feed_kg, 0) * coalesce(p_feed_cost_per_kg, 0), 2);

    insert into public.feed_usage as fu (
      farm_id, flock_id, daily_production_id, usage_date,
      quantity_kg, cost_per_kg, total_cost
    )
    values (
      v_farm_id, p_flock_id, v_production_id, p_production_date,
      p_feed_kg, coalesce(p_feed_cost_per_kg, 0), v_feed_cost
    )
    on conflict (daily_production_id) where daily_production_id is not null
    do update set
      usage_date  = excluded.usage_date,
      quantity_kg = excluded.quantity_kg,
      cost_per_kg = excluded.cost_per_kg,
      total_cost  = excluded.total_cost;
  else
    delete from public.feed_usage where daily_production_id = v_production_id;
  end if;

  -- ---------------------------------------------------------------------
  -- Mortality. The trigger on this table recalculates flocks.current_hens,
  -- so correcting a figure here corrects the flock automatically.
  -- ---------------------------------------------------------------------
  if coalesce(p_mortality, 0) > 0 then
    insert into public.mortality_records as mr (
      farm_id, flock_id, daily_production_id, record_date, quantity, reason
    )
    values (
      v_farm_id, p_flock_id, v_production_id, p_production_date,
      p_mortality, 'Recorded with daily production'
    )
    on conflict (daily_production_id) do update set
      record_date = excluded.record_date,
      quantity    = excluded.quantity;
  else
    delete from public.mortality_records where daily_production_id = v_production_id;
  end if;

  return v_production_id;
end;
$$;

grant execute on function public.record_daily_production(
  uuid, date, integer, integer, integer, integer, integer,
  numeric, numeric, numeric, text, jsonb
) to authenticated;
