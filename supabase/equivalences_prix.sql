-- Prix par marque sur les équivalences (Flag, Mann, Wix, Filtrex…).
-- À exécuter UNE FOIS dans l'éditeur SQL Supabase (Dashboard > SQL Editor).

alter table public.equivalences add column if not exists prix double precision;

NOTIFY pgrst, 'reload schema';
