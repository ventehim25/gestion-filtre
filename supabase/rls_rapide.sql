-- ============================================================
-- RÈGLES DE SÉCURITÉ PLUS RAPIDES (14/11/2026) — idempotent, ne supprime aucune donnée
-- Problème : connecté, « Par marque » restait bloqué (« Impossible de charger les modèles »).
-- La règle « equipe » appelait est_autorise() pour CHAQUE ligne lue : 218 956 lignes dans
-- applications depuis le 14/11 → la requête dépassait le temps permis par Supabase.
-- Solution (recommandée par Supabase) : (select public.est_autorise()) → posée UNE fois par requête.
-- Même sécurité qu'avant : seuls les emails de utilisateurs_autorises lisent et écrivent.
-- ============================================================

do $$
declare t record;
begin
  for t in select tablename from pg_policies where schemaname = 'public' and policyname = 'equipe' loop
    execute format('drop policy equipe on public.%I', t.tablename);
    execute format('create policy equipe on public.%I for all to authenticated using ((select public.est_autorise())) with check ((select public.est_autorise()))', t.tablename);
  end loop;
end $$;

-- Index pour les recherches de voitures (marque → modèle → moteur) et les filtres d'une voiture
create index if not exists applications_marque_modele on public.applications (marque, modele);
create index if not exists applications_product_id   on public.applications (product_id);

notify pgrst, 'reload schema';
