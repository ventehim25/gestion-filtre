-- ============================================================
-- NOUVEAUX VÉHICULES (modèles récents marché marocain)
-- ============================================================
insert into public.vehicules (marque, modele, annee_debut, annee_fin, motorisation, carburant, cylindree) values

-- RENAULT nouveaux modèles
('Renault','Clio IV',       2012,2019,'0.9 TCe 90cv',   'essence','898'),
('Renault','Clio IV',       2012,2019,'1.2 TCe 120cv',  'essence','1149'),
('Renault','Clio IV',       2012,2019,'1.5 dCi 75cv',   'diesel','1461'),
('Renault','Clio IV',       2012,2019,'1.5 dCi 90cv',   'diesel','1461'),
('Renault','Captur I',      2013,2019,'0.9 TCe 90cv',   'essence','898'),
('Renault','Captur I',      2013,2019,'1.2 TCe 120cv',  'essence','1149'),
('Renault','Captur I',      2013,2019,'1.5 dCi 90cv',   'diesel','1461'),
('Renault','Megane III',    2009,2016,'1.2 TCe 115cv',  'essence','1149'),
('Renault','Megane IV',     2016,2023,'1.3 TCe 115cv',  'essence','1332'),
('Renault','Megane IV',     2016,2023,'1.5 dCi 110cv',  'diesel','1461'),
('Renault','Scenic III',    2009,2016,'1.5 dCi 110cv',  'diesel','1461'),
('Renault','Trafic III',    2014,2022,'1.6 dCi 95cv',   'diesel','1598'),
('Renault','Trafic III',    2014,2022,'2.0 dCi 120cv',  'diesel','1995'),
('Renault','Master III',    2010,2019,'2.3 dCi 100cv',  'diesel','2299'),
('Renault','Master III',    2010,2019,'2.3 dCi 135cv',  'diesel','2299'),

-- DACIA nouveaux modèles
('Dacia','Logan II',        2013,2020,'0.9 TCe',        'essence','898'),
('Dacia','Logan II',        2013,2020,'1.2 16V',        'essence','1149'),
('Dacia','Logan II',        2013,2020,'1.5 dCi 75cv',   'diesel','1461'),
('Dacia','Logan II',        2013,2020,'1.5 dCi 90cv',   'diesel','1461'),
('Dacia','Sandero II',      2013,2020,'0.9 TCe',        'essence','898'),
('Dacia','Sandero II',      2013,2020,'1.2 16V',        'essence','1149'),
('Dacia','Duster II',       2018,2024,'1.0 TCe 100cv',  'essence','999'),
('Dacia','Duster II',       2018,2024,'1.3 TCe 130cv',  'essence','1332'),
('Dacia','Duster II',       2018,2024,'1.5 dCi 95cv',   'diesel','1461'),
('Dacia','Lodgy',           2012,2022,'1.2 TCe',        'essence','1149'),
('Dacia','Lodgy',           2012,2022,'1.5 dCi 90cv',   'diesel','1461'),
('Dacia','Lodgy',           2012,2022,'1.5 dCi 110cv',  'diesel','1461'),

-- PEUGEOT nouveaux modèles
('Peugeot','208 I',         2012,2019,'1.0 VTi',        'essence','999'),
('Peugeot','208 I',         2012,2019,'1.2 PureTech',   'essence','1199'),
('Peugeot','208 I',         2012,2019,'1.6 e-HDi 92cv', 'diesel','1560'),
('Peugeot','2008 I',        2013,2019,'1.2 PureTech',   'essence','1199'),
('Peugeot','2008 I',        2013,2019,'1.6 BlueHDi',    'diesel','1560'),
('Peugeot','308 II',        2013,2021,'1.2 PureTech',   'essence','1199'),
('Peugeot','308 II',        2013,2021,'1.6 BlueHDi',    'diesel','1560'),
('Peugeot','3008 II',       2016,2023,'1.2 PureTech',   'essence','1199'),
('Peugeot','3008 II',       2016,2023,'1.6 BlueHDi',    'diesel','1560'),
('Peugeot','5008 II',       2017,2023,'1.5 BlueHDi',    'diesel','1499'),
('Peugeot','Partner III',   2018,2023,'1.5 BlueHDi',    'diesel','1499'),

