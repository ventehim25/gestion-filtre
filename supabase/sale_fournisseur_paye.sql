-- Roulement bon par bon : marquer un bon « fournisseur (dinoun) payé », et que ça
-- descende automatiquement ta dette côté Fournisseurs.
-- À coller tel quel dans l'éditeur SQL : https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new

-- 1) Sur le bon (vente) : ai-je payé le fournisseur pour cette marchandise ?
alter table sales add column if not exists fournisseur_paye boolean not null default false;

-- 2) Lier un paiement (avance) au bon qui l'a déclenché, pour pouvoir l'annuler si je décoche.
alter table avances add column if not exists sale_id uuid references sales(id) on delete cascade;

notify pgrst, 'reload schema';
