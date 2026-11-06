-- Quartier du client (dans sa ville) — à coller dans l'éditeur SQL Supabase.
-- Saisi dans la fiche client (suggestions = quartiers déjà utilisés dans la même ville), filtrable dans /clients.
alter table clients add column if not exists quartier text;

notify pgrst, 'reload schema';