-- CITROËN nouveaux modèles
('Citroën','C3 II',         2009,2016,'1.4',            'essence','1360'),
('Citroën','C3 II',         2009,2016,'1.6 HDi',        'diesel','1560'),
('Citroën','C3 III',        2016,2023,'1.2 PureTech',   'essence','1199'),
('Citroën','C3 III',        2016,2023,'1.5 BlueHDi',    'diesel','1499'),
('Citroën','C4 II',         2010,2018,'1.6 VTi',        'essence','1587'),
('Citroën','C4 II',         2010,2018,'1.6 HDi',        'diesel','1560'),
('Citroën','C-Elysee',      2012,2020,'1.2 PureTech',   'essence','1199'),
('Citroën','C-Elysee',      2012,2020,'1.6 BlueHDi',    'diesel','1560'),
('Citroën','Berlingo III',  2018,2023,'1.5 BlueHDi',    'diesel','1499'),

-- VOLKSWAGEN nouveaux modèles
('Volkswagen','Golf VI',    2008,2012,'1.2 TSI',        'essence','1197'),
('Volkswagen','Golf VI',    2008,2012,'1.4 TSI',        'essence','1390'),
('Volkswagen','Golf VI',    2008,2012,'1.6 TDI',        'diesel','1598'),
('Volkswagen','Golf VI',    2008,2012,'2.0 TDI',        'diesel','1968'),
('Volkswagen','Golf VII',   2012,2020,'1.0 TSI',        'essence','999'),
('Volkswagen','Golf VII',   2012,2020,'1.2 TSI',        'essence','1197'),
('Volkswagen','Golf VII',   2012,2020,'1.4 TSI',        'essence','1395'),
('Volkswagen','Golf VII',   2012,2020,'1.6 TDI',        'diesel','1598'),
('Volkswagen','Golf VII',   2012,2020,'2.0 TDI',        'diesel','1968'),
('Volkswagen','Polo V',     2009,2017,'1.0',            'essence','999'),
('Volkswagen','Polo V',     2009,2017,'1.2 TSI',        'essence','1197'),
('Volkswagen','Polo V',     2009,2017,'1.6 TDI',        'diesel','1598'),
('Volkswagen','Polo VI',    2017,2024,'1.0 TSI',        'essence','999'),
('Volkswagen','Polo VI',    2017,2024,'1.6 TDI',        'diesel','1598'),
('Volkswagen','Tiguan',     2007,2016,'1.4 TSI',        'essence','1390'),
('Volkswagen','Tiguan',     2007,2016,'2.0 TDI',        'diesel','1968'),
('Volkswagen','Tiguan II',  2016,2023,'1.5 TSI',        'essence','1498'),
('Volkswagen','Tiguan II',  2016,2023,'2.0 TDI',        'diesel','1968'),

-- FORD nouveaux modèles
('Ford','Focus III',        2011,2018,'1.0 EcoBoost',   'essence','999'),
('Ford','Focus III',        2011,2018,'1.5 EcoBoost',   'essence','1499'),
('Ford','Focus III',        2011,2018,'1.5 TDCi',       'diesel','1499'),
('Ford','Focus III',        2011,2018,'2.0 TDCi',       'diesel','1997'),
('Ford','Fiesta VI',        2008,2017,'1.25',           'essence','1242'),
('Ford','Fiesta VI',        2008,2017,'1.4',            'essence','1388'),
('Ford','Fiesta VI',        2008,2017,'1.5 TDCi',       'diesel','1499'),
('Ford','Fiesta VII',       2017,2023,'1.0 EcoBoost',   'essence','999'),
('Ford','Fiesta VII',       2017,2023,'1.5 TDCi',       'diesel','1499'),
('Ford','Transit Connect',  2013,2022,'1.5 EcoBlue',    'diesel','1499'),
('Ford','Ranger',           2012,2022,'2.2 TDCi',       'diesel','2198'),
('Ford','Ranger',           2012,2022,'3.2 TDCi',       'diesel','3198'),

