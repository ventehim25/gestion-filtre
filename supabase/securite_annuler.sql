-- ============================================================
-- URGENCE SEULEMENT : annule supabase/securite.sql (la base redevient ouverte à tous).
-- À utiliser uniquement si l'appli ne marche plus après la sécurisation, le temps de corriger.
-- ============================================================

-- Règles de sécurité supprimées
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Ancien fonctionnement : tout autorisé pour tout le monde
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'utilisateurs_autorises' loop
    execute format('grant all on public.%I to anon, authenticated', t.tablename);
    execute format('create policy tout_autoriser on public.%I for all using (true) with check (true)', t.tablename);
  end loop;
end $$;

do $$
declare v record;
begin
  for v in select viewname from pg_views where schemaname = 'public' loop
    execute format('grant select on public.%I to anon, authenticated', v.viewname);
  end loop;
end $$;

grant execute on function public.decrement_stock(uuid, integer) to anon;
grant execute on function public.decrement_equiv_stock(uuid, integer) to anon;

drop policy if exists "produits_insert" on storage.objects;
drop policy if exists "produits_update" on storage.objects;
drop policy if exists "produits_delete" on storage.objects;
create policy "produits_insert" on storage.objects for insert with check (bucket_id = 'produits');
create policy "produits_update" on storage.objects for update using (bucket_id = 'produits') with check (bucket_id = 'produits');

alter default privileges in schema public grant all on tables to anon;

-- L'appli ne demandera plus de connexion
drop function if exists public.est_autorise();
drop table if exists public.utilisateurs_autorises;

notify pgrst, 'reload schema';
