-- LayerFlow :: vaccination schedule
--
-- The farm's own vaccination programme, one row per dose, keyed by bird age.
-- LayerFlow ships no preset programme and suggests no vaccine: the farm types
-- in what its vet gave it, and the app only does the date math (see
-- lib/domain/vaccination-schedule.ts). Same stance as lib/domain/alerts.ts.

-- ---------------------------------------------------------------------------
-- Bird age at placement
-- ---------------------------------------------------------------------------
-- Many farms buy ready-to-lay pullets at 16-18 weeks, so placement_date alone
-- is not the birds' age. Default 0 = day-old chicks, which is what every
-- existing flock's due dates were implicitly assuming anyway.
alter table flocks
  add column age_at_placement_days integer not null default 0
    check (age_at_placement_days >= 0 and age_at_placement_days <= 1000);

-- ---------------------------------------------------------------------------
-- vaccination_schedule_items
-- ---------------------------------------------------------------------------
create table vaccination_schedule_items (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references farms (id) on delete cascade,
  vaccine_name  text not null check (length(btrim(vaccine_name)) > 0),
  age_days      integer not null check (age_days > 0 and age_days <= 1000),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index vaccination_schedule_items_farm_age_idx
  on vaccination_schedule_items (farm_id, age_days);

create trigger vaccination_schedule_items_touch
  before update on vaccination_schedule_items
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Link a recorded dose to the scheduled dose it fulfils
-- ---------------------------------------------------------------------------
-- Nullable: ad-hoc vaccinations (and every existing row) fulfil no schedule
-- item. `set null` so deleting a dose from the programme never deletes the
-- record that it was given.
alter table vaccinations
  add column schedule_item_id uuid references vaccination_schedule_items (id) on delete set null;

create index vaccinations_schedule_item_idx on vaccinations (schedule_item_id)
  where schedule_item_id is not null;

-- The schedule item must belong to the same farm as the vaccination, for the
-- same reason app.assert_flock_farm_matches() exists: a hand-written insert
-- could otherwise point at another farm's programme.
create or replace function app.assert_schedule_item_farm_matches()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.schedule_item_id is not null and not exists (
    select 1 from public.vaccination_schedule_items s
    where s.id = new.schedule_item_id and s.farm_id = new.farm_id
  ) then
    raise exception 'Schedule item % does not belong to farm %', new.schedule_item_id, new.farm_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger vaccinations_schedule_item_farm_guard
  before insert or update of schedule_item_id, farm_id on vaccinations
  for each row execute function app.assert_schedule_item_farm_matches();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- The programme is farm configuration, like alert_thresholds: any member reads
-- it (the worker needs to see what is due), MANAGER+ edits it. Recording the
-- dose itself stays on vaccinations_write (any member). Plan gating
-- (vaccination_schedule) is app-layer, as everywhere else.
alter table vaccination_schedule_items enable row level security;

create policy vaccination_schedule_items_select on vaccination_schedule_items
  for select to authenticated using (app.is_farm_member(farm_id));

create policy vaccination_schedule_items_write on vaccination_schedule_items
  for all to authenticated
  using (app.can_manage_farm(farm_id))
  with check (app.can_manage_farm(farm_id));
