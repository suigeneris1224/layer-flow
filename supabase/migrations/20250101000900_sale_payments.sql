-- LayerFlow :: sale payments and the atomic sale write
--
-- Two things this migration fixes.
--
-- 1. `payment_status` stored a status with no amount. PARTIAL was therefore
--    meaningless -- "who owes me money" could not be answered, which matters
--    because eggs go out on credit to sari-sari stores constantly. That is a
--    missing column, not a missing feature.
--
-- 2. Recording a sale touches two tables and has to price every line, so it
--    has to be one transaction. supabase-js cannot span statements.

-- ---------------------------------------------------------------------------
-- amount_paid
-- ---------------------------------------------------------------------------
alter table egg_sales
  add column amount_paid numeric(14, 2) not null default 0 check (amount_paid >= 0);

-- Backfill so existing (seeded) rows can satisfy the constraint below. A
-- PARTIAL row has no recorded amount to recover, so half is the honest guess;
-- a PARTIAL row worth nothing never made sense and becomes PAID.
update egg_sales set amount_paid = total_amount where payment_status = 'PAID';
update egg_sales set amount_paid = 0            where payment_status = 'UNPAID';

update egg_sales
set payment_status = 'PAID', amount_paid = total_amount
where payment_status = 'PARTIAL' and total_amount <= 0.01;

update egg_sales
set amount_paid = greatest(0.01, round(total_amount / 2, 2))
where payment_status = 'PARTIAL' and total_amount > 0.01;

/*
 * The status and the amount must agree, in the database and not only in the
 * app. Without this a client could write PAID with nothing against it, and the
 * outstanding-balance figure the farmer relies on would quietly be a lie.
 *
 * Mirrors derivePaymentStatus() in lib/domain/sales.ts. If you change one,
 * change the other -- they must agree.
 */
alter table egg_sales
  add constraint egg_sales_payment_consistent check (
    (payment_status = 'UNPAID'  and amount_paid = 0) or
    (payment_status = 'PAID'    and amount_paid >= total_amount) or
    (payment_status = 'PARTIAL' and amount_paid > 0 and amount_paid < total_amount)
  );

comment on column egg_sales.amount_paid is
  'Cash actually received. payment_status is derived from this, never typed.';

-- ---------------------------------------------------------------------------
-- record_egg_sale
-- ---------------------------------------------------------------------------

/**
 * Record one sale: the header, its lines, and the payment, in one transaction.
 *
 * SECURITY INVOKER on purpose. This function exists for atomicity, NOT for
 * privilege: every statement inside still runs under the caller's RLS
 * policies, so a WORKER (who has no write policy on egg_sales) is refused
 * here exactly as they would be on a direct insert. Do not change it to
 * DEFINER -- that would turn a convenience wrapper into a hole straight
 * through tenant isolation.
 *
 * farm_id is DERIVED from the egg sizes rather than trusted from the caller,
 * and both foreign-key-shaped arguments -- the egg sizes and the customer --
 * are checked to belong to that same farm. RLS checks the row's own farm_id
 * and says nothing about which farm a *referenced* row belongs to; the foreign
 * key only requires the row to exist. That gap has produced the same
 * cross-tenant bug twice already (the production breakdown, then inventory
 * adjustments), so it is closed explicitly here.
 *
 * The total is computed from the lines. A total sent from a browser is a
 * number to verify, not to trust -- and the payment check constraint needs it
 * before the header row can be inserted at all.
 *
 * Prices are arguments rather than a lookup: the farmer may have negotiated a
 * price different from the current one, and whatever price was used is copied
 * onto the line so re-pricing the farm never restates history.
 */
