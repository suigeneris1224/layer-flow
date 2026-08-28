-- LayerFlow :: development seed
--
-- Runs automatically after migrations on `supabase db reset`.
-- DEVELOPMENT ONLY. Never run this against a production project.
--
-- Sign in with:
--   email    demo@layerflow.ph
--   password demo123456

-- pgcrypto lives in `extensions` on Supabase but in `public` on a plain
-- Postgres. Searching both means crypt() resolves either way.
set search_path = public, extensions;

do $$
declare
  v_user_id     uuid := '11111111-1111-4111-8111-111111111111';
  v_farm_id     uuid := '22222222-2222-4222-8222-222222222222';
  v_house_id    uuid := '33333333-3333-4333-8333-333333333333';
  v_flock_id    uuid := '44444444-4444-4444-8444-444444444444';

  v_small_id       uuid;
  v_medium_id      uuid;
  v_large_id       uuid;
  v_extra_large_id uuid;
  v_jumbo_id       uuid;

  v_customer_a  uuid := '55555555-5555-4555-8555-555555555551';
  v_customer_b  uuid := '55555555-5555-4555-8555-555555555552';

  v_start_date  date := current_date - 29;
  v_day         date;
  v_index       integer;
  v_hens        integer;
  v_deaths      integer;
  v_eggs        integer;
  v_production_id uuid;
  v_small integer; v_medium integer; v_large integer; v_xl integer; v_jumbo integer;
  v_sale_id uuid;
