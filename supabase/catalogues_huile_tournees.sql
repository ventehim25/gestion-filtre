-- ============================================================
-- 14/11/2026 — UN SEUL COLLAGE pour trois nouveautés (idempotent : on peut le recoller sans risque)
--   A. Tournées prévues : prévenir les clients la veille (même contenu que tournees_prevues.sql)
--   B. 4 catalogues de prix : garages & stations (prix de base), particuliers, location de voitures,
--      magasins de pièces. Prix calculés avec un pourcentage, ou corrigés à la main par article.
--   C. Huile moteur par voiture (viscosités, litres) + D. les données relevées dans le guide Liqui Moly.
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
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
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
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
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
-- Une ligne par moteur (code donné par le guide Liqui Moly, ex. « K9K ») et par variante
-- (« sans FAP » / « avec FAP » quand l'huile change selon le filtre à particules, sinon vide).
create table if not exists public.huiles_moteurs (
  code          text not null,
  variante      text not null default '',
  description   text,                          -- voiture consultée, ex. « Dacia Logan II 1.5 dCi 90 DPF (2012-2015) »
  viscosites    text[] not null default '{}',  -- dans l'ordre du guide, ex. {0W-30, 5W-30}
  norme         text,                          -- norme constructeur quand elle est connue (sinon vide)
  litres_min    numeric,                       -- quantité pour la vidange (avec le filtre)
  litres_max    numeric,
  source        text,                          -- guide consulté (Liqui Moly) et date
  remarque      text,
  modifie_le    timestamptz not null default now(),
  primary key (code, variante)
);
alter table public.huiles_moteurs enable row level security;
drop policy if exists equipe on public.huiles_moteurs;
create policy equipe on public.huiles_moteurs for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
drop policy if exists lecture_publique on public.huiles_moteurs;
create policy lecture_publique on public.huiles_moteurs for select to anon using (true);
grant select on public.huiles_moteurs to anon;
grant select, insert, update, delete on public.huiles_moteurs to authenticated;

-- ---------- D. DONNÉES HUILE (relevé du guide des huiles Liqui Moly, 14/11/2026) ----------
-- 59 lignes. Viscosités dans l'ordre du guide ; quantité = remplissage d'entretien (avec filtre).
-- Recollable : met à jour les lignes existantes.
insert into public.huiles_moteurs (code, variante, description, viscosites, litres_min, litres_max, source) values
('156A2000', '', 'Fiat Uno 45 1.0 (1990-1993)', '{"5W-40","15W-40"}', 3.75, 3.75, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('178A2000', '', 'Fiat Palio / Albea / Siena, Weekend 1.2 (1996-2010)', '{"5W-30","10W-40"}', 3.7, 3.7, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('188A9000', '', 'Fiat Doblò 1.3 JTD 16V (2004-2005)', '{"5W-40"}', 3, 3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('1GDFTV', '', 'Toyota Hilux 2.8 D-4D 4WD (2015)', '{"5W-30","10W-30","15W-40","10W-40"}', 7.5, 7.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('1KDFTV', '', 'Toyota Hilux 3.0 D-4D + EGR Cooler 2WD (2005-2008)', '{"5W-30"}', 6.9, 6.9, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('1SZFE', '', 'Toyota Yaris 1.0 16V VVT-i (2002-2003)', '{"0W-30","5W-30","5W-40","15W-40","20W-50"}', 3.2, 3.2, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('223A6000', '', 'Fiat Doblò 1.9 D (2000-2004)', '{"5W-40"}', 4.3, 4.3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('2GDFTV', '', 'Toyota Hilux 2.4 D-4D 2WD (2015)', '{"5W-30","10W-30","15W-40","10W-40"}', 7.5, 7.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('2KDFTV', '', 'Toyota Hilux 2.5 D-4D (106 kW) + EGR Cooler 2WD (2012-2015)', '{"5W-30"}', 6.9, 6.9, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('2L', '', 'Toyota Hilux 2.4 D 2WD (1997-2001)', '{"10W-30","15W-40","20W-50","5W-30","10W-40"}', 5.8, 5.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('4D56', 'D / TD (avant 2006)', 'Mitsubishi L200 2.5 D (1997-2006)', '{"15W-40"}', 5, 5.4, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('4D56', 'DI-D (depuis 2006)', 'Mitsubishi L200 2.5 DI-D 4x2 (100 kW) (2006-2009)', '{"0W-30","5W-30","10W-30","15W-40","10W-40"}', 5.5, 6.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('4JK1TC', '', 'Isuzu D-Max 2.5 TD AWD (120 kW) TFS86J (2016-2017)', '{"10W-30","5W-30","15W-40"}', 5.9, 5.9, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('ANX', '', 'Volkswagen Polo 1.4 (1994-1999)', '{"5W-30","5W-40","10W-40"}', 3.4, 3.4, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('ARL', '', 'Volkswagen Golf IV 1.9 TDI (110 kW) (2000-2004)', '{"0W-30","5W-30","5W-40"}', 4.5, 4.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('B4D', '', 'Dacia Logan II 1.0 SCe (2016-2019)', '{"0W-30","5W-30","5W-40","10W-40","0W-40"}', 3, 3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('BRU', '', 'Volkswagen Golf V 1.9 TDI (66 kW) (2003-2008)', '{"0W-30","5W-30","5W-40"}', 3.8, 3.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('BXF', '', 'Volkswagen Golf V 1.9 TDI (66 kW) (2003-2008)', '{"0W-30","5W-30","5W-40"}', 3.8, 3.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('CAYB', '', 'Volkswagen Golf VI 1.6 TDI (66 kW) (2009-2012)', '{"0W-30","5W-30"}', 4.3, 4.3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('CBAA', '', 'Volkswagen Golf VI 2.0 TDI (100 kW) (2008-2012)', '{"0W-30","5W-30"}', 4, 4, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('CFFA', '', 'Volkswagen Golf VI 2.0 TDI (100 kW) (2008-2012)', '{"0W-30","5W-30"}', 4, 4, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('D4F', '', 'Dacia Logan II 1.2 16V (2012-2016)', '{"0W-30","5W-30","5W-40","10W-40","0W-40"}', 4, 4, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('D4FA', '', 'Hyundai Accent 1.5 CRDi MC (2006-2009)', '{"5W-30","10W-30","15W-40"}', 5.3, 5.3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('D7F', '', 'Renault Clio Campus II 1.2 (2005-2007)', '{"0W-30","5W-30","5W-40","10W-40","10W-60","0W-40"}', 3.7, 3.7, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DV4C', '', 'Peugeot 206 1.4 HDi 8HX, 8HZ (2001-2009)', '{"5W-30"}', 3.8, 3.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DV4TD', '', 'Peugeot 206 1.4 HDi 8HX, 8HZ (2001-2009)', '{"5W-30"}', 3.8, 3.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DV5RD', '', 'Peugeot 208 I 1.5 BlueHDi 100 YHY (2018-2019)', '{"5W-30"}', 4, 4, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DV6ATED4', '', 'Peugeot Partner Tepee 1.6 HDi 90 (2012)', '{"10W-40","5W-30"}', 3.75, 3.75, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DV6FD', '', 'Peugeot 301 1.6 BlueHDi 100 BHY (2014-2019)', '{"5W-30"}', 3.75, 3.75, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DV6TED4', '', 'Peugeot 206 1.6 HDi 9HY, 9HZ (2004-2006)', '{"10W-40","5W-30"}', 3.8, 3.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DV6TED4B', '', 'Peugeot Partner Tepee 1.6 HDi 75 DPF 9HK, 9HN (2012-2015)', '{"5W-30"}', 3.75, 3.75, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('DW10TD', '', 'Peugeot Partner Combi 2.0 HDi RHY (2002-2005)', '{"10W-40","5W-30"}', 4.5, 4.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('EB2FA', '', 'Peugeot 208 I 1.2 PureTech 82 HMR (2018-2019)', '{"5W-30"}', 3.25, 3.25, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('EC5', '', 'Peugeot 301 1.6 VTi NFP (2017-2019)', '{"10W-40","5W-30"}', 3.25, 3.25, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('EP6FDT', '', 'Peugeot 208 I 1.6 THP 165 5GZ (2015-2018)', '{"5W-30"}', 4.25, 4.25, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('EP6FDTM', '', 'Peugeot 208 I 1.6 THP 165 5GZ (2015-2018)', '{"5W-30"}', 4.25, 4.25, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('ET3J4', '', 'Peugeot 206 1.4 16V KFU (2003-2005)', '{"10W-40","5W-30"}', 3, 3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('F6JA', '', 'Ford Fiesta 1.4 TDCi (2002-2008)', '{"5W-30"}', 3.8, 3.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('F8Q', '', 'Renault Kangoo 1.9 D (1997-2000)', '{"5W-40","10W-40","10W-60","0W-40"}', 5.2, 5.2, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('F9Q', '', 'Renault Kangoo 1.9 dCi 4x4 (2002-2003)', '{"5W-40","0W-40"}', 5.5, 5.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('G4EH', '', 'Hyundai Accent / Pony / Excel 1.3 (1999-2003)', '{"5W-30","10W-40","5W-40","10W-60","15W-50","15W-40","20W-50"}', 3, 3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('G4LA', '', 'Hyundai i10 1.25i (2008-2010)', '{"5W-20","5W-40","15W-40","20W-50"}', 3.5, 3.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('H4B', '', 'Dacia Logan II 0.9 TCe (2015-2019)', '{"0W-30","5W-30","5W-40","10W-40","0W-40"}', 4.1, 4.1, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('H5H', '', 'Dacia Duster II 1.3 TCe 130 AWD PF (2019-2024)', '{"5W-30","0W-20"}', 5.5, 5.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('K4J', '', 'Renault Clio Campus II 1.4 16V (2005-2007)', '{"0W-30","5W-30","5W-40","10W-40","10W-60","0W-40"}', 4.9, 4.9, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('K4M', '', 'Dacia Duster 1.6 16V (2010-2015)', '{"0W-30","5W-30","5W-40","10W-40","0W-40"}', 4.1, 4.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('K7J', '', 'Dacia Logan 1.4 (2004-2012)', '{"0W-30","5W-30","5W-40","10W-40","0W-40"}', 3.3, 3.3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('K7M', '', 'Dacia Logan 1.6 (2004-2012)', '{"0W-30","5W-30","5W-40","10W-40","0W-40"}', 3.3, 3.3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('K9K', 'avec FAP', 'Dacia Logan II 1.5 dCi 90 DPF (2012-2015)', '{"0W-30","5W-30","5W-40","0W-40"}', 4.4, 4.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('K9K', 'Blue dCi (Euro 6)', 'Dacia Duster II 1.5 Blue dCi 115 DPF Euro 6d temp / 6d (2019-2024)', '{"5W-30","0W-20"}', 5.7, 5.9, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('K9K', 'sans FAP', 'Dacia Logan II 1.5 dCi 90 (2012-2015)', '{"5W-40","10W-40","0W-40"}', 4.4, 4.8, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('M13A', '', 'Suzuki Swift 1.3 RS413 (2004-2010)', '{"5W-30","10W-40","5W-40","15W-40"}', 3.7, 3.7, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('OM601', '', 'Mercedes-Benz 190 D (1984-1987)', '{"5W-30","5W-40","10W-40","15W-40"}', 6.5, 6.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('OM646811', '', 'Mercedes-Benz C 220 CDI 204.008/208 (2007-2008)', '{"0W-30","5W-30","5W-40","0W-40"}', 6.5, 6.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('OM646962', '', 'Mercedes-Benz C 220 CDI 203.008/208/708 (2005-2007)', '{"0W-30","5W-30","5W-40","10W-40","0W-40","15W-40"}', 6.5, 6.5, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('TU1K', '', 'Peugeot 206 1.1 HFY (1998-2000)', '{"10W-40","5W-30"}', 3, 3, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('TU5JP4', '', 'Peugeot 206 1.6 16V NFU (2001-2009)', '{"10W-40","5W-30"}', 3.25, 3.25, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('XUD9A', '', 'Peugeot Partner Combi 1.9 D DJY (1996-1998)', '{"5W-40","10W-40","15W-40"}', 4.25, 4.25, 'Guide des huiles Liqui Moly, consulté le 14/11/2026'),
('Z13DT', '', 'Opel Corsa C 1.3 CDTI (2003-2006)', '{"5W-30","5W-40"}', 3.2, 3.2, 'Guide des huiles Liqui Moly, consulté le 14/11/2026')
on conflict (code, variante) do update set description = excluded.description, viscosites = excluded.viscosites,
  litres_min = excluded.litres_min, litres_max = excluded.litres_max, source = excluded.source, modifie_le = now();

notify pgrst, 'reload schema';
