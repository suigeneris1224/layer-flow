-- LayerFlow :: atomic egg price change
--
-- egg_prices is guarded by a GiST exclusion constraint forbidding overlapping
-- date ranges per size, with an INCLUSIVE upper bound. Changing a price is
-- therefore two writes that must both land or neither:
--
--   1. close the current row at (new start - 1 day)
--   2. insert the new row, open-ended
--
-- Insert-first overlaps and is rejected. Close-first-then-fail would leave the
-- farm with no current price at all. supabase-js cannot span statements, so the
-- pair lives here.

/**
 * Set the price for one egg size, effective from a date.
 *
 * SECURITY INVOKER on purpose: this exists for atomicity, not privilege. Every
 * statement still runs under the caller's RLS policies, and farm_id is derived
 * from the egg size rather than trusted from the caller -- a size belonging to
 * another farm simply is not visible, so the lookup finds nothing.
 */
create or replace function public.set_egg_price(
  p_egg_size_id     uuid,
  p_price_per_egg   numeric,
  p_price_per_tray  numeric,
  p_effective_from  date
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_farm_id  uuid;
  v_current  public.egg_prices%rowtype;
  v_price_id uuid;
begin
  if p_price_per_egg < 0 or p_price_per_tray < 0 then
    raise exception 'Prices cannot be negative' using errcode = 'check_violation';
  end if;

  select es.farm_id into v_farm_id
  from public.egg_sizes es
  where es.id = p_egg_size_id;

  if v_farm_id is null then
    raise exception 'Egg size not found' using errcode = 'no_data_found';
  end if;

  -- The row in force on (or scheduled from) the target date onwards. Ordering
  -- by effective_from desc picks the latest, which is the one a change affects.
  select * into v_current
  from public.egg_prices ep
  where ep.egg_size_id = p_egg_size_id
    and ep.farm_id = v_farm_id
    and ep.effective_to is null
  order by ep.effective_from desc
  limit 1;

  if v_current.id is null then
    insert into public.egg_prices (
      farm_id, egg_size_id, price_per_egg, price_per_tray, effective_from
    )
    values (v_farm_id, p_egg_size_id, p_price_per_egg, p_price_per_tray, p_effective_from)
    returning id into v_price_id;

    return v_price_id;
  end if;

  if p_effective_from = v_current.effective_from then
    -- Same start date: replace in place. Closing this row would put
    -- effective_to before effective_from and trip egg_prices_range_valid.
    update public.egg_prices
    set price_per_egg = p_price_per_egg,
        price_per_tray = p_price_per_tray
    where id = v_current.id
    returning id into v_price_id;

    return v_price_id;
  end if;

  if p_effective_from < v_current.effective_from then
    raise exception
      'A price change is already scheduled from %', v_current.effective_from
      using errcode = 'check_violation';
  end if;

  -- Close, then insert. Both statements are in this function's transaction, so
  -- the closed range is visible to the insert and no overlap occurs.
  update public.egg_prices
  set effective_to = p_effective_from - 1
  where id = v_current.id;

  insert into public.egg_prices (
    farm_id, egg_size_id, price_per_egg, price_per_tray, effective_from
  )
  values (v_farm_id, p_egg_size_id, p_price_per_egg, p_price_per_tray, p_effective_from)
  returning id into v_price_id;

  return v_price_id;
end;
$$;

grant execute on function public.set_egg_price(uuid, numeric, numeric, date) to authenticated;
