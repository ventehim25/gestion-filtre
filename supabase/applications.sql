-- ============================================================
-- TABLE APPLICATIONS — véhicules compatibles (données réelles Filtron)
-- ============================================================
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  marque       text not null,
  modele       text not null,
  moteur       text,
  code_moteur  text,
  annee_debut  text,
  annee_fin    text,
  puissance    text,
  unique (product_id, marque, modele, moteur)
);

create index if not exists idx_app_product on public.applications (product_id);
create index if not exists idx_app_marque on public.applications (marque);

alter table public.applications enable row level security;
drop policy if exists "allow all applications" on public.applications;
create policy "allow all applications" on public.applications for all using (true) with check (true);
