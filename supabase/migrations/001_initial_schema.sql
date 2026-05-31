-- ============================================================
-- Schéma : Gestion Filtres & Pièces Auto (Maroc)
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
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

create table if not exists public.sale_items (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references public.sales(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete restrict,
  quantite        integer not null default 1 check (quantite > 0),
  prix_unitaire   numeric(10,2) not null default 0
);

-- ============================================================
-- FUNCTION
-- ============================================================
create or replace function public.decrement_stock(p_id uuid, qty integer)
returns void language plpgsql as $$
begin
  update public.products set stock = stock - qty where id = p_id;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.products   enable row level security;
alter table public.clients    enable row level security;
alter table public.sales      enable row level security;
alter table public.sale_items enable row level security;

create policy "allow all products"   on public.products   for all using (true) with check (true);
create policy "allow all clients"    on public.clients    for all using (true) with check (true);
create policy "allow all sales"      on public.sales      for all using (true) with check (true);
create policy "allow all sale_items" on public.sale_items for all using (true) with check (true);

-- ============================================================
-- PRODUITS FILTRON — FILTRES HUILE (OP)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values

-- Renault / Dacia
('Filtre huile Filtron — Renault Clio 1.5 dCi',        'فلتر زيت فيلترون — رينو كليو',        'OP540/1',   'filtre_huile', 18, 30, 15, 3),
('Filtre huile Filtron — Renault Megane 1.5 dCi',       'فلتر زيت فيلترون — رينو ميغان',       'OP540/2',   'filtre_huile', 18, 30, 12, 3),
('Filtre huile Filtron — Renault Symbol 1.4/1.6',       'فلتر زيت فيلترون — رينو سيمبول',      'OP629',     'filtre_huile', 16, 27, 10, 3),
('Filtre huile Filtron — Dacia Logan/Sandero 1.5 dCi',  'فلتر زيت فيلترون — داسيا لوغان',     'OP540/1',   'filtre_huile', 18, 30, 20, 3),
('Filtre huile Filtron — Dacia Duster 1.5 dCi',         'فلتر زيت فيلترون — داسيا داستر',     'OP540/4',   'filtre_huile', 18, 30, 10, 3),
('Filtre huile Filtron — Renault Kangoo 1.5 dCi',       'فلتر زيت فيلترون — رينو كانغو',       'OP540/3',   'filtre_huile', 18, 30, 8,  3),

-- Peugeot / Citroën
('Filtre huile Filtron — Peugeot 206/207 1.4/1.6',      'فلتر زيت فيلترون — بيجو 206/207',    'OP629/1',   'filtre_huile', 17, 28, 15, 3),
('Filtre huile Filtron — Peugeot 308/3008 1.6 HDi',     'فلتر زيت فيلترون — بيجو 308',        'OP641/5',   'filtre_huile', 19, 32, 10, 3),
('Filtre huile Filtron — Peugeot 406/407 2.0 HDi',      'فلتر زيت فيلترون — بيجو 406/407',    'OP580/1',   'filtre_huile', 19, 32, 8,  3),
('Filtre huile Filtron — Citroën Berlingo 1.6 HDi',     'فلتر زيت فيلترون — سيتروين برلينغو', 'OP641/5',   'filtre_huile', 19, 32, 10, 3),
('Filtre huile Filtron — Citroën C3/C4 1.4/1.6',        'فلتر زيت فيلترون — سيتروين C4',      'OP629/1',   'filtre_huile', 17, 28, 12, 3),
('Filtre huile Filtron — Citroën Xsara Picasso',        'فلتر زيت فيلترون — سيتروين خيسارا',  'OP629/2',   'filtre_huile', 17, 28, 8,  3),

-- Volkswagen / Seat / Skoda
('Filtre huile Filtron — VW Golf IV/V 1.9 TDI',         'فلتر زيت فيلترون — فولكسفاغن غولف', 'OP580',     'filtre_huile', 20, 33, 10, 3),
('Filtre huile Filtron — VW Polo 1.4 TDI',              'فلتر زيت فيلترون — فولكسفاغن بولو', 'OP526/1',   'filtre_huile', 18, 30, 8,  3),
('Filtre huile Filtron — VW Passat 1.8T/2.0 TDI',       'فلتر زيت فيلترون — فولكسفاغن باسات','OP580/2',   'filtre_huile', 20, 33, 6,  3),
('Filtre huile Filtron — Seat Ibiza/Leon 1.9 TDI',      'فلتر زيت فيلترون — سيات إيبيزا',    'OP580/3',   'filtre_huile', 18, 30, 8,  3),
('Filtre huile Filtron — Skoda Fabia/Octavia 1.9 TDI',  'فلتر زيت فيلترون — سكودا أوكتافيا', 'OP580/4',   'filtre_huile', 18, 30, 6,  3),

-- Ford
('Filtre huile Filtron — Ford Focus 1.8/2.0 TDCi',      'فلتر زيت فيلترون — فورد فوكس',       'OP526',     'filtre_huile', 18, 30, 10, 3),
('Filtre huile Filtron — Ford Fiesta 1.4/1.6 TDCi',     'فلتر زيت فيلترون — فورد فيستا',      'OP526/2',   'filtre_huile', 17, 28, 8,  3),
('Filtre huile Filtron — Ford Mondeo 2.0 TDCi',         'فلتر زيت فيلترون — فورد موندو',       'OP592',     'filtre_huile', 19, 32, 6,  3),
('Filtre huile Filtron — Ford Transit 2.2/2.4 TDCi',    'فلتر زيت فيلترون — فورد ترانزيت',    'OP592/1',   'filtre_huile', 21, 35, 8,  3),

-- Toyota
('Filtre huile Filtron — Toyota Corolla 1.4/1.6',       'فلتر زيت فيلترون — تويوتا كورولا',   'OP945/1',   'filtre_huile', 18, 30, 12, 3),
('Filtre huile Filtron — Toyota Yaris 1.0/1.3',         'فلتر زيت فيلترون — تويوتا ياريس',    'OP945',     'filtre_huile', 16, 27, 10, 3),
('Filtre huile Filtron — Toyota Hilux 2.5/3.0 D4D',     'فلتر زيت فيلترون — تويوتا هايلكس',  'OP945/3',   'filtre_huile', 20, 33, 8,  3),
('Filtre huile Filtron — Toyota Land Cruiser 3.0 D4D',  'فلتر زيت فيلترون — تويوتا لاندكروزر','OP945/4',   'filtre_huile', 22, 37, 6,  3),
('Filtre huile Filtron — Toyota RAV4 2.0/2.2 D4D',      'فلتر زيت فيلترون — تويوتا راف4',     'OP945/2',   'filtre_huile', 19, 32, 6,  3),

-- Hyundai / Kia
('Filtre huile Filtron — Hyundai i20/i30 1.4/1.6 CRDi', 'فلتر زيت فيلترون — هيونداي i30',    'OP617/1',   'filtre_huile', 17, 28, 10, 3),
('Filtre huile Filtron — Hyundai Tucson/ix35 2.0 CRDi', 'فلتر زيت فيلترون — هيونداي توسان',  'OP617/2',   'filtre_huile', 18, 30, 8,  3),
('Filtre huile Filtron — Kia Rio 1.4/1.6 CRDi',         'فلتر زيت فيلترون — كيا ريو',         'OP617/3',   'filtre_huile', 17, 28, 10, 3),
('Filtre huile Filtron — Kia Sportage 2.0 CRDi',        'فلتر زيت فيلترون — كيا سبورتاج',    'OP617/4',   'filtre_huile', 18, 30, 6,  3),

-- Mercedes
('Filtre huile Filtron — Mercedes Classe C 200/220 CDI','فلتر زيت فيلترون — مرسيدس كلاس C',  'OP538',     'filtre_huile', 22, 38, 8,  3),
('Filtre huile Filtron — Mercedes Classe E 200/220 CDI','فلتر زيت فيلترون — مرسيدس كلاس E',  'OP538/1',   'filtre_huile', 22, 38, 6,  3),
('Filtre huile Filtron — Mercedes Sprinter 2.2/2.7 CDI','فلتر زيت فيلترون — مرسيدس سبرينتر', 'OP538/2',   'filtre_huile', 23, 40, 8,  3),
('Filtre huile Filtron — Mercedes Vito 2.2 CDI',        'فلتر زيت فيلترون — مرسيدس فيتو',    'OP538/3',   'filtre_huile', 22, 38, 6,  3),

-- BMW
('Filtre huile Filtron — BMW Série 3 316/318/320d',     'فلتر زيت فيلترون — بي إم دبليو الفئة 3','OP592/2', 'filtre_huile', 21, 36, 8,  3),
('Filtre huile Filtron — BMW Série 5 520/525d',         'فلتر زيت فيلترون — بي إم دبليو الفئة 5','OP592/3', 'filtre_huile', 22, 38, 6,  3),

-- Nissan
('Filtre huile Filtron — Nissan Micra/Note 1.5 dCi',    'فلتر زيت فيلترون — نيسان ميكرا',    'OP967',     'filtre_huile', 17, 28, 10, 3),
('Filtre huile Filtron — Nissan Qashqai 1.5/2.0 dCi',   'فلتر زيت فيلترون — نيسان قاشقاي',  'OP967/1',   'filtre_huile', 18, 30, 8,  3),
('Filtre huile Filtron — Nissan Navara 2.5 dCi',        'فلتر زيت فيلترون — نيسان نافارا',   'OP967/2',   'filtre_huile', 20, 33, 6,  3),

-- Opel / Fiat
('Filtre huile Filtron — Opel Astra 1.7/1.9 CDTi',     'فلتر زيت فيلترون — أوبل أسترا',     'OP641/5',   'filtre_huile', 18, 30, 8,  3),
('Filtre huile Filtron — Opel Corsa 1.3/1.7 CDTi',     'فلتر زيت فيلترون — أوبل كورسا',     'OP641/6',   'filtre_huile', 17, 28, 8,  3),
('Filtre huile Filtron — Fiat Punto 1.3 Multijet',      'فلتر زيت فيلترون — فيات بونتو',     'OP526/3',   'filtre_huile', 16, 27, 10, 3),
('Filtre huile Filtron — Fiat Tipo 1.3/1.6 Multijet',   'فلتر زيت فيلترون — فيات تيبو',      'OP526/4',   'filtre_huile', 17, 28, 8,  3)

on conflict (reference) do nothing;

-- ============================================================
-- PRODUITS FILTRON — FILTRES AIR (AP)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values

-- Renault / Dacia
('Filtre air Filtron — Renault Clio II/III 1.2/1.4/1.6',    'فلتر هواء فيلترون — رينو كليو',       'AP082',     'filtre_air', 14, 24, 15, 3),
('Filtre air Filtron — Renault Megane II 1.5 dCi/1.6',      'فلتر هواء فيلترون — رينو ميغان II',   'AP082/2',   'filtre_air', 14, 24, 12, 3),
('Filtre air Filtron — Renault Symbol 1.4/1.6',             'فلتر هواء فيلترون — رينو سيمبول',    'AP082/3',   'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Dacia Logan/Sandero 1.4/1.6',        'فلتر هواء فيلترون — داسيا لوغان',    'AP144/7',   'filtre_air', 13, 22, 20, 3),
('Filtre air Filtron — Dacia Duster 1.5 dCi/1.6',           'فلتر هواء فيلترون — داسيا داستر',    'AP144/8',   'filtre_air', 14, 24, 10, 3),
('Filtre air Filtron — Renault Kangoo 1.5 dCi',             'فلتر هواء فيلترون — رينو كانغو',     'AP082/4',   'filtre_air', 14, 24, 8,  3),
('Filtre air Filtron — Renault Laguna 1.9/2.2 dCi',         'فلتر هواء فيلترون — رينو لاغونا',    'AP082/5',   'filtre_air', 15, 25, 6,  3),

-- Peugeot / Citroën
('Filtre air Filtron — Peugeot 206 1.1/1.4/1.6/1.9D',       'فلتر هواء فيلترون — بيجو 206',       'AP029/1',   'filtre_air', 12, 20, 15, 3),
('Filtre air Filtron — Peugeot 207/208 1.4/1.6',            'فلتر هواء فيلترون — بيجو 207/208',   'AP029/2',   'filtre_air', 12, 20, 12, 3),
('Filtre air Filtron — Peugeot 307/308 1.4/1.6 HDi',        'فلتر هواء فيلترون — بيجو 307/308',   'AP029/3',   'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Peugeot 301/405 1.6 HDi',            'فلتر هواء فيلترون — بيجو 301/405',   'AP029/4',   'filtre_air', 12, 20, 10, 3),
('Filtre air Filtron — Citroën Berlingo 1.4/1.6/1.9D',      'فلتر هواء فيلترون — سيتروين برلينغو','AP148/1',   'filtre_air', 13, 22, 12, 3),
('Filtre air Filtron — Citroën C3 1.1/1.4/1.6 HDi',        'فلتر هواء فيلترون — سيتروين C3',     'AP148/2',   'filtre_air', 12, 20, 10, 3),
('Filtre air Filtron — Citroën C4 1.6/2.0 HDi',            'فلتر هواء فيلترون — سيتروين C4',     'AP148/3',   'filtre_air', 13, 22, 8,  3),
('Filtre air Filtron — Citroën Xsara Picasso 1.6/2.0 HDi',  'فلتر هواء فيلترون — سيتروين خيسارا', 'AP148/4',   'filtre_air', 13, 22, 8,  3),

-- VW / Seat / Skoda
('Filtre air Filtron — VW Golf III/IV 1.4/1.6/1.9 TDI',    'فلتر هواء فيلترون — فولكسفاغن غولف','AP098',     'filtre_air', 14, 23, 10, 3),
('Filtre air Filtron — VW Polo 1.0/1.4/1.6 TDI',           'فلتر هواء فيلترون — فولكسفاغن بولو','AP098/1',   'filtre_air', 12, 21, 10, 3),
('Filtre air Filtron — VW Passat 1.8T/1.9/2.0 TDI',        'فلتر هواء فيلترون — فولكسفاغن باسات','AP098/2',   'filtre_air', 14, 23, 8,  3),
('Filtre air Filtron — Seat Ibiza/Cordoba 1.4/1.9 TDI',    'فلتر هواء فيلترون — سيات إيبيزا',   'AP098/3',   'filtre_air', 13, 22, 8,  3),
('Filtre air Filtron — Seat Leon/Altea 1.6/1.9 TDI',       'فلتر هواء فيلترون — سيات ليون',      'AP098/4',   'filtre_air', 13, 22, 6,  3),
('Filtre air Filtron — Skoda Fabia 1.4/1.9 TDI',           'فلتر هواء فيلترون — سكودا فابيا',    'AP098/5',   'filtre_air', 12, 21, 8,  3),
('Filtre air Filtron — Skoda Octavia 1.6/1.9/2.0 TDI',     'فلتر هواء فيلترون — سكودا أوكتافيا', 'AP098/6',   'filtre_air', 14, 23, 6,  3),

-- Ford
('Filtre air Filtron — Ford Focus 1.6/1.8/2.0 TDCi',       'فلتر هواء فيلترون — فورد فوكس',     'AP071/1',   'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Ford Fiesta 1.25/1.4/1.6 TDCi',     'فلتر هواء فيلترون — فورد فيستا',    'AP071/2',   'filtre_air', 12, 20, 10, 3),
('Filtre air Filtron — Ford Mondeo 1.8/2.0 TDCi',          'فلتر هواء فيلترون — فورد موندو',     'AP071/3',   'filtre_air', 14, 23, 6,  3),
('Filtre air Filtron — Ford Transit 2.2/2.4 TDCi',         'فلتر هواء فيلترون — فورد ترانزيت',   'AP071/4',   'filtre_air', 16, 27, 8,  3),

-- Toyota
('Filtre air Filtron — Toyota Corolla 1.4/1.6/2.0 D4D',    'فلتر هواء فيلترون — تويوتا كورولا', 'AP159',     'filtre_air', 14, 24, 12, 3),
('Filtre air Filtron — Toyota Yaris 1.0/1.3/1.4 D4D',      'فلتر هواء فيلترون — تويوتا ياريس',  'AP159/1',   'filtre_air', 12, 21, 10, 3),
('Filtre air Filtron — Toyota Hilux 2.5/3.0 D4D',          'فلتر هواء فيلترون — تويوتا هايلكس', 'AP159/2',   'filtre_air', 16, 28, 8,  3),
('Filtre air Filtron — Toyota Land Cruiser 3.0 D4D',        'فلتر هواء فيلترون — تويوتا لاندكروزر','AP159/3',  'filtre_air', 18, 30, 6,  3),
('Filtre air Filtron — Toyota RAV4 2.0/2.2 D4D',            'فلتر هواء فيلترون — تويوتا راف4',    'AP159/4',   'filtre_air', 14, 24, 6,  3),

-- Hyundai / Kia
('Filtre air Filtron — Hyundai i10/i20 1.1/1.2/1.4',        'فلتر هواء فيلترون — هيونداي i20',   'AP153',     'filtre_air', 12, 21, 10, 3),
('Filtre air Filtron — Hyundai i30/ix35 1.6/2.0 CRDi',     'فلتر هواء فيلترون — هيونداي i30',   'AP153/1',   'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Kia Picanto 1.0/1.1/1.2',            'فلتر هواء فيلترون — كيا بيكانتو',   'AP180',     'filtre_air', 11, 19, 10, 3),
('Filtre air Filtron — Kia Rio/Sportage 1.4/1.6 CRDi',      'فلتر هواء فيلترون — كيا سبورتاج',   'AP180/1',   'filtre_air', 13, 22, 8,  3),

-- Mercedes / BMW
('Filtre air Filtron — Mercedes Classe C/E 200/220 CDI',    'فلتر هواء فيلترون — مرسيدس كلاس C', 'AP200',     'filtre_air', 18, 30, 8,  3),
('Filtre air Filtron — Mercedes Sprinter 2.2/2.7 CDI',      'فلتر هواء فيلترون — مرسيدس سبرينتر','AP200/1',   'filtre_air', 20, 33, 6,  3),
('Filtre air Filtron — BMW Série 3 316/318/320d',            'فلتر هواء فيلترون — بي إم دبليو 3',  'AP190',     'filtre_air', 17, 28, 8,  3),
('Filtre air Filtron — BMW Série 5 520/525d',               'فلتر هواء فيلترون — بي إم دبليو 5',  'AP190/1',   'filtre_air', 18, 30, 6,  3),

-- Nissan / Opel / Fiat / Suzuki
('Filtre air Filtron — Nissan Micra 1.0/1.2/1.5 dCi',       'فلتر هواء فيلترون — نيسان ميكرا',   'AP173',     'filtre_air', 12, 21, 8,  3),
('Filtre air Filtron — Nissan Qashqai 1.5/2.0 dCi',         'فلتر هواء فيلترون — نيسان قاشقاي',  'AP173/1',   'filtre_air', 14, 24, 8,  3),
('Filtre air Filtron — Opel Astra/Corsa 1.3/1.7 CDTi',      'فلتر هواء فيلترون — أوبل أسترا',    'AP179',     'filtre_air', 13, 22, 8,  3),
('Filtre air Filtron — Fiat Punto/Tipo 1.3 Multijet',       'فلتر هواء فيلترون — فيات بونتو',    'AP068/1',   'filtre_air', 12, 20, 10, 3),
('Filtre air Filtron — Suzuki Swift/Vitara 1.3/1.6',        'فلتر هواء فيلترون — سوزوكي سويفت',  'AP188',     'filtre_air', 12, 20, 8,  3)

on conflict (reference) do nothing;

-- ============================================================
-- PRODUITS FILTRON — FILTRES CARBURANT (PP)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values

-- Renault / Dacia
('Filtre carburant Filtron — Renault/Dacia 1.5 dCi',        'فلتر بنزين فيلترون — رينو داسيا 1.5 dCi',  'PP839',     'filtre_carburant', 20, 35, 12, 3),
('Filtre carburant Filtron — Renault Megane 1.9/2.2 dCi',   'فلتر بنزين فيلترون — رينو ميغان ديزل',     'PP839/1',   'filtre_carburant', 20, 35, 8,  3),
('Filtre carburant Filtron — Renault Laguna 1.9/2.2 dCi',   'فلتر بنزين فيلترون — رينو لاغونا ديزل',    'PP839/2',   'filtre_carburant', 21, 36, 6,  3),
('Filtre carburant Filtron — Dacia Duster 1.5 dCi',         'فلتر بنزين فيلترون — داسيا داستر ديزل',    'PP839/3',   'filtre_carburant', 20, 35, 8,  3),

-- Peugeot / Citroën
('Filtre carburant Filtron — Peugeot 1.4/1.6/2.0 HDi',     'فلتر بنزين فيلترون — بيجو HDi',            'PP976',     'filtre_carburant', 19, 33, 12, 3),
('Filtre carburant Filtron — Peugeot 406/407 2.0 HDi',      'فلتر بنزين فيلترون — بيجو 406/407 HDi',    'PP976/1',   'filtre_carburant', 20, 34, 8,  3),
('Filtre carburant Filtron — Citroën Berlingo/C4 HDi',      'فلتر بنزين فيلترون — سيتروين HDi',         'PP982/1',   'filtre_carburant', 19, 33, 10, 3),
('Filtre carburant Filtron — Citroën Xsara 1.9 D/TD',       'فلتر بنزين فيلترون — سيتروين خيسارا',      'PP982/2',   'filtre_carburant', 18, 32, 6,  3),

-- VW / Seat / Skoda
('Filtre carburant Filtron — VW Golf/Passat 1.9/2.0 TDI',  'فلتر بنزين فيلترون — فولكسفاغن TDI',       'PP996',     'filtre_carburant', 21, 36, 10, 3),
('Filtre carburant Filtron — VW Polo/Caddy 1.4/1.9 TDI',   'فلتر بنزين فيلترون — فولكسفاغن بولو TDI',  'PP996/1',   'filtre_carburant', 19, 33, 8,  3),
('Filtre carburant Filtron — Seat Ibiza/Leon 1.9 TDI',      'فلتر بنزين فيلترون — سيات TDI',            'PP996/2',   'filtre_carburant', 19, 33, 6,  3),
('Filtre carburant Filtron — Skoda Octavia/Fabia 1.9 TDI',  'فلتر بنزين فيلترون — سكودا TDI',           'PP996/3',   'filtre_carburant', 19, 33, 6,  3),

-- Ford
('Filtre carburant Filtron — Ford Focus/Mondeo 1.8/2.0 TDCi','فلتر بنزين فيلترون — فورد TDCi',          'PP968',     'filtre_carburant', 20, 34, 10, 3),
('Filtre carburant Filtron — Ford Transit 2.2/2.4 TDCi',    'فلتر بنزين فيلترون — فورد ترانزيت',        'PP968/1',   'filtre_carburant', 21, 36, 8,  3),
('Filtre carburant Filtron — Ford Fiesta 1.4/1.6 TDCi',     'فلتر بنزين فيلترون — فورد فيستا',          'PP968/2',   'filtre_carburant', 19, 33, 8,  3),

-- Toyota
('Filtre carburant Filtron — Toyota Hilux 2.5/3.0 D4D',     'فلتر بنزين فيلترون — تويوتا هايلكس D4D',  'PP975',     'filtre_carburant', 21, 36, 8,  3),
('Filtre carburant Filtron — Toyota Land Cruiser 3.0 D4D',   'فلتر بنزين فيلترون — تويوتا لاندكروزر',    'PP975/1',   'filtre_carburant', 22, 38, 6,  3),
('Filtre carburant Filtron — Toyota Corolla 2.0 D4D',       'فلتر بنزين فيلترون — تويوتا كورولا',        'PP975/2',   'filtre_carburant', 20, 34, 8,  3),

-- Hyundai / Kia / Nissan / Mercedes / BMW
('Filtre carburant Filtron — Hyundai/Kia 1.5/2.0 CRDi',    'فلتر بنزين فيلترون — هيونداي كيا CRDi',    'PP983',     'filtre_carburant', 19, 33, 8,  3),
('Filtre carburant Filtron — Nissan Qashqai/Navara dCi',    'فلتر بنزين فيلترون — نيسان dCi',           'PP985',     'filtre_carburant', 20, 34, 6,  3),
('Filtre carburant Filtron — Mercedes Sprinter/Vito CDI',   'فلتر بنزين فيلترون — مرسيدس CDI',          'PP969',     'filtre_carburant', 23, 40, 6,  3),
('Filtre carburant Filtron — BMW 320d/520d/330d',           'فلتر بنزين فيلترون — بي إم دبليو ديزل',    'PP977',     'filtre_carburant', 22, 38, 6,  3),
('Filtre carburant Filtron — Opel Astra/Vectra 1.7/1.9 CDTi','فلتر بنزين فيلترون — أوبل CDTi',          'PP979',     'filtre_carburant', 18, 32, 6,  3),
('Filtre carburant Filtron — Fiat Punto/Doblo 1.3 Multijet','فلتر بنزين فيلترون — فيات Multijet',        'PP980',     'filtre_carburant', 18, 32, 8,  3)

on conflict (reference) do nothing;

-- ============================================================
-- PRODUITS FILTRON — FILTRES HABITACLE (K)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values

-- Renault / Dacia
('Filtre habitacle Filtron — Renault Clio II/III',          'فلتر مقصورة فيلترون — رينو كليو',    'K1175',     'filtre_habitacle', 15, 28, 12, 3),
('Filtre habitacle Filtron — Renault Megane II/III',        'فلتر مقصورة فيلترون — رينو ميغان',   'K1246',     'filtre_habitacle', 15, 28, 10, 3),
('Filtre habitacle Filtron — Renault Laguna II/III',        'فلتر مقصورة فيلترون — رينو لاغونا',  'K1246/1',   'filtre_habitacle', 16, 29, 8,  3),
('Filtre habitacle Filtron — Renault Kangoo II',            'فلتر مقصورة فيلترون — رينو كانغو',   'K1175/1',   'filtre_habitacle', 15, 28, 8,  3),
('Filtre habitacle Filtron — Dacia Logan/Sandero',          'فلتر مقصورة فيلترون — داسيا لوغان',  'K1318',     'filtre_habitacle', 14, 26, 15, 3),
('Filtre habitacle Filtron — Dacia Duster',                 'فلتر مقصورة فيلترون — داسيا داستر',  'K1318/1',   'filtre_habitacle', 14, 26, 10, 3),

-- Peugeot / Citroën
('Filtre habitacle Filtron — Peugeot 206',                  'فلتر مقصورة فيلترون — بيجو 206',     'K1172',     'filtre_habitacle', 14, 25, 12, 3),
('Filtre habitacle Filtron — Peugeot 207/208',              'فلتر مقصورة فيلترون — بيجو 207/208', 'K1172/1',   'filtre_habitacle', 14, 25, 10, 3),
('Filtre habitacle Filtron — Peugeot 307/308',              'فلتر مقصورة فيلترون — بيجو 307/308', 'K1315',     'filtre_habitacle', 15, 27, 10, 3),
('Filtre habitacle Filtron — Peugeot 301/405',              'فلتر مقصورة فيلترون — بيجو 301/405', 'K1172/2',   'filtre_habitacle', 14, 25, 8,  3),
('Filtre habitacle Filtron — Citroën C3/Berlingo',          'فلتر مقصورة فيلترون — سيتروين C3',   'K1243',     'filtre_habitacle', 14, 25, 10, 3),
('Filtre habitacle Filtron — Citroën C4/Xsara Picasso',     'فلتر مقصورة فيلترون — سيتروين C4',   'K1295',     'filtre_habitacle', 15, 27, 8,  3),

-- VW / Seat / Skoda
('Filtre habitacle Filtron — VW Golf IV/V',                 'فلتر مقصورة فيلترون — فولكسفاغن غولف','K1307',    'filtre_habitacle', 16, 28, 8,  3),
('Filtre habitacle Filtron — VW Polo/Caddy',                'فلتر مقصورة فيلترون — فولكسفاغن بولو','K1307/1',  'filtre_habitacle', 14, 26, 8,  3),
('Filtre habitacle Filtron — VW Passat B5/B6',              'فلتر مقصورة فيلترون — فولكسفاغن باسات','K1307/2', 'filtre_habitacle', 16, 28, 6,  3),
('Filtre habitacle Filtron — Seat Ibiza/Leon',              'فلتر مقصورة فيلترون — سيات',          'K1307/3',  'filtre_habitacle', 14, 26, 6,  3),
('Filtre habitacle Filtron — Skoda Fabia/Octavia',          'فلتر مقصورة فيلترون — سكودا',         'K1307/4',  'filtre_habitacle', 14, 26, 6,  3),

-- Ford
('Filtre habitacle Filtron — Ford Focus II/III',            'فلتر مقصورة فيلترون — فورد فوكس',    'K1385',     'filtre_habitacle', 15, 27, 8,  3),
('Filtre habitacle Filtron — Ford Fiesta VI/VII',           'فلتر مقصورة فيلترون — فورد فيستا',   'K1385/1',   'filtre_habitacle', 14, 26, 8,  3),
('Filtre habitacle Filtron — Ford Mondeo III/IV',           'فلتر مقصورة فيلترون — فورد موندو',   'K1385/2',   'filtre_habitacle', 15, 27, 6,  3),

-- Toyota
('Filtre habitacle Filtron — Toyota Corolla E120/E150',     'فلتر مقصورة فيلترون — تويوتا كورولا','K1296',     'filtre_habitacle', 14, 26, 10, 3),
('Filtre habitacle Filtron — Toyota Yaris XP10/XP13',       'فلتر مقصورة فيلترون — تويوتا ياريس', 'K1296/1',   'filtre_habitacle', 13, 24, 8,  3),
('Filtre habitacle Filtron — Toyota RAV4 III/IV',           'فلتر مقصورة فيلترون — تويوتا راف4',  'K1296/2',   'filtre_habitacle', 15, 27, 6,  3),

-- Hyundai / Kia
('Filtre habitacle Filtron — Hyundai i20/i30',              'فلتر مقصورة فيلترون — هيونداي',      'K1271',     'filtre_habitacle', 13, 24, 8,  3),
('Filtre habitacle Filtron — Hyundai Tucson/ix35',          'فلتر مقصورة فيلترون — هيونداي توسان','K1271/1',   'filtre_habitacle', 14, 26, 6,  3),
('Filtre habitacle Filtron — Kia Rio/Picanto',              'فلتر مقصورة فيلترون — كيا ريو',      'K1303',     'filtre_habitacle', 13, 24, 8,  3),
('Filtre habitacle Filtron — Kia Sportage II/III',          'فلتر مقصورة فيلترون — كيا سبورتاج',  'K1303/1',   'filtre_habitacle', 14, 26, 6,  3),

-- Mercedes / BMW / Nissan / Opel / Fiat
('Filtre habitacle Filtron — Mercedes Classe C W203/W204', 'فلتر مقصورة فيلترون — مرسيدس C',     'K1014A',    'filtre_habitacle', 18, 32, 6,  3),
('Filtre habitacle Filtron — Mercedes Classe E W211/W212', 'فلتر مقصورة فيلترون — مرسيدس E',     'K1014A/1',  'filtre_habitacle', 18, 32, 6,  3),
('Filtre habitacle Filtron — BMW Série 3 E46/E90',         'فلتر مقصورة فيلترون — بي إم دبليو 3','K1092A',    'filtre_habitacle', 17, 30, 6,  3),
('Filtre habitacle Filtron — BMW Série 5 E60/E61',         'فلتر مقصورة فيلترون — بي إم دبليو 5','K1092A/1',  'filtre_habitacle', 18, 32, 4,  3),
('Filtre habitacle Filtron — Nissan Micra/Note/Qashqai',   'فلتر مقصورة فيلترون — نيسان',        'K1246/2',   'filtre_habitacle', 14, 26, 6,  3),
('Filtre habitacle Filtron — Opel Astra G/H/Corsa C/D',    'فلتر مقصورة فيلترون — أوبل أسترا',  'K1285',     'filtre_habitacle', 13, 24, 8,  3),
('Filtre habitacle Filtron — Fiat Punto/Grande Punto',     'فلتر مقصورة فيلترون — فيات بونتو',   'K1173',     'filtre_habitacle', 13, 24, 8,  3),
('Filtre habitacle Filtron — Suzuki Swift/SX4/Vitara',     'فلتر مقصورة فيلترون — سوزوكي',       'K1281',     'filtre_habitacle', 13, 24, 6,  3)

on conflict (reference) do nothing;
