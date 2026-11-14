-- ============================================================
-- 14/11/2026 — UN SEUL COLLAGE pour trois nouveautés (idempotent : on peut le recoller sans risque)
--   A. Tournées prévues : prévenir les clients la veille (même contenu que tournees_prevues.sql)
--   B. 4 catalogues de prix : garages & stations (prix de base), particuliers, location de voitures,
--      magasins de pièces. Prix calculés avec un pourcentage, ou corrigés à la main par article.
--   C. Huile moteur par voiture (viscosité, norme, litres), source Liqui Moly / Castrol.
-- Aucune donnée existante n'est supprimée. À coller dans l'éditeur SQL Supabase, puis « Run ».
-- ============================================================

-- ---------- A. TOURNÉES PRÉVUES ----------
create table if not exists public.tournees_prevues (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  date_tournee  date not null,
  villes        text[] not null default '{}',
  message       text not null default '',
  envoyes       text[] not null default '{}'   -- id des clients déjà prévenus
);
create index if not exists tournees_prevues_date on public.tournees_prevues (date_tournee);
alter table public.tournees_prevues enable row level security;
drop policy if exists equipe on public.tournees_prevues;
create policy equipe on public.tournees_prevues for all to authenticated
  using (public.est_autorise()) with check (public.est_autorise());
revoke all on public.tournees_prevues from anon;
grant select, insert, update, delete on public.tournees_prevues to authenticated;

-- ---------- B. 4 CATALOGUES DE PRIX ----------
-- Réglages partagés (PC + téléphone + pages publiques). Seuls les pourcentages sont lisibles par le public.
create table if not exists public.reglages (
  cle         text primary key,
  valeur      jsonb not null,
  modifie_le  timestamptz not null default now()
);
alter table public.reglages enable row level security;
drop policy if exists equipe on public.reglages;
create policy equipe on public.reglages for all to authenticated
  using (public.est_autorise()) with check (public.est_autorise());
drop policy if exists lecture_publique on public.reglages;
create policy lecture_publique on public.reglages for select to anon using (cle = 'pourcentages_catalogues');
grant select on public.reglages to anon;
grant select, insert, update, delete on public.reglages to authenticated;
-- Pourcentages de départ choisis par l'utilisateur le 14/11 (par rapport au prix garage)
insert into public.reglages (cle, valeur)
values ('pourcentages_catalogues', '{"particulier": 30, "location": 15, "magasin": -5}')
on conflict (cle) do nothing;

-- Prix corrigés à la main (vide = calculé avec le pourcentage)
alter table public.products     add column if not exists prix_particulier numeric;
alter table public.products     add column if not exists prix_location    numeric;
alter table public.products     add column if not exists prix_magasin     numeric;
alter table public.equivalences add column if not exists prix_particulier numeric;
alter table public.equivalences add column if not exists prix_location    numeric;
alter table public.equivalences add column if not exists prix_magasin     numeric;
-- Lisibles par les pages de prix publiques, comme prix_vente (jamais prix_achat)
grant select (prix_particulier, prix_location, prix_magasin) on public.products     to anon;
grant select (prix_particulier, prix_location, prix_magasin) on public.equivalences to anon;

-- ---------- C. HUILE MOTEUR PAR VOITURE ----------
-- Une ligne par moteur. code = code moteur sans espace ni tiret : « K9K » (toute la famille)
-- ou « K9K892 » (une version précise, prioritaire sur la famille).
create table if not exists public.huiles_moteurs (
  code          text primary key,
  description   text,                          -- ex. « Renault / Dacia 1.5 dCi »
  viscosites    text[] not null default '{}',  -- ex. {5W-30, 5W-40}, la préférée d'abord
  norme         text,                          -- ex. « Renault RN0720 »
  acea          text,                          -- ex. « C4 »
  litres        numeric,                       -- quantité pour la vidange, avec le filtre
  source        text,                          -- lien vers la page Liqui Moly / Castrol consultée
  remarque      text,
  modifie_le    timestamptz not null default now()
);
alter table public.huiles_moteurs enable row level security;
drop policy if exists equipe on public.huiles_moteurs;
create policy equipe on public.huiles_moteurs for all to authenticated
  using (public.est_autorise()) with check (public.est_autorise());
drop policy if exists lecture_publique on public.huiles_moteurs;
create policy lecture_publique on public.huiles_moteurs for select to anon using (true);
grant select on public.huiles_moteurs to anon;
grant select, insert, update, delete on public.huiles_moteurs to authenticated;

notify pgrst, 'reload schema';
