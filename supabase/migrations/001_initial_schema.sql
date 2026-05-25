-- ============================================================
-- Schéma : Gestion Filtres & Pièces Auto (Maroc)
-- ============================================================

-- Extension UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE : products
-- ============================================================
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nom_fr      text not null,
  nom_ar      text not null default '',
  reference   text not null unique,
  categorie   text not null check (categorie in (
    'filtre_huile','filtre_air','filtre_carburant',
    'filtre_habitacle','filtre_refroidissement','autre'
  )),
  prix_achat  numeric(10,2) not null default 0,
  prix_vente  numeric(10,2) not null default 0,
  stock       integer not null default 0,
  stock_min   integer not null default 2,
  notes       text
);

-- ============================================================
-- TABLE : clients
-- ============================================================
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nom         text not null,
  telephone   text,
  ville       text not null,
  adresse     text,
  notes       text,
  solde_du    numeric(10,2) not null default 0
);

-- ============================================================
-- TABLE : sales
-- ============================================================
create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  client_id     uuid not null references public.clients(id) on delete restrict,
  date          date not null default current_date,
  total         numeric(10,2) not null default 0,
  montant_paye  numeric(10,2) not null default 0,
  statut        text not null check (statut in ('paye','en_attente','partiel')) default 'paye',
  notes         text
);

-- ============================================================
-- TABLE : sale_items
-- ============================================================
create table if not exists public.sale_items (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references public.sales(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete restrict,
  quantite        integer not null default 1 check (quantite > 0),
  prix_unitaire   numeric(10,2) not null default 0
);

-- ============================================================
-- FUNCTION : decrement_stock
-- ============================================================
create or replace function public.decrement_stock(p_id uuid, qty integer)
returns void language plpgsql as $$
begin
  update public.products
  set stock = stock - qty
  where id = p_id;
end;
$$;

-- ============================================================
-- RLS : Row Level Security (simple — accès total pour l'instant)
-- ============================================================
alter table public.products  enable row level security;
alter table public.clients   enable row level security;
alter table public.sales     enable row level security;
alter table public.sale_items enable row level security;

-- Policies permissives (à restreindre si auth est ajoutée)
create policy "allow all products"   on public.products   for all using (true) with check (true);
create policy "allow all clients"    on public.clients    for all using (true) with check (true);
create policy "allow all sales"      on public.sales      for all using (true) with check (true);
create policy "allow all sale_items" on public.sale_items for all using (true) with check (true);

-- ============================================================
-- DONNÉES DE TEST
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock) values
  ('Filtre huile Renault Clio',   'فلتر زيت رينو كليو',    'FH-REN-001', 'filtre_huile',        15, 25, 10),
  ('Filtre air Dacia Logan',      'فلتر هواء داسيا لوغان', 'FA-DAC-001', 'filtre_air',          12, 22, 8),
  ('Filtre carburant Toyota',     'فلتر بنزين تويوتا',      'FC-TOY-001', 'filtre_carburant',    18, 30, 5),
  ('Filtre huile Peugeot 206',    'فلتر زيت بيجو 206',     'FH-PEU-001', 'filtre_huile',        14, 24, 12),
  ('Filtre habitacle universel',  'فلتر مقصورة عالمي',     'FHB-UNI-001','filtre_habitacle',    20, 35, 6)
on conflict (reference) do nothing;

insert into public.clients (nom, telephone, ville) values
  ('Mohammed Alaoui',   '0661234567', 'Fès'),
  ('Hassan Benali',     '0672345678', 'Meknès'),
  ('Khalid Tahiri',     '0683456789', 'Ifrane'),
  ('Rachid Ouali',      '0694567890', 'Sefrou'),
  ('Youssef Amrani',    '0655678901', 'Azrou')
on conflict do nothing;
