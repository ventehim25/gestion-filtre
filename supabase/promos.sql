-- Prix promotionnel optionnel sur les produits.
-- À exécuter UNE FOIS dans l'éditeur SQL Supabase (Dashboard > SQL Editor).

alter table public.products add column if not exists prix_promo double precision;

NOTIFY pgrst, 'reload schema';