-- TOYOTA nouveaux modèles
('Toyota','Yaris II',       2005,2011,'1.0 VVT-i',      'essence','998'),
('Toyota','Yaris II',       2005,2011,'1.3 VVT-i',      'essence','1298'),
('Toyota','Yaris II',       2005,2011,'1.4 D-4D',       'diesel','1364'),
('Toyota','Yaris III',      2011,2020,'1.0 VVT-i',      'essence','998'),
('Toyota','Yaris III',      2011,2020,'1.33 VVT-i',     'essence','1329'),
('Toyota','Auris',          2006,2018,'1.4 D-4D',       'diesel','1364'),
('Toyota','Auris',          2006,2018,'1.6 VVT-i',      'essence','1598'),
('Toyota','C-HR',           2016,2023,'1.2 T',          'essence','1197'),
('Toyota','C-HR',           2016,2023,'2.0 Hybride',    'hybride','1987'),

-- HYUNDAI nouveaux modèles
('Hyundai','i10 II',        2013,2019,'1.0',            'essence','998'),
('Hyundai','i10 II',        2013,2019,'1.2',            'essence','1248'),
('Hyundai','i20 II',        2014,2020,'1.2',            'essence','1248'),
('Hyundai','i20 II',        2014,2020,'1.4 CRDi',       'diesel','1396'),
('Hyundai','i30 II',        2012,2017,'1.4',            'essence','1396'),
('Hyundai','i30 II',        2012,2017,'1.6 CRDi',       'diesel','1582'),
('Hyundai','Tucson II',     2015,2021,'1.7 CRDi',       'diesel','1685'),
('Hyundai','Tucson II',     2015,2021,'2.0 CRDi',       'diesel','1995'),
('Hyundai','Santa Fe III',  2012,2018,'2.2 CRDi',       'diesel','2199'),

-- KIA nouveaux modèles
('Kia','Picanto II',        2011,2017,'1.0',            'essence','998'),
('Kia','Picanto II',        2011,2017,'1.2',            'essence','1248'),
('Kia','Rio III',           2011,2017,'1.25',           'essence','1248'),
('Kia','Rio III',           2011,2017,'1.4 CRDi',       'diesel','1396'),
('Kia','cee`d II',          2012,2018,'1.4',            'essence','1396'),
('Kia','cee`d II',          2012,2018,'1.6 CRDi',       'diesel','1582'),
('Kia','Sportage III',      2010,2016,'2.0 CRDi',       'diesel','1995'),
('Kia','Sportage IV',       2016,2022,'1.7 CRDi',       'diesel','1685'),
('Kia','Sportage IV',       2016,2022,'2.0 CRDi',       'diesel','1995'),

-- NISSAN nouveaux modèles
('Nissan','Micra IV',       2010,2017,'1.2',            'essence','1198'),
('Nissan','Micra IV',       2010,2017,'1.5 dCi',        'diesel','1461'),
('Nissan','Juke',           2010,2019,'1.2 DIG-T',      'essence','1197'),
('Nissan','Juke',           2010,2019,'1.5 dCi',        'diesel','1461'),
('Nissan','Qashqai II',     2013,2021,'1.2 DIG-T',      'essence','1197'),
('Nissan','Qashqai II',     2013,2021,'1.6 dCi',        'diesel','1598'),

-- MERCEDES nouveaux modèles
('Mercedes','Classe A W176',2012,2018,'1.6',            'essence','1595'),
('Mercedes','Classe A W176',2012,2018,'2.2 CDI',        'diesel','2143'),
('Mercedes','Classe C W205',2014,2021,'2.0',            'essence','1991'),
('Mercedes','Classe C W205',2014,2021,'2.2 CDI',        'diesel','2143'),
('Mercedes','Sprinter W906',2006,2018,'2.2 CDI',        'diesel','2143'),
('Mercedes','Sprinter W906',2006,2018,'3.0 CDI',        'diesel','2987'),
('Mercedes','Vito W639',    2003,2014,'2.2 CDI',        'diesel','2148'),

