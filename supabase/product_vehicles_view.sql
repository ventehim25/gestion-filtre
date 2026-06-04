-- Vue : résumé des marques de véhicules compatibles par produit (concis)
create or replace view public.product_vehicles as
select
  product_id,
  (array_agg(distinct m order by m))[1:4] as makes,
  count(distinct m) as nb
from (
  select product_id, split_part(marque, ' (', 1) as m
  from public.applications
) s
group by product_id;

grant select on public.product_vehicles to anon, authenticated;
