-- ============================================================
-- APPLICATIONS : une ligne par VERSION de moteur (BIBLE §8.13, 13/11/2026)
-- Avant : unique (product_id, marque, modele, moteur) → un filtre ne pouvait être lié qu'à UNE version de
-- « Duster I 1.5 dCi (HS) », alors que Filtron en liste plusieurs (K9K 856, K9K 896, K9K 796…).
-- Résultat : des versions sans filtre à huile ou à carburant dans le catalogue.
-- Après : unique (product_id, marque, modele, moteur, code_moteur, annee_debut). Les doublons exacts restent
-- interdits. Rien n'est supprimé : la nouvelle règle est plus large que l'ancienne, les données actuelles la respectent.
-- Idempotent : peut être recollé sans risque.
-- ============================================================

alter table public.applications drop constraint if exists applications_product_id_marque_modele_moteur_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'applications_version_unique') then
    alter table public.applications
      add constraint applications_version_unique
      unique nulls not distinct (product_id, marque, modele, moteur, code_moteur, annee_debut);
  end if;
end $$;

-- Pour le catalogue par marque (marque → modèle → moteur)
create index if not exists idx_app_marque_modele on public.applications (marque, modele);

NOTIFY pgrst, 'reload schema';

-- Vérification (doit afficher applications_version_unique) :
select conname from pg_constraint where conrelid = 'public.applications'::regclass and contype = 'u';
