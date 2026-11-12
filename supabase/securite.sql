-- ============================================================
-- SÉCURITÉ FiltroPro (12/11/2026) — protège la base
--   Avant : tout le monde (même sans compte) pouvait lire, modifier ou effacer
--           clients, ventes, prospects, fournisseurs… avec la clé publique de l'appli.
--   Après : seules les personnes connectées ET autorisées ont accès.
--           Le public ne voit plus que le catalogue (sans les prix d'achat).
--
-- ⚠ AVANT de lancer ce fichier (sinon tu ne pourras plus entrer dans l'appli) :
--   1) Supabase > Authentication > Users > « Add user » > « Create new user »
--      ton email + un mot de passe solide, et coche « Auto Confirm User ».
--   2) Supabase > Authentication > Sign In / Providers (ou Settings) :
--      décoche « Allow new users to sign up » (personne d'autre ne peut créer de compte).
--   3) Remplace TON_EMAIL@exemple.com plus bas (étape 1) par l'email du compte créé.
--
-- Idempotent : on peut le relancer sans risque.
-- Retour en arrière (urgence) : supabase/securite_annuler.sql
-- ============================================================

-- 1. Liste des personnes autorisées (gérée ici, dans l'éditeur SQL, jamais depuis l'appli)
create table if not exists public.utilisateurs_autorises (
  email      text primary key,
  ajoute_le  timestamptz not null default now()
);
alter table public.utilisateurs_autorises enable row level security;
revoke all on public.utilisateurs_autorises from anon, authenticated;

insert into public.utilisateurs_autorises (email)
values (lower('TON_EMAIL@exemple.com'))   -- ← REMPLACE par ton email
on conflict do nothing;

-- 2. La personne connectée est-elle autorisée ?
create or replace function public.est_autorise()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.utilisateurs_autorises
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke execute on function public.est_autorise() from public, anon;
grant execute on function public.est_autorise() to authenticated;

-- 3. Supprimer toutes les anciennes règles « tout autoriser » des tables
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 4. Toutes les tables : accès complet pour l'équipe autorisée, rien pour le public
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'utilisateurs_autorises' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon', t.tablename);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t.tablename);
    execute format('create policy equipe on public.%I for all to authenticated using (public.est_autorise()) with check (public.est_autorise())', t.tablename);
  end loop;
end $$;

-- 5. Catalogue public (pages /c/…, /catalogue, /tarif, sitemap) : lecture seule,
--    seulement les colonnes utiles — JAMAIS prix_achat ni les notes.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ') into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'products'
    and column_name = any (array['id','reference','marque','categorie','stock','image_url','prix_vente','prix_promo','dimensions']);
  execute format('grant select (%s) on public.products to anon', cols);

  select string_agg(quote_ident(column_name), ', ') into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'equivalences'
    and column_name = any (array['id','product_id','marque','reference','stock','prix']);
  execute format('grant select (%s) on public.equivalences to anon', cols);
end $$;
grant select on public.applications to anon;

create policy catalogue_public on public.products     for select to anon using (true);
create policy catalogue_public on public.equivalences for select to anon using (true);
create policy catalogue_public on public.applications for select to anon using (true);

-- 6. Vues (product_vehicles, prospects_par_jour…) : elles respectent maintenant les règles
do $$
declare v record;
begin
  for v in select viewname from pg_views where schemaname = 'public' loop
    execute format('alter view public.%I set (security_invoker = true)', v.viewname);
    execute format('revoke all on public.%I from anon', v.viewname);
    execute format('grant select on public.%I to authenticated', v.viewname);
  end loop;
end $$;

-- 7. Fonctions de stock : réservées à l'équipe connectée
do $$
begin
  if to_regprocedure('public.decrement_stock(uuid, integer)') is not null then
    revoke execute on function public.decrement_stock(uuid, integer) from public, anon;
    grant execute on function public.decrement_stock(uuid, integer) to authenticated;
  end if;
  if to_regprocedure('public.decrement_equiv_stock(uuid, integer)') is not null then
    revoke execute on function public.decrement_equiv_stock(uuid, integer) from public, anon;
    grant execute on function public.decrement_equiv_stock(uuid, integer) to authenticated;
  end if;
end $$;

-- 8. Photos produits : tout le monde peut les voir, seule l'équipe peut en envoyer
drop policy if exists "produits_insert" on storage.objects;
drop policy if exists "produits_update" on storage.objects;
drop policy if exists "produits_delete" on storage.objects;
create policy "produits_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'produits' and public.est_autorise());
create policy "produits_update" on storage.objects for update to authenticated
  using (bucket_id = 'produits' and public.est_autorise())
  with check (bucket_id = 'produits' and public.est_autorise());
create policy "produits_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'produits' and public.est_autorise());

-- 9. Les futures tables ne seront plus ouvertes au public par défaut
alter default privileges in schema public revoke all on tables from anon;

notify pgrst, 'reload schema';

-- Vérification : doit afficher ton email
select email from public.utilisateurs_autorises;
