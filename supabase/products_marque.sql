-- Ajoute la marque sur la fiche produit (Filtron par défaut).
-- Idempotent : peut être collé plusieurs fois sans risque.
alter table products add column if not exists marque text not null default 'Filtron';

-- Recharge le cache PostgREST pour que l'app voie la colonne en écriture.
notify pgrst, 'reload schema';
