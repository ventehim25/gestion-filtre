-- ============================================================
-- MÉMOIRE DES VIN CONFIRMÉS (12/11/2026) — docs/VIN_ANALYSE.md
-- Quand le vendeur confirme « c'est cette voiture » pour un VIN, on retient la voiture et son code moteur.
-- La fois suivante, ce VIN donne directement les filtres (🟢), et les VIN de la même famille
-- (8 premiers caractères) sont proposés comme « probables » (🟠), toujours à confirmer.
-- Données techniques seulement : JAMAIS le nom, la plaque ou le téléphone du client (loi 09-08).
-- Idempotent. À coller dans l'éditeur SQL Supabase.
-- ============================================================

create table if not exists public.vin_connus (
  vin          text primary key,
  famille      text generated always as (left(vin, 8)) stored,
  marque       text not null,
  modele       text not null,
  moteur       text,
  code_moteur  text,
  annee_debut  text,
  annee_fin    text,
  puissance    text,
  confirme_le  timestamptz not null default now()
);
create index if not exists vin_connus_famille on public.vin_connus (famille);

-- Sécurité (même règle que les autres tables : équipe autorisée seulement)
alter table public.vin_connus enable row level security;
drop policy if exists equipe on public.vin_connus;
create policy equipe on public.vin_connus for all to authenticated
  using (public.est_autorise()) with check (public.est_autorise());
revoke all on public.vin_connus from anon;
grant select, insert, update, delete on public.vin_connus to authenticated;

notify pgrst, 'reload schema';
