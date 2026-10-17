-- Farm map position, captured from the farmer's device ("Use my current
-- location" in Farm settings or onboarding) while they're at the farm.
--
-- Used only for the weather forecast: when set, lib/data/weather.ts uses it
-- instead of geocoding the typed municipality/province. The app rounds to 3
-- decimals (~110 m) before saving -- plenty for a forecast grid kilometres
-- wide, and less exact than a full GPS fix.
--
-- location_label is the barangay/town found for that position (OpenStreetMap
-- Nominatim, lib/geo/nominatim.ts), shown instead of raw coordinates. Null
-- when the lookup found nothing or failed.
--
-- No policy change: farms_update already limits writes to people who can
-- manage the farm.

alter table public.farms
  add column latitude  numeric(7, 4),
  add column longitude numeric(7, 4),
  add column location_label text check (char_length(location_label) <= 200),
  add constraint farms_location_pair
    check ((latitude is null) = (longitude is null)),
  add constraint farms_latitude_range
    check (latitude is null or latitude between -90 and 90),
  add constraint farms_longitude_range
    check (longitude is null or longitude between -180 and 180);
