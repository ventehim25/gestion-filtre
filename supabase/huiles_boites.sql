-- Huile de BOÎTE par voiture (guide des huiles Liqui Moly) — BIBLE §8.40. Rempli par scripts/huiles_boites.mjs.
-- Clé = la même que l'huile moteur par modèle (« ~DACIA|LOGAN|1.5|D|63 ») ; variante = période (« 2004-2012 ») ou vide.
-- boites = les boîtes possibles : [{ nom, code, viscosites, atf, norme, produits, litres }] (ex. JH3 75W-80 GL5 2,8 L).
-- fluides = liquide de frein, refroidissement, direction assistée, clim : [{ nom, produits, quantites, dot }]
--   (présentation inspirée de HaynesPro / webdatabays ; données du guide Liqui Moly, public).
-- Idempotent : peut être collé deux fois. Aucune donnée existante modifiée.

create table if not exists public.huiles_boites (
  cle text not null,
  variante text not null default '',
  boites jsonb not null default '[]'::jsonb,
  fluides jsonb not null default '[]'::jsonb,
  description text,
  marques text[],
  source text,
  modifie_le timestamptz not null default now(),
  primary key (cle, variante)
);

alter table public.huiles_boites add column if not exists fluides jsonb not null default '[]'::jsonb;
alter table public.huiles_boites enable row level security;
drop policy if exists equipe on public.huiles_boites;
create policy equipe on public.huiles_boites for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));

notify pgrst, 'reload schema';

-- Vérification (doit afficher « huiles_boites ») :
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'huiles_boites';
