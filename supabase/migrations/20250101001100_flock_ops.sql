-- LayerFlow :: flock operations
-- Standalone mortality, feed and vaccination entry brought the ad-hoc write
-- paths into the app for the first time. Until now every row in these tables
-- was written by record_daily_production, which derives farm_id from the flock
-- and can therefore never disagree with it. A hand-written insert can, so the
-- guards the other child tables already had are added here.

-- ---------------------------------------------------------------------------
-- Farm consistency guard
-- ---------------------------------------------------------------------------
-- Mirrors app.assert_flock_house_same_farm() in the core migration: the parent
-- flock must live in the farm the row claims. One function serves all three
-- tables because they all carry the same (farm_id, flock_id) pair.
create or replace function app.assert_flock_farm_matches()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.flocks f
    where f.id = new.flock_id and f.farm_id = new.farm_id
  ) then
    raise exception 'Flock % does not belong to farm %', new.flock_id, new.farm_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger mortality_flock_farm_guard
  before insert or update of flock_id, farm_id on mortality_records
  for each row execute function app.assert_flock_farm_matches();

create trigger feed_usage_flock_farm_guard
  before insert or update of flock_id, farm_id on feed_usage
  for each row execute function app.assert_flock_farm_matches();

create trigger vaccinations_flock_farm_guard
  before insert or update of flock_id, farm_id on vaccinations
  for each row execute function app.assert_flock_farm_matches();

-- ---------------------------------------------------------------------------
-- Derived hen count: recalculate both sides of a move
-- ---------------------------------------------------------------------------
-- The original body took coalesce(new.flock_id, old.flock_id), which picks NEW
-- first. Moving a mortality record between flocks therefore recalculated only
-- the destination and left the source overstated forever. Nothing in the app
-- moved rows before; the standalone mortality editor can.
--
-- Branching on TG_OP rather than reading both records unconditionally, for the
-- same reason app.assert_egg_size_total_within_collected() does: NEW is not
-- assigned on DELETE, and OLD is not assigned on INSERT.
create or replace function app.recalc_flock_hens()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  targets uuid[];
  target  uuid;
begin
  if tg_op = 'INSERT' then
    targets := array[new.flock_id];
  elsif tg_op = 'DELETE' then
    targets := array[old.flock_id];
  else
    targets := array[new.flock_id];
    if old.flock_id is distinct from new.flock_id then
      targets := targets || old.flock_id;
    end if;
  end if;

  foreach target in array targets
  loop
    update public.flocks f
    set current_hens = greatest(
      f.initial_hens - coalesce((
        select sum(m.quantity)
        from public.mortality_records m
        where m.flock_id = target
      ), 0),
      0
    )
    where f.id = target;
  end loop;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vaccinations: the farm-scoped index every list query needs
-- ---------------------------------------------------------------------------
-- The table shipped with only a flock index, but /health and the alerts feed
-- both read "every vaccination on this farm, newest first". Its siblings
-- (mortality_records, feed_usage) already have the matching pair.
create index vaccinations_farm_date_idx on vaccinations (farm_id, vaccination_date desc);

-- ---------------------------------------------------------------------------
-- Avatar storage
-- ---------------------------------------------------------------------------
-- profiles.avatar_url has existed since the core migration but nothing wrote
-- it; the topbar fell back to text initials. The bucket is public-read so a
-- plain <img src> works without signing every request, and writes are fenced
-- to a folder named for the uploader's own uid: avatars/<user id>/<file>.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_read_all"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