create or replace function public.record_egg_sale(
  p_sale_date    date,
  p_items        jsonb,
  p_customer_id  uuid    default null,
  p_flock_id     uuid    default null,
  p_amount_paid  numeric default 0,
  p_notes        text    default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_farm_ids  uuid[];
  v_farm_id   uuid;
  v_stray     integer;
  v_total     numeric(14, 2);
  v_paid      numeric(14, 2);
  v_status    public.payment_status;
  v_sale_id   uuid;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale needs at least one line' using errcode = 'check_violation';
  end if;

  if coalesce(p_amount_paid, 0) < 0 then
    raise exception 'Amount paid cannot be negative' using errcode = 'check_violation';
  end if;

  -- Reject sizes this caller cannot see. Under RLS another farm's egg_sizes
  -- simply are not visible, so the join finds nothing and the count is > 0.
  select count(*) into v_stray
  from jsonb_to_recordset(p_items) as s(egg_size_id uuid)
  left join public.egg_sizes es on es.id = s.egg_size_id
  where es.id is null;

  if v_stray > 0 then
    raise exception 'Unknown egg size for this farm' using errcode = 'foreign_key_violation';
  end if;

  -- farm_id is derived, never supplied. One sale cannot span farms.
  select array_agg(distinct es.farm_id) into v_farm_ids
  from jsonb_to_recordset(p_items) as s(egg_size_id uuid)
  join public.egg_sizes es on es.id = s.egg_size_id;

  if array_length(v_farm_ids, 1) <> 1 then
    raise exception 'A sale cannot mix egg sizes from different farms'
      using errcode = 'foreign_key_violation';
  end if;

  v_farm_id := v_farm_ids[1];

  -- The customer is the sale's second cross-farm reference. Same reasoning.
  if p_customer_id is not null then
    perform 1 from public.customers c
    where c.id = p_customer_id and c.farm_id = v_farm_id;

    if not found then
      raise exception 'Unknown customer for this farm' using errcode = 'foreign_key_violation';
    end if;
  end if;

  if p_flock_id is not null then
    perform 1 from public.flocks f
    where f.id = p_flock_id and f.farm_id = v_farm_id;

    if not found then
      raise exception 'Unknown flock for this farm' using errcode = 'foreign_key_violation';
    end if;
  end if;

  select round(coalesce(sum(
    coalesce(s.quantity_trays, 0) * coalesce(s.price_per_tray, 0)
    + coalesce(s.quantity_eggs, 0) * coalesce(s.price_per_egg, 0)
  ), 0), 2)
  into v_total
  from jsonb_to_recordset(p_items) as s(
    quantity_trays integer,
    quantity_eggs  integer,
    price_per_tray numeric,
    price_per_egg  numeric
  );

  /*
   * Recording more than the sale is worth would make every outstanding-balance
   * figure nonsense, and change handed back is not money the farm holds. So
   * the payment is capped at the total.
   */
  v_paid := least(round(coalesce(p_amount_paid, 0), 2), v_total);

  -- Mirrors derivePaymentStatus() in lib/domain/sales.ts.
  v_status := case
    when v_total = 0       then 'PAID'
    when v_paid = 0        then 'UNPAID'
    when v_paid >= v_total then 'PAID'
    else 'PARTIAL'
  end;

  insert into public.egg_sales (
    farm_id, flock_id, customer_id, sale_date,
    total_amount, amount_paid, payment_status, notes
  )
  values (
    v_farm_id, p_flock_id, p_customer_id, p_sale_date,
    v_total, v_paid, v_status, nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_sale_id;

  insert into public.egg_sale_items (
    sale_id, egg_size_id, quantity_eggs, quantity_trays,
    price_per_egg, price_per_tray, subtotal
  )
  select
    v_sale_id,
    s.egg_size_id,
    coalesce(s.quantity_eggs, 0),
    coalesce(s.quantity_trays, 0),
    coalesce(s.price_per_egg, 0),
    coalesce(s.price_per_tray, 0),
    round(
      coalesce(s.quantity_trays, 0) * coalesce(s.price_per_tray, 0)
      + coalesce(s.quantity_eggs, 0) * coalesce(s.price_per_egg, 0),
      2
    )
  from jsonb_to_recordset(p_items) as s(
    egg_size_id    uuid,
    quantity_eggs  integer,
    quantity_trays integer,
    price_per_egg  numeric,
    price_per_tray numeric
  )
  where coalesce(s.quantity_eggs, 0) > 0 or coalesce(s.quantity_trays, 0) > 0;

  return v_sale_id;
end;
$$;

grant execute on function public.record_egg_sale(date, jsonb, uuid, uuid, numeric, text)
  to authenticated;
