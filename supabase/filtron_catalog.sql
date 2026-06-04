-- ============================================================
-- CATALOGUE FILTRON — plages de références (base + variante /1)
-- Entrées catalogue : prix par défaut, stock 0 (à ajuster par l'utilisateur)
-- ============================================================

-- FILTRES À HUILE — OE640 → OE689
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min)
select 'Filtre huile Filtron ' || ref, 'فلتر زيت فيلترون ' || ref, ref, 'filtre_huile', 18, 30, 0, 2
from (
  select 'OE' || n::text || s as ref
  from generate_series(640, 689) as g(n)
  cross join (values (''), ('/1')) as v(s)
) t
on conflict (reference) do nothing;

-- FILTRES À HUILE — OP520 → OP569
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min)
select 'Filtre huile Filtron ' || ref, 'فلتر زيت فيلترون ' || ref, ref, 'filtre_huile', 18, 30, 0, 2
from (
  select 'OP' || n::text || s as ref
  from generate_series(520, 569) as g(n)
  cross join (values (''), ('/1')) as v(s)
) t
on conflict (reference) do nothing;

-- FILTRES À AIR — AP060 → AP109
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min)
select 'Filtre air Filtron ' || ref, 'فلتر هواء فيلترون ' || ref, ref, 'filtre_air', 14, 24, 0, 2
from (
  select 'AP' || lpad(n::text, 3, '0') || s as ref
  from generate_series(60, 109) as g(n)
  cross join (values (''), ('/1')) as v(s)
) t
on conflict (reference) do nothing;

-- FILTRES À CARBURANT — PP840 → PP889
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min)
select 'Filtre carburant Filtron ' || ref, 'فلتر وقود فيلترون ' || ref, ref, 'filtre_carburant', 20, 35, 0, 2
from (
  select 'PP' || n::text || s as ref
  from generate_series(840, 889) as g(n)
  cross join (values (''), ('/1')) as v(s)
) t
on conflict (reference) do nothing;

-- FILTRES HABITACLE — K1160 → K1209
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min)
select 'Filtre habitacle Filtron ' || ref, 'فلتر مقصورة فيلترون ' || ref, ref, 'filtre_habitacle', 15, 27, 0, 2
from (
  select 'K' || n::text || s as ref
  from generate_series(1160, 1209) as g(n)
  cross join (values (''), ('/1')) as v(s)
) t
on conflict (reference) do nothing;
