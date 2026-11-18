-- FiltroPro — Références croisées (toutes marques ↔ Filtron), catalogue officiel filtron.eu — BIBLE §8.42
-- À coller UNE fois dans l'éditeur SQL Supabase. Sans danger à relancer.
-- Table « recherche seulement » : Mann, Mahle, Purflux, Bosch, UFI, Fram, Hengst… pour CHAQUE fiche Filtron, sans
-- alourdir Vente / Réception (les variantes de marque avec prix et stock restent dans equivalences).
create table if not exists public.references_croisees (
  id bigserial primary key,
  product_id uuid references public.products(id) on delete cascade,  -- vide si l'appli n'a pas (encore) cette fiche Filtron
  filtron text not null,      -- réf. Filtron (OE689/2)
  marque text not null,       -- marque telle que Filtron l'écrit (MANN-FILTER, KNECHT, BOSCH…)
  reference text not null,    -- réf. de l'autre marque (HU 7018 z)
  ref_norm text generated always as (upper(regexp_replace(reference, '[^A-Za-z0-9]', '', 'g'))) stored,
  ajoute_le timestamptz not null default now(),
  constraint references_croisees_unique unique (marque, reference, filtron)
);
create index if not exists references_croisees_norm on public.references_croisees (ref_norm text_pattern_ops);
create index if not exists references_croisees_produit on public.references_croisees (product_id);
create index if not exists references_croisees_filtron on public.references_croisees (filtron);

alter table public.references_croisees enable row level security;
drop policy if exists equipe on public.references_croisees;
create policy equipe on public.references_croisees for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
revoke all on public.references_croisees from anon;
grant select, insert, update, delete on public.references_croisees to authenticated;
grant usage, select on sequence public.references_croisees_id_seq to authenticated;

notify pgrst, 'reload schema';

-- Vérification : doit afficher 0 (la table est vide avant l'import)
select count(*) as references_croisees from public.references_croisees;
