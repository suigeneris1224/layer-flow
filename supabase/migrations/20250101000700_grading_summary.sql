-- LayerFlow :: grading summary
--
-- Inventory is built from the egg size breakdown, not from eggs_collected,
-- because only graded eggs are sellable stock. That is the right rule, but it
-- means eggs a farmer has collected and not yet sorted are invisible: the
-- dashboard would show inventory far below what is physically in the shed and
-- look like eggs had vanished.
--
-- This view surfaces the gap so the UI can say so plainly.

create or replace view egg_grading_summary
with (security_invoker = true)
as
select
  p.farm_id,
  coalesce(sum(p.eggs_collected), 0)::bigint as eggs_collected,
  coalesce(sum(g.graded), 0)::bigint         as eggs_graded,
  greatest(coalesce(sum(p.eggs_collected), 0) - coalesce(sum(g.graded), 0), 0)::bigint
                                             as eggs_ungraded
from daily_production p
left join lateral (
  select sum(d.quantity) as graded
  from daily_egg_size_production d
  where d.daily_production_id = p.id
) g on true
group by p.farm_id;

grant select on egg_grading_summary to authenticated;
