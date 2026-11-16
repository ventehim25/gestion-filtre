-- 16/11/2026 — Nouvelles catégories de produits : distribution (BIBLE §8.30).
--   chaine_distribution · courroie_distribution · pompe_eau · kit_distribution
-- Idempotent : retrouve le nom réel de la contrainte sur « categorie » avant de la remplacer.
-- Aucune donnée n'est modifiée : seule la liste des catégories permises s'allonge.
do $$
declare
  con_name text;
begin
  for con_name in
    select conname from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%categorie%'
  loop
    execute format('alter table public.products drop constraint %I', con_name);
  end loop;
end $$;

alter table public.products add constraint products_categorie_check check (categorie in (
  'filtre_huile','filtre_air','filtre_carburant','filtre_habitacle','filtre_refroidissement',
  'huile_moteur',
  'chaine_distribution','courroie_distribution','pompe_eau','kit_distribution',
  'autre'
));

notify pgrst, 'reload schema';