-- SUZUKI
('Suzuki','Swift II',       2004,2010,'1.3',            'essence','1328'),
('Suzuki','Swift II',       2004,2010,'1.5',            'essence','1490'),
('Suzuki','Swift II',       2004,2010,'1.3 DDiS',       'diesel','1248'),
('Suzuki','Swift III',      2010,2017,'1.2',            'essence','1242'),
('Suzuki','Vitara II',      2014,2023,'1.0 Boosterjet', 'essence','998'),
('Suzuki','Vitara II',      2014,2023,'1.6',            'essence','1586'),
('Suzuki','Vitara II',      2014,2023,'1.6 DDiS',       'diesel','1598')

on conflict do nothing;

-- ============================================================
-- NOUVEAUX PRODUITS — FILTRON OE (filtres huile cartouche)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values
('Filtre huile Filtron — Renault Megane III/Clio IV 1.2 TCe',   'فلتر زيت فيلترون — رينو ميغان III كليو IV 1.2 TCe', 'OE667/1',   'filtre_huile', 20, 34, 10, 3),
('Filtre huile Filtron — Renault Captur 1.2 TCe / Nissan Juke', 'فلتر زيت فيلترون — رينو كابتور نيسان جوك',          'OE670',     'filtre_huile', 20, 34, 10, 3),
('Filtre huile Filtron — Peugeot/Citroën 1.2 PureTech',        'فلتر زيت فيلترون — بيجو سيتروين 1.2 PureTech',      'OE670/1',   'filtre_huile', 20, 34, 12, 3),
('Filtre huile Filtron — VW/Audi/Skoda 2.0 TDI CR',            'فلتر زيت فيلترون — فولكسفاغن أودي سكودا 2.0 TDI',   'OE640',     'filtre_huile', 22, 37,  8, 3),
('Filtre huile Filtron — VW/Seat/Skoda 1.6 TDI',               'فلتر زيت فيلترون — فولكسفاغن 1.6 TDI',              'OE640/1',   'filtre_huile', 20, 34,  8, 3),
('Filtre huile Filtron — BMW N47 316d/318d/320d',               'فلتر زيت فيلترون — بي إم دبليو N47 318d 320d',      'OE648/7',   'filtre_huile', 23, 39,  8, 3),
('Filtre huile Filtron — BMW N57 525d/530d',                    'فلتر زيت فيلترون — بي إم دبليو N57 525d 530d',      'OE648/8',   'filtre_huile', 24, 40,  6, 3),
('Filtre huile Filtron — Ford 1.0 EcoBoost / 1.5 EcoBlue',     'فلتر زيت فيلترون — فورد إيكوبوست إيكوبلو',          'OE688',     'filtre_huile', 20, 34, 10, 3),
('Filtre huile Filtron — Ford Focus III/Fiesta VII 1.5 TDCi',   'فلتر زيت فيلترون — فورد فوكس فيستا 1.5 TDCi',      'OE688/1',   'filtre_huile', 20, 34,  8, 3),
('Filtre huile Filtron — Toyota Yaris/Auris 1.33/1.4 D-4D',    'فلتر زيت فيلترون — تويوتا ياريس أوريس',             'OE673',     'filtre_huile', 19, 32, 10, 3),
('Filtre huile Filtron — Hyundai/Kia 1.0/1.2/1.4 (nouv.)',     'فلتر زيت فيلترون — هيونداي كيا محرك جديد',           'OE677',     'filtre_huile', 18, 30, 10, 3),
('Filtre huile Filtron — Mercedes Classe C W205 / E W213 CDI',  'فلتر زيت فيلترون — مرسيدس كلاس C W205',             'OE646/5',   'filtre_huile', 24, 40,  6, 3),
('Filtre huile Filtron — Opel/Vauxhall 1.0/1.2/1.4 Turbo',     'فلتر زيت فيلترون — أوبل توربو جديد',                'OE683',     'filtre_huile', 18, 30,  8, 3),
('Filtre huile Filtron — Dacia Duster II / Sandero II 1.0 TCe', 'فلتر زيت فيلترون — داسيا دوستر II سانديرو II',      'OE667/3',   'filtre_huile', 18, 30, 10, 3),
('Filtre huile Filtron — Nissan Qashqai II 1.2 DIG-T / 1.6 dCi','فلتر زيت فيلترون — نيسان قاشقاي II',              'OE673/1',   'filtre_huile', 20, 34,  8, 3)
on conflict (reference) do nothing;

