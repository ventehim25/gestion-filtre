-- Gestion des fournisseurs : marchandise prise (réceptions), avances, solde.
-- À exécuter UNE FOIS dans l'éditeur SQL Supabase (Dashboard > SQL Editor).
-- RLS allow-all : cohérent avec le reste du schéma.

create table if not exists public.fournisseurs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nom         text not null,
  telephone   text,
  note        text
);

-- Marchandise prise chez un fournisseur (augmente la dette)
create table if not exists public.receptions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  fournisseur_id uuid not null references public.fournisseurs(id) on delete cascade,
  date           date not null default current_date,
  montant        double precision not null default 0,  -- coût total (Σ prix_achat × qté)
  details        text                                   -- récap des articles (REF ×qté)
);

-- Avances / remboursements versés au fournisseur (diminue la dette)
create table if not exists public.avances (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  fournisseur_id uuid not null references public.fournisseurs(id) on delete cascade,
  date           date not null default current_date,
  montant        double precision not null default 0,
  note           text
);

create index if not exists receptions_fournisseur_idx on public.receptions (fournisseur_id);
create index if not exists avances_fournisseur_idx on public.avances (fournisseur_id);

alter table public.fournisseurs enable row level security;
alter table public.receptions  enable row level security;
alter table public.avances     enable row level security;

drop policy if exists "fournisseurs_all" on public.fournisseurs;
create policy "fournisseurs_all" on public.fournisseurs for all using (true) with check (true);
drop policy if exists "receptions_all" on public.receptions;
create policy "receptions_all" on public.receptions for all using (true) with check (true);
drop policy if exists "avances_all" on public.avances;
create policy "avances_all" on public.avances for all using (true) with check (true);
