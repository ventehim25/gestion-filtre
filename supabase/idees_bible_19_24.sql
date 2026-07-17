-- Bible §4.12 + §4.14 + §4.15 — registre « j'ai pas », clients endormis, avoir & parrainage.
-- À coller tel quel dans l'éditeur SQL : https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new

-- §4.12 — demandes de références que je n'avais pas (ventes perdues)
create table if not exists demandes_manquees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null,           -- la référence telle que cherchée (normalisée majuscules, sans espaces)
  note text,                          -- optionnel : « pour Clio 4 », nom du client…
  traite boolean not null default false
);
alter table demandes_manquees enable row level security;
drop policy if exists demandes_all on demandes_manquees;
create policy demandes_all on demandes_manquees for all using (true) with check (true);

-- §4.14 — relance commerciale des clients endormis (distincte de derniere_relance = impayés)
alter table clients add column if not exists derniere_relance_com date;

-- §4.15 — avoir (crédit à déduire) + parrainage
alter table clients add column if not exists avoir numeric not null default 0;
alter table clients add column if not exists parrain_id uuid references clients(id);
alter table clients add column if not exists parrain_paye boolean not null default false;

notify pgrst, 'reload schema';