-- ============================================================
-- NOUVEAUX PRODUITS — FILTRON PS (filtres carburant, nouvelles séries)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values
('Filtre carburant Filtron — Renault/Dacia 1.5 dCi Euro5/6',   'فلتر وقود فيلترون — رينو داسيا 1.5 dCi Euro5',      'PS974/1',   'filtre_carburant', 22, 37, 10, 3),
('Filtre carburant Filtron — Renault Captur/Clio IV 1.5 dCi',  'فلتر وقود فيلترون — رينو كابتور كليو IV ديزل',       'PS974/2',   'filtre_carburant', 22, 37,  8, 3),
('Filtre carburant Filtron — Peugeot/Citroën 1.6 BlueHDi',     'فلتر وقود فيلترون — بيجو سيتروين 1.6 BlueHDi',      'PS979',     'filtre_carburant', 21, 36, 10, 3),
('Filtre carburant Filtron — Peugeot 2008/308 II / C3 III BlueHDi','فلتر وقود فيلترون — بيجو 2008 سيتروين C3 ديزل', 'PS979/1',   'filtre_carburant', 21, 36,  8, 3),
('Filtre carburant Filtron — VW/Audi/Seat 1.6/2.0 TDI (nouv.)', 'فلتر وقود فيلترون — فولكسفاغن TDI جديد',           'PS981',     'filtre_carburant', 22, 37,  8, 3),
('Filtre carburant Filtron — Ford Focus III/Fiesta 1.5 TDCi',   'فلتر وقود فيلترون — فورد 1.5 TDCi جديد',            'PS983',     'filtre_carburant', 21, 36,  8, 3),
('Filtre carburant Filtron — Toyota Yaris/Auris 1.4 D-4D',      'فلتر وقود فيلترون — تويوتا ياريس أوريس ديزل',       'PS984',     'filtre_carburant', 20, 34,  6, 3),
('Filtre carburant Filtron — Hyundai/Kia 1.4/1.6/2.0 CRDi nouv','فلتر وقود فيلترون — هيونداي كيا CRDi جديد',        'PS986',     'filtre_carburant', 20, 34,  6, 3)
on conflict (reference) do nothing;

