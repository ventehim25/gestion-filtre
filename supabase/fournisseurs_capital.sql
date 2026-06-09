-- Évolution : type de fournisseur (capital / crédit) + source du fournisseur par ligne de vente.
-- À exécuter UNE FOIS dans l'éditeur SQL Supabase (Dashboard > SQL Editor).

-- 1) Type de fournisseur : 'capital' (mon argent, ex filtropro) ou 'credit' (à rembourser, ex dinoun)
alter table public.fournisseurs add column if not exists type text not null default 'credit';

-- 2) Source : à quelle "poche" appartient chaque article vendu
alter table public.sale_items add column if not exists fournisseur_id uuid references public.fournisseurs(id) on delete set null;

-- 3) Marque filtropro comme capital (ajuste si besoin)
update public.fournisseurs set type = 'capital' where lower(nom) like '%filtropro%';

-- 4) Recharge le cache de l'API
NOTIFY pgrst, 'reload schema';
