-- Localisation exacte du local d'un client (GPS) — à coller dans l'éditeur SQL Supabase.
-- Remplie depuis la fiche client : « Ma position actuelle », lien Google Maps collé, ou clic sur la carte.
alter table clients add column if not exists latitude double precision;
alter table clients add column if not exists longitude double precision;

notify pgrst, 'reload schema';