-- ============================================================
-- NOUVEAUX PRODUITS — FILTRON AP (filtres air, nouvelles séries)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values
('Filtre air Filtron — Renault Clio IV / Captur 1.5 dCi',       'فلتر هواء فيلترون — رينو كليو IV كابتور ديزل',       'AP139/5',   'filtre_air', 14, 24, 12, 3),
('Filtre air Filtron — Renault Clio IV / Captur 0.9/1.2 TCe',   'فلتر هواء فيلترون — رينو كليو IV كابتور بنزين',      'AP139/6',   'filtre_air', 14, 24, 10, 3),
('Filtre air Filtron — Renault Megane IV / Scenic IV',           'فلتر هواء فيلترون — رينو ميغان IV',                  'AP183/4',   'filtre_air', 15, 25,  8, 3),
('Filtre air Filtron — Dacia Duster II / Lodgy 1.5 dCi',         'فلتر هواء فيلترون — داسيا دوستر II لوجي',            'AP144/10',  'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Dacia Sandero II / Logan II 1.2/0.9 TCe', 'فلتر هواء فيلترون — داسيا سانديرو II لوغان II',      'AP144/11',  'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Peugeot 208 I / 2008 I 1.2/1.6 e-HDi',   'فلتر هواء فيلترون — بيجو 208 2008',                  'AP171/3',   'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Peugeot 308 II / 3008 II 1.2/1.6 BlueHDi','فلتر هواء فيلترون — بيجو 308 II 3008 II',           'AP171/4',   'filtre_air', 14, 24,  8, 3),
('Filtre air Filtron — Citroën C3 II / C3 III 1.2/1.4 HDi',     'فلتر هواء فيلترون — سيتروين C3 II C3 III',           'AP148/7',   'filtre_air', 13, 22,  8, 3),
('Filtre air Filtron — Citroën C-Elysee / Berlingo III',         'فلتر هواء فيلترون — سيتروين سي إليزيه برلينغو III',  'AP148/8',   'filtre_air', 13, 22,  8, 3),
('Filtre air Filtron — VW Golf VI/VII 1.0/1.2/1.4 TSI',         'فلتر هواء فيلترون — فولكسفاغن غولف VI VII TSI',       'AP177/1',   'filtre_air', 14, 24, 10, 3),
('Filtre air Filtron — VW Polo VI / Tiguan II 1.0/1.5 TSI',     'فلتر هواء فيلترون — فولكسفاغن بولو VI تيغوان II',     'AP177/2',   'filtre_air', 14, 24,  8, 3),
('Filtre air Filtron — Ford Focus III / Fiesta VI/VII EcoBoost', 'فلتر هواء فيلترون — فورد فوكس III فيستا EcoBoost',   'AP071/7',   'filtre_air', 13, 22, 10, 3),
('Filtre air Filtron — Toyota Yaris III / Auris 1.33/1.4 D-4D', 'فلتر هواء فيلترون — تويوتا ياريس III أوريس',         'AP159/5',   'filtre_air', 13, 22,  8, 3),
('Filtre air Filtron — Hyundai i10/i20 II 1.0/1.2',             'فلتر هواء فيلترون — هيونداي i10 i20 II',             'AP153/3',   'filtre_air', 12, 20,  8, 3),
('Filtre air Filtron — Kia Picanto II / Rio III 1.0/1.25',       'فلتر هواء فيلترون — كيا بيكانتو II ريو III',         'AP180/3',   'filtre_air', 11, 19,  8, 3),
('Filtre air Filtron — Nissan Micra IV / Juke 1.2/1.5 dCi',     'فلتر هواء فيلترون — نيسان ميكرا IV جوك',             'AP173/3',   'filtre_air', 13, 22,  8, 3),
('Filtre air Filtron — Mercedes Classe A W176 / Classe C W205',  'فلتر هواء فيلترون — مرسيدس كلاس A W176',             'AP200/3',   'filtre_air', 18, 30,  6, 3),
('Filtre air Filtron — Suzuki Swift III / Vitara II 1.2/1.6',    'فلتر هواء فيلترون — سوزوكي سويفت III فيتارا II',     'AP188/2',   'filtre_air', 12, 20,  6, 3)
on conflict (reference) do nothing;

