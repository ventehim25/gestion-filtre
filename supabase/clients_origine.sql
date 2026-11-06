-- Origine du client — à coller dans l'éditeur SQL Supabase.
-- 'terrain' = contact pris en déplacement (tous les clients existants) ;
-- 'prospection' = prospect de /prospects devenu client en passant sa 1re commande.
alter table clients add column if not exists origine text not null default 'terrain';

notify pgrst, 'reload schema';
