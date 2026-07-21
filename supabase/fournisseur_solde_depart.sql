-- Solde de départ d'un fournisseur (onboarding depuis le cahier) — Bible §5.
-- À coller tel quel dans l'éditeur SQL : https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new

-- Convention : montant que TU dois au fournisseur au démarrage.
--   > 0  → tu lui dois (ajoute à « reste à payer »)
--   < 0  → il te doit (ex. -500 = il te doit 500)
alter table fournisseurs add column if not exists solde_depart numeric not null default 0;

notify pgrst, 'reload schema';