-- ============================================================
-- NOUVEAUX PRODUITS — FILTRON K (filtres habitacle, nouvelles séries)
-- ============================================================
insert into public.products (nom_fr, nom_ar, reference, categorie, prix_achat, prix_vente, stock, stock_min) values
('Filtre habitacle Filtron — Renault Clio IV / Captur I',        'فلتر مقصورة فيلترون — رينو كليو IV كابتور',          'K1321',     'filtre_habitacle', 15, 27, 12, 3),
('Filtre habitacle Filtron — Renault Megane IV / Scenic III',    'فلتر مقصورة فيلترون — رينو ميغان IV سيناريك',        'K1321/1',   'filtre_habitacle', 15, 27,  8, 3),
('Filtre habitacle Filtron — Dacia Duster II / Lodgy / Dokker',  'فلتر مقصورة فيلترون — داسيا دوستر II لوجي',          'K1325',     'filtre_habitacle', 14, 26, 10, 3),
('Filtre habitacle Filtron — Dacia Sandero II / Logan II',       'فلتر مقصورة فيلترون — داسيا سانديرو II لوغان II',     'K1325/1',   'filtre_habitacle', 14, 26, 10, 3),
('Filtre habitacle Filtron — Peugeot 208 I / 2008 I',           'فلتر مقصورة فيلترون — بيجو 208 2008',                'K1316',     'filtre_habitacle', 14, 25, 10, 3),
('Filtre habitacle Filtron — Peugeot 308 II / 3008 II',         'فلتر مقصورة فيلترون — بيجو 308 II 3008 II',          'K1316/1',   'filtre_habitacle', 15, 27,  8, 3),
('Filtre habitacle Filtron — Citroën C3 II / C3 III / C-Elysee','فلتر مقصورة فيلترون — سيتروين C3 II III سي إليزيه',  'K1316/2',   'filtre_habitacle', 14, 25,  8, 3),
('Filtre habitacle Filtron — VW Polo VI / Golf VII/VIII',        'فلتر مقصورة فيلترون — فولكسفاغن بولو VI غولف VII',   'K1330',     'filtre_habitacle', 15, 26,  8, 3),
('Filtre habitacle Filtron — Ford Focus III / Fiesta VI/VII',    'فلتر مقصورة فيلترون — فورد فوكس III فيستا VI VII',   'K1335',     'filtre_habitacle', 14, 25,  8, 3),
('Filtre habitacle Filtron — Toyota Yaris III/IV / Auris',       'فلتر مقصورة فيلترون — تويوتا ياريس III أوريس',       'K1340',     'filtre_habitacle', 14, 25,  8, 3),
('Filtre habitacle Filtron — Toyota C-HR / RAV4 IV',             'فلتر مقصورة فيلترون — تويوتا C-HR راف4 IV',          'K1340/1',   'filtre_habitacle', 15, 27,  6, 3),
('Filtre habitacle Filtron — Hyundai i20 II / i30 II',           'فلتر مقصورة فيلترون — هيونداي i20 II i30 II',        'K1344',     'filtre_habitacle', 13, 24,  8, 3),
('Filtre habitacle Filtron — Hyundai Tucson II / Santa Fe III',  'فلتر مقصورة فيلترون — هيونداي توسان II سانتا في',    'K1344/1',   'filtre_habitacle', 14, 26,  6, 3),
('Filtre habitacle Filtron — Kia Picanto II/III / Rio III',      'فلتر مقصورة فيلترون — كيا بيكانتو II ريو III',       'K1338',     'filtre_habitacle', 13, 24,  8, 3),
('Filtre habitacle Filtron — Kia Sportage III/IV / cee`d II',    'فلتر مقصورة فيلترون — كيا سبورتاج III IV',           'K1338/1',   'filtre_habitacle', 14, 26,  6, 3),
('Filtre habitacle Filtron — Nissan Micra IV / Juke / Qashqai II','فلتر مقصورة فيلترون — نيسان ميكرا IV جوك قاشقاي',  'K1350',     'filtre_habitacle', 14, 25,  8, 3),
('Filtre habitacle Filtron — Mercedes Classe A W176 / GLA',      'فلتر مقصورة فيلترون — مرسيدس كلاس A W176 GLA',       'K1360',     'filtre_habitacle', 17, 30,  6, 3),
('Filtre habitacle Filtron — Mercedes Classe C W205 / E W213',   'فلتر مقصورة فيلترون — مرسيدس كلاس C W205',           'K1360/1',   'filtre_habitacle', 18, 32,  6, 3),
('Filtre habitacle Filtron — Suzuki Swift III / Vitara II / S-Cross','فلتر مقصورة فيلترون — سوزوكي سويفت III فيتارا II','K1355',    'filtre_habitacle', 13, 23,  6, 3)
on conflict (reference) do nothing;
