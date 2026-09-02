-- LayerFlow :: conflict detection for offline daily-production sync
--
-- docs/offline-sync.md's conflict scenario: a record made offline on one
-- device, and the same flock-day also recorded on another. Both land on the
-- same (flock_id, production_date) row via record_daily_production's upsert.
-- Last-write-wins would silently discard someone's morning -- this makes the
-- RPC compare against the row it's about to overwrite and, on a genuine
-- disagreement, hold off and hand both versions back instead of writing.
--
-- p_client_seen_at is null for every caller except the offline queue replay
-- (lib/offline/sync.ts), which sends the queued item's createdAt. Every other
-- caller -- the online form, and edits from /production/[id] -- is
-- unaffected: this is purely additive.
--
-- Return type changes from a bare uuid to jsonb, so this is a drop + create
-- rather than create or replace (Postgres refuses a return-type change on
-- replace), and the execute grant is re-issued since a drop revokes it.

drop function public.record_daily_production(
  uuid, date, integer, integer, integer, integer, integer,
  numeric, numeric, numeric, text, jsonb
);

create function public.record_daily_production(
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
  p_sizes               jsonb default '[]'::jsonb,
  p_client_seen_at      timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_farm_id         uuid;
  v_production_id   uuid;
  v_feed_cost       numeric(14, 2);
  v_stray_sizes     integer;
  v_existing        public.daily_production%rowtype;
  v_existing_sizes  jsonb;
  v_incoming_sizes  jsonb;
  v_conflict        boolean := false;
begin
  -- farm_id is derived, never supplied. Under RLS this select returns nothing
  -- for a flock the caller cannot see, so a guessed id fails here.
  select f.farm_id into v_farm_id
  from public.flocks f
  where f.id = p_flock_id;

  if v_farm_id is null then
    raise exception 'Flock not found' using errcode = 'no_data_found';
  end if;

  -- ---------------------------------------------------------------------
  -- Conflict check. Only meaningful when the caller is replaying a queued
  -- offline write (p_client_seen_at set) against a row someone else already
  -- changed since this device last saw it.
  -- ---------------------------------------------------------------------
  select * into v_existing
  from public.daily_production
  where flock_id = p_flock_id and production_date = p_production_date;

  if v_existing.id is not null
     and p_client_seen_at is not null
     and v_existing.updated_at > p_client_seen_at
  then
    select coalesce(jsonb_agg(jsonb_build_object('eggSizeId', egg_size_id, 'quantity', quantity)
             order by egg_size_id), '[]'::jsonb)
      into v_existing_sizes
      from public.daily_egg_size_production
      where daily_production_id = v_existing.id;

    select coalesce(jsonb_agg(jsonb_build_object('eggSizeId', s.egg_size_id, 'quantity', s.quantity)
             order by s.egg_size_id), '[]'::jsonb)
      into v_incoming_sizes
      from jsonb_to_recordset(coalesce(p_sizes, '[]'::jsonb)) as s(egg_size_id uuid, quantity integer)
      where s.quantity > 0;

    -- IS DISTINCT FROM treats NULL = NULL as not distinct, so a nullable
    -- notes/average_egg_weight that's blank on both sides is never a false
    -- conflict. Feed is deliberately excluded from this comparison -- it is
    -- not "the same day's numbers" the doc is concerned with -- but if
    -- everything else conflicts the whole transaction (feed included) is
    -- still held back below, since it cannot be applied partially.
    if v_existing.hens_present        is distinct from p_hens_present
    or v_existing.eggs_collected      is distinct from p_eggs_collected
    or v_existing.broken_eggs         is distinct from p_broken_eggs
    or v_existing.dirty_eggs          is distinct from p_dirty_eggs
    or v_existing.mortality           is distinct from p_mortality
    or coalesce(v_existing.notes, '') is distinct from coalesce(p_notes, '')
    or v_existing.average_egg_weight  is distinct from p_average_egg_weight
    or v_existing_sizes               is distinct from v_incoming_sizes
    then
      v_conflict := true;
    end if;

    if v_conflict then
      return jsonb_build_object(
        'status', 'conflict',
        'id', v_existing.id,
        'server', jsonb_build_object(
          'updatedAt', v_existing.updated_at,
          'hensPresent', v_existing.hens_present,
          'eggsCollected', v_existing.eggs_collected,
          'brokenEggs', v_existing.broken_eggs,
          'dirtyEggs', v_existing.dirty_eggs,
          'mortality', v_existing.mortality,
          'notes', v_existing.notes,
          'averageEggWeight', v_existing.average_egg_weight,
          'sizes', v_existing_sizes
        )
      );
    end if;
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

  return jsonb_build_object('status', 'ok', 'id', v_production_id);
end;
$$;

grant execute on function public.record_daily_production(
  uuid, date, integer, integer, integer, integer, integer,
  numeric, numeric, numeric, text, jsonb, timestamptz
) to authenticated;
