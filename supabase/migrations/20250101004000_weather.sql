-- LayerFlow :: weather snapshots
--
-- One cached forecast per farm, refreshed at most every few hours by the app
-- (lib/data/weather.ts). OpenNext on Cloudflare has no persistent fetch cache
-- here (open-next.config.ts), so the database is the cache.
--
-- The location is geocoded from the farm's municipality + province and stored
-- with the key it was resolved from, so editing the farm's address simply
-- makes the next read re-geocode -- no farm action needs to know about weather.
--
-- Weather data: Open-Meteo (open-meteo.com), CC BY 4.0.

create table weather_snapshots (
  farm_id         uuid primary key references farms (id) on delete cascade,
  -- "municipality|province" the coordinates below were resolved from.
  location_key    text not null,
  location_label  text,
  latitude        numeric(8, 5),
  longitude       numeric(8, 5),
  fetched_at      timestamptz not null default now(),
  -- Reduced to the fields the app uses (lib/weather/open-meteo.ts):
  -- { days: [{ date, maxTempC, rainChancePct, peakHeatIndexC, peakHour }] }
  forecast        jsonb not null default '{}'::jsonb,
  -- { days: [{ date, maxTempC }] }, roughly the last 90 days.
  daily_history   jsonb not null default '{}'::jsonb
);

alter table weather_snapshots enable row level security;

-- Any member reads their farm's weather. No write policy for `authenticated`:
-- only the server writes, with the service-role client, after it has checked
-- the caller's farm membership and plan itself (lib/data/weather.ts).
create policy weather_snapshots_select on weather_snapshots
  for select to authenticated using (app.is_farm_member(farm_id));
