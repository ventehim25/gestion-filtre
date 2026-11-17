-- Type de véhicule de chaque fiche : 'voiture' (voitures + utilitaires) ou 'camion' (poids lourds, bus).
-- Calculé par scripts/classer_vehicules.mjs (règle de src/lib/vehicleType.ts : préfixes Filtron + marques compatibles).
-- Sert à ne charger que les voitures dans Vente / Réception / Produits (bouton 🚛 Camions pour le reste) — BIBLE §8.37.
-- Idempotent. Aucune donnée existante modifiée (tout le monde part en 'voiture', le script classe ensuite).

alter table public.products add column if not exists vehicule text not null default 'voiture';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_vehicule_check') then
    alter table public.products add constraint products_vehicule_check check (vehicule in ('voiture', 'camion'));
  end if;
end $$;
create index if not exists products_vehicule_idx on public.products (vehicule);

notify pgrst, 'reload schema';

-- Vérification (doit afficher « vehicule ») :
select column_name from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'vehicule';
