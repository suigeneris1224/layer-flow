-- LayerFlow :: recording a payment against an existing sale
--
-- Sales are recorded once, at the point of sale, with whatever was paid that
-- day. Credit sales to sari-sari stores get settled later, sometimes in
-- installments, and until now there was no way to record that -- amount_paid
-- could only be set at creation time via record_egg_sale.
--
-- record_sale_payment adds to amount_paid and re-derives payment_status,
-- mirroring the same capping and status rules as record_egg_sale so the two
-- entry points can never disagree.

create or replace function public.record_sale_payment(
  p_sale_id uuid,
  p_amount  numeric
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_total    numeric(14, 2);
  v_paid     numeric(14, 2);
  v_new_paid numeric(14, 2);
  v_status   public.payment_status;
begin
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = 'check_violation';
  end if;

  -- RLS scopes this to the caller's own farm; a sale from another farm, or a
  -- deleted one, simply is not found here.
  select total_amount, amount_paid into v_total, v_paid
  from public.egg_sales
  where id = p_sale_id;

  if not found then
    raise exception 'Sale not found' using errcode = 'no_data_found';
  end if;

  -- Same capping rule as record_egg_sale: never record more than the sale is
  -- worth. Change handed back is not money the farm holds.
  v_new_paid := least(round(v_paid + p_amount, 2), v_total);

  -- Mirrors derivePaymentStatus() in lib/domain/sales.ts.
  v_status := case
    when v_total = 0          then 'PAID'
    when v_new_paid = 0       then 'UNPAID'
    when v_new_paid >= v_total then 'PAID'
    else 'PARTIAL'
  end;

  update public.egg_sales
  set amount_paid = v_new_paid, payment_status = v_status, updated_at = now()
  where id = p_sale_id;
end;
$$;

grant execute on function public.record_sale_payment(uuid, numeric) to authenticated;
