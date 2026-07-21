-- Bon (vente) : j'ai payé le fournisseur (dinoun) pour cette marchandise — roulement bon par bon.
-- À coller tel quel dans l'éditeur SQL : https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new

-- false = pas encore payé à dinoun (le coût reste dû au fournisseur)
-- true  = j'ai payé dinoun pour ce bon → quand le garage me verse, tout est à moi
alter table sales add column if not exists fournisseur_paye boolean not null default false;

notify pgrst, 'reload schema';
