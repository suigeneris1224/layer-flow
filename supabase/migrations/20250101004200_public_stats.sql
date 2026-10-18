-- ---------------------------------------------------------------------------
-- public_stats :: anonymous usage totals for the homepage
-- ---------------------------------------------------------------------------
/**
 * Four totals across every real farm: how many farms, eggs recorded, hens in
 * active flocks, and provinces. Shown on the homepage (app/api/public-stats),
 * so it returns sums and counts only -- never a name, id or per-farm value.
 *
 * "Real" means a farm whose owner is not in p_excluded_emails (the team's own
 * and test accounts, from ADMIN_EMAILS) and that has recorded at least one
 * day of production, so signups that never used the app don't inflate it.
 *
 * SECURITY DEFINER because it reads across every farm and auth.users. Only
 * the service role may run it: the API route calls it server-side and caches
 * the result, so the public can't use it to load the database.
 */
create or replace function public.public_stats(p_excluded_emails text[])
returns table (farms bigint, eggs bigint, hens bigint, provinces bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with real_farms as (
    select f.id, f.province
    from public.farms f
    join auth.users u on u.id = f.owner_id
    where lower(coalesce(u.email, '')) <> all (
        select lower(btrim(e)) from unnest(coalesce(p_excluded_emails, '{}')) as e
      )
      and exists (select 1 from public.daily_production dp where dp.farm_id = f.id)
  )
  select
    (select count(*) from real_farms),
    (select coalesce(sum(dp.eggs_collected), 0)::bigint
       from public.daily_production dp
       where dp.farm_id in (select id from real_farms)),
    (select coalesce(sum(fl.current_hens), 0)::bigint
       from public.flocks fl
       where fl.farm_id in (select id from real_farms)
         and fl.status in ('GROWING', 'PRODUCING')),
    (select count(distinct lower(btrim(province)))
       from real_farms
       where btrim(province) <> '');
$$;

revoke all on function public.public_stats(text[]) from public, anon, authenticated;
grant execute on function public.public_stats(text[]) to service_role;
