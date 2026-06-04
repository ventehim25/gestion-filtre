-- Table des garages de tournée (carte interactive).
-- À exécuter UNE FOIS dans l'éditeur SQL Supabase (Dashboard > SQL Editor).
-- RLS allow-all : cohérent avec le reste du schéma (app mono-utilisateur).

create table if not exists public.garages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  nom           text not null,
  telephone     text,
  ville         text,
  region        text,
  latitude      double precision not null,
  longitude     double precision not null,
  statut        text not null default 'a_livrer',  -- a_livrer | preparee | livre | reporte
  note          text,                                -- pense-bête / commentaire libre
  refs_demandees text,                               -- références à apporter au prochain passage (texte libre, 1 par ligne)
  photo_url     text,                                -- photo de la devanture (data URL compressée)
  jour          integer                              -- jour de tournée assigné (optionnel, calculé côté app)
);

create index if not exists garages_statut_idx on public.garages (statut);
create index if not exists garages_region_idx on public.garages (region);

alter table public.garages enable row level security;

drop policy if exists "garages_all" on public.garages;
create policy "garages_all" on public.garages
  for all using (true) with check (true);