begin
  -- -------------------------------------------------------------------------
  -- Demo account. The profile row is created by the on_auth_user_created
  -- trigger, so it is not inserted here.
  -- -------------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    'demo@layerflow.ph', crypt('demo123456', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Farmer"}'::jsonb,
    '', '', '', ''
  )
  on conflict (id) do nothing;

  -- GoTrue needs a matching identity row or password sign-in fails.
  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  values (
    v_user_id::text, v_user_id,
    format('{"sub":"%s","email":"demo@layerflow.ph"}', v_user_id)::jsonb,
    'email', now(), now(), now()
  )
  on conflict (provider, provider_id) do nothing;

  -- -------------------------------------------------------------------------
  -- Farm. Triggers add the OWNER membership and the FREE subscription.
  -- -------------------------------------------------------------------------
  insert into farms (id, name, barangay, municipality, province, owner_id)
  values (v_farm_id, 'San Remigio Egg Farm', 'Poblacion', 'San Remigio', 'Cebu', v_user_id)
  on conflict (id) do nothing;

  -- The demo is more useful on a paid plan, so sales and reports are visible.
  update subscriptions
  set plan = 'STARTER', status = 'ACTIVE',
      current_period_start = now(), current_period_end = now() + interval '30 days'
  where farm_id = v_farm_id;

  insert into houses (id, farm_id, name, capacity, notes)
  values (v_house_id, v_farm_id, 'House A', 1500, 'Open-sided, east facing')
  on conflict (id) do nothing;

  -- ~32 weeks old, so the flock is at peak lay.
  insert into flocks (
    id, farm_id, house_id, name, breed, initial_hens, current_hens,
    placement_date, start_laying_date, status
  )
  values (
    v_flock_id, v_farm_id, v_house_id, 'Flock #001', 'ISA Brown', 1000, 1000,
    current_date - (32 * 7), current_date - (14 * 7), 'PRODUCING'
  )
  on conflict (id) do nothing;

  perform app.seed_default_egg_sizes(v_farm_id);

  select id into v_small_id       from egg_sizes where farm_id = v_farm_id and code = 'SMALL';
  select id into v_medium_id      from egg_sizes where farm_id = v_farm_id and code = 'MEDIUM';
  select id into v_large_id       from egg_sizes where farm_id = v_farm_id and code = 'LARGE';
  select id into v_extra_large_id from egg_sizes where farm_id = v_farm_id and code = 'EXTRA_LARGE';
  select id into v_jumbo_id       from egg_sizes where farm_id = v_farm_id and code = 'JUMBO';

  -- -------------------------------------------------------------------------
  -- Prices, effective from the start of the seeded history.
  -- -------------------------------------------------------------------------
  insert into egg_prices (farm_id, egg_size_id, price_per_egg, price_per_tray, effective_from)
  values
    (v_farm_id, v_small_id,       5.50, 165.00, v_start_date),
    (v_farm_id, v_medium_id,      6.00, 180.00, v_start_date),
    (v_farm_id, v_large_id,       7.00, 210.00, v_start_date),
    (v_farm_id, v_extra_large_id, 7.50, 225.00, v_start_date),
    (v_farm_id, v_jumbo_id,       8.00, 240.00, v_start_date)
  on conflict do nothing;

  insert into customers (id, farm_id, name, phone, address)
  values
    (v_customer_a, v_farm_id, 'Tindahan ni Aling Maria', '0917 555 0101', 'Poblacion, San Remigio'),
    (v_customer_b, v_farm_id, 'Cebu North Bakery', '0932 555 0144', 'Bogo City, Cebu')
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- 30 days of production, feed and mortality.
  --
  -- Deterministic rather than random so every developer sees the same farm
  -- and the same alerts.
  -- -------------------------------------------------------------------------
  for v_index in 0..29 loop
    v_day := v_start_date + v_index;

    -- Two birds most days, one on days 15 and 30: 58 losses, 1000 -> 942.
    v_deaths := case when (v_index + 1) % 15 = 0 then 1 else 2 end;
    v_hens := 1000 - (
      select coalesce(sum(case when (i + 1) % 15 = 0 then 1 else 2 end), 0)
      from generate_series(0, v_index - 1) as i
    );

    -- Around 87% lay with a gentle ripple. A healthy flock at peak, which is
    -- what the demo should show. Alert behaviour is covered by unit tests
    -- rather than by sabotaging the sample farm.
    v_eggs := round(v_hens * (0.87 + 0.015 * sin(v_index::numeric)));

    insert into daily_production (
      farm_id, flock_id, production_date, hens_present, eggs_collected,
      broken_eggs, dirty_eggs, average_egg_weight, mortality, notes
    )
    values (
      v_farm_id, v_flock_id, v_day, v_hens, v_eggs,
      (v_eggs * 0.012)::integer, (v_eggs * 0.008)::integer, 62.5, v_deaths, null
    )
    on conflict (flock_id, production_date) do update
      set eggs_collected = excluded.eggs_collected
    returning id into v_production_id;

    -- Roughly S 15 / M 34 / L 43 / XL 7 / J 1. Large absorbs the rounding so
    -- the breakdown always totals exactly the eggs collected.
    v_small := round(v_eggs * 0.15);
    v_medium := round(v_eggs * 0.34);
    v_xl := round(v_eggs * 0.07);
    v_jumbo := round(v_eggs * 0.01);
    v_large := v_eggs - v_small - v_medium - v_xl - v_jumbo;

    insert into daily_egg_size_production (daily_production_id, egg_size_id, quantity)
    values
      (v_production_id, v_small_id, v_small),
      (v_production_id, v_medium_id, v_medium),
      (v_production_id, v_large_id, v_large),
      (v_production_id, v_extra_large_id, v_xl),
      (v_production_id, v_jumbo_id, v_jumbo)
    on conflict (daily_production_id, egg_size_id) do update
      set quantity = excluded.quantity;

    -- ~0.12 kg per hen per day, with feed dearer in the last week.
    insert into feed_usage (
      farm_id, flock_id, daily_production_id, usage_date,
      quantity_kg, cost_per_kg, total_cost, feed_type
    )
    values (
      v_farm_id, v_flock_id, v_production_id, v_day,
      round((v_hens * 0.12)::numeric, 1),
      case when v_index >= 23 then 30.50 else 28.00 end,
      round(round((v_hens * 0.12)::numeric, 1) * case when v_index >= 23 then 30.50 else 28.00 end, 2),
      'Layer mash'
    )
    on conflict (daily_production_id) where daily_production_id is not null
    do update set quantity_kg = excluded.quantity_kg;

    insert into mortality_records (
      farm_id, flock_id, daily_production_id, record_date, quantity, reason
    )
    values (v_farm_id, v_flock_id, v_production_id, v_day, v_deaths, 'Routine culling')
    on conflict (daily_production_id) do update set quantity = excluded.quantity;

    -- Sell about 92% of the day's collection. A real layer farm moves nearly
    -- everything daily -- eggs do not keep, and a month of stock piling up
    -- would mean something had gone badly wrong. The remainder is working
    -- inventory.
    -- The header goes in settled at zero and is restated once the lines are
    -- priced: egg_sales_payment_consistent is checked per statement, and
    -- "PARTIAL of nothing" is a contradiction the constraint rightly refuses.
    insert into egg_sales (
      farm_id, flock_id, customer_id, sale_date, total_amount, amount_paid, payment_status
    )
    values (
      v_farm_id, v_flock_id,
      case when v_index % 2 = 0 then v_customer_a else v_customer_b end,
      v_day, 0, 0, 'PAID'
    )
    returning id into v_sale_id;

    -- Prices are copied onto the line as they stood that day. Re-pricing the
    -- farm later must never restate a past sale.
    insert into egg_sale_items (
      sale_id, egg_size_id, quantity_eggs, quantity_trays, price_per_egg, price_per_tray, subtotal
    )
    select
      v_sale_id,
      s.size_id,
      round(s.qty * 0.92)::integer % 30,
      round(s.qty * 0.92)::integer / 30,
      s.per_egg,
      s.per_tray,
      round(
        (round(s.qty * 0.92)::integer / 30) * s.per_tray
        + (round(s.qty * 0.92)::integer % 30) * s.per_egg,
        2
      )
    from (values
      (v_small_id,       v_small,  5.50, 165.00),
      (v_medium_id,      v_medium, 6.00, 180.00),
      (v_large_id,       v_large,  7.00, 210.00),
      (v_extra_large_id, v_xl,     7.50, 225.00),
      (v_jumbo_id,       v_jumbo,  8.00, 240.00)
    ) as s(size_id, qty, per_egg, per_tray)
    where round(s.qty * 0.92)::integer > 0;

    /*
     * Total, payment and status in one statement, so the row is never
     * momentarily inconsistent. The last two days are left owing on purpose --
     * one part-paid, one not paid at all -- so the outstanding balance on the
     * sales screen has something real to show without hand-entering data.
     * Eggs go out on credit to sari-sari stores constantly; a demo farm where
     * everything is settled would misrepresent the job.
     */
    update egg_sales s
    set total_amount = t.total,
        amount_paid = case
          when v_index = 29 then 0
          when v_index = 28 then round(t.total / 2, 2)
          else t.total
        end,
        payment_status = (case
          when v_index = 29 then 'UNPAID'
          when v_index = 28 then 'PARTIAL'
          else 'PAID'
        end)::payment_status
    from (
      select coalesce(sum(subtotal), 0) as total
      from egg_sale_items where sale_id = v_sale_id
    ) as t
    where s.id = v_sale_id;
  end loop;

  -- -------------------------------------------------------------------------

  -- -------------------------------------------------------------------------
  -- Expenses. FEED is intentionally absent: feed is already costed through
  -- feed_usage, and counting both would double-charge the farm.
  -- -------------------------------------------------------------------------
  insert into expenses (farm_id, flock_id, category, description, amount, expense_date)
  values
    (v_farm_id, v_flock_id, 'LABOR',       'Weekly helper wage',      1500.00, current_date - 24),
    (v_farm_id, v_flock_id, 'LABOR',       'Weekly helper wage',      1500.00, current_date - 17),
    (v_farm_id, v_flock_id, 'LABOR',       'Weekly helper wage',      1500.00, current_date - 10),
    (v_farm_id, v_flock_id, 'LABOR',       'Weekly helper wage',      1500.00, current_date - 3),
    (v_farm_id, v_flock_id, 'ELECTRICITY', 'Monthly electricity',     2400.00, current_date - 12),
    (v_farm_id, v_flock_id, 'WATER',       'Water delivery',           600.00, current_date - 9),
    (v_farm_id, v_flock_id, 'VACCINE',     'Newcastle disease booster', 850.00, current_date - 18),
    (v_farm_id, v_flock_id, 'TRANSPORT',   'Delivery to Bogo City',    450.00, current_date - 3),
    (v_farm_id, v_flock_id, 'EQUIPMENT',   'Replacement egg trays',    980.00, current_date - 5)
  on conflict do nothing;

  -- -------------------------------------------------------------------------
  -- A couple of stock corrections, so the inventory screen has history to show
  -- and the reason codes are exercised. Eggs really do get broken and eaten.
  -- -------------------------------------------------------------------------
  insert into egg_inventory_adjustments (
    farm_id, egg_size_id, adjustment_date, quantity_eggs, reason, created_by
  )
  values
    (v_farm_id, v_large_id,  current_date - 4, -18, 'SPOILAGE: cracked in the crate', v_user_id),
    (v_farm_id, v_medium_id, current_date - 2,  -6, 'OWN_USE: family breakfast',      v_user_id)
  on conflict do nothing;

  insert into vaccinations (farm_id, flock_id, vaccination_date, vaccine_name, notes)
  values (v_farm_id, v_flock_id, current_date - 18, 'Newcastle Disease (La Sota)', 'Drinking water')
  on conflict do nothing;

  raise notice 'LayerFlow seed complete. Sign in as demo@layerflow.ph / demo123456';
end;
$$;
