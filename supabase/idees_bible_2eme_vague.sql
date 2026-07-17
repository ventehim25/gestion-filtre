-- Bible §4.6 + §4.10 — commandes WhatsApp des garages + rappels vidange.
-- À coller tel quel dans l'éditeur SQL : https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new

-- §4.6 — lier un garage (carte tournées) à sa fiche client (ventes/commandes)
alter table garages add column if not exists client_id uuid references clients(id);

-- §4.10 — rappels vidange des clients finaux des garages
create table if not exists rappels_vidange (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  garage_id uuid references garages(id),
  client_id uuid references clients(id),
  vehicule text not null,            -- « Dacia Dokker de Ahmed » (texte libre, 5 secondes)
  date_prevue date not null,         -- défaut côté app : +5 mois
  fait boolean not null default false
);
alter table rappels_vidange enable row level security;
drop policy if exists rappels_all on rappels_vidange;
create policy rappels_all on rappels_vidange for all using (true) with check (true);

notify pgrst, 'reload schema';
