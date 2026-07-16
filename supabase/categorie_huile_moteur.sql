-- Ajoute "huile_moteur" aux catégories de produits autorisées.
-- Idempotent : retrouve le nom réel de la contrainte existante avant de la remplacer.
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.products'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%categorie%';
  if con_name is not null then
    execute format('alter table public.products drop constraint %I', con_name);
  end if;
end $$;

alter table public.products add constraint products_categorie_check check (categorie in (
  'filtre_huile','filtre_air','filtre_carburant','filtre_habitacle','filtre_refroidissement','huile_moteur','autre'
));

notify pgrst, 'reload schema';
