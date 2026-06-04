-- Compatibilités pour les nouveaux produits OE/PS/AP/K et nouveaux véhicules

insert into public.compatibilites (product_id, vehicule_id)
select distinct p.id, v.id
from public.products p
cross join public.vehicules v
where (
  -- OE667/1 — Renault Megane III/Clio IV 1.2 TCe
  (p.reference = 'OE667/1' and v.marque = 'Renault' and (
    (v.modele = 'Megane III' and v.motorisation like '%TCe%') or
    (v.modele = 'Clio IV' and v.motorisation like '%TCe%')
  ))
  or
  -- OE670 — Renault Captur / Nissan Juke 1.2 TCe / DIG-T
  (p.reference = 'OE670' and (
    (v.marque = 'Renault' and v.modele = 'Captur I') or
    (v.marque = 'Nissan' and v.modele = 'Juke')
  ))
  or
  -- OE670/1 — Peugeot/Citroën 1.2 PureTech
  (p.reference = 'OE670/1' and (
    (v.marque = 'Peugeot' and v.motorisation like '%PureTech%') or
    (v.marque = 'Citroën' and v.motorisation like '%PureTech%')
  ))
  or
  -- OE640 — VW/Audi 2.0 TDI
  (p.reference = 'OE640' and v.marque = 'Volkswagen' and v.motorisation like '%2.0 TDI%')
  or
  -- OE640/1 — VW 1.6 TDI
  (p.reference = 'OE640/1' and v.marque = 'Volkswagen' and v.motorisation like '%1.6 TDI%')
  or
  -- OE648/7 — BMW 320d/318d
  (p.reference = 'OE648/7' and v.marque = 'BMW' and v.modele like 'Série 3%' and v.carburant = 'diesel')
  or
  -- OE648/8 — BMW 525d/530d
  (p.reference = 'OE648/8' and v.marque = 'BMW' and v.modele like 'Série 5%' and v.carburant = 'diesel')
  or
  -- OE688 — Ford EcoBoost/EcoBlue
  (p.reference = 'OE688' and v.marque = 'Ford' and (v.motorisation like '%EcoBoost%' or v.motorisation like '%EcoBlue%'))
  or
  -- OE688/1 — Ford Focus III / Fiesta 1.5 TDCi
  (p.reference = 'OE688/1' and v.marque = 'Ford' and (v.modele like 'Focus%' or v.modele like 'Fiesta%') and v.motorisation like '%1.5%')
  or
  -- OE673 — Toyota Yaris/Auris
  (p.reference = 'OE673' and v.marque = 'Toyota' and (v.modele like 'Yaris%' or v.modele like 'Auris%'))
  or
  -- OE677 — Hyundai/Kia nouveaux
  (p.reference = 'OE677' and (
    (v.marque = 'Hyundai' and (v.modele like 'i10%' or v.modele like 'i20%' or v.modele like 'i30%')) or
    (v.marque = 'Kia' and (v.modele like 'Picanto%' or v.modele like 'Rio%' or v.modele like '%cee%'))
  ))
  or
  -- OE646/5 — Mercedes Classe C W205
  (p.reference = 'OE646/5' and v.marque = 'Mercedes' and v.modele like 'Classe C%' and v.carburant = 'diesel')
  or
  -- OE667/3 — Dacia Duster II / Sandero II
  (p.reference = 'OE667/3' and v.marque = 'Dacia' and (v.modele like 'Duster II%' or v.modele like 'Sandero II%' or v.modele like 'Logan II%'))
  or
  -- OE673/1 — Nissan Qashqai II
  (p.reference = 'OE673/1' and v.marque = 'Nissan' and v.modele like 'Qashqai%')
  or

  -- PS974/1 — Renault/Dacia 1.5 dCi Euro5/6
  (p.reference = 'PS974/1' and (
    (v.marque = 'Renault' and v.motorisation like '%1.5 dCi%') or
    (v.marque = 'Dacia' and v.motorisation like '%1.5 dCi%')
  ))
  or
  -- PS974/2 — Renault Captur/Clio IV 1.5 dCi
  (p.reference = 'PS974/2' and v.marque = 'Renault' and (v.modele like 'Clio IV%' or v.modele like 'Captur%') and v.carburant = 'diesel')
  or
  -- PS979 — Peugeot/Citroën 1.6 BlueHDi
  (p.reference = 'PS979' and (
    (v.marque = 'Peugeot' and (v.motorisation like '%BlueHDi%' or v.motorisation like '%HDi%')) or
    (v.marque = 'Citroën' and (v.motorisation like '%BlueHDi%' or v.motorisation like '%HDi%'))
  ))
  or
  -- PS979/1 — Peugeot 2008/308 II BlueHDi
  (p.reference = 'PS979/1' and (
    (v.marque = 'Peugeot' and v.modele in ('2008 I','308 II','3008 II') and v.carburant = 'diesel') or
    (v.marque = 'Citroën' and (v.modele like 'C3%' or v.modele = 'C-Elysee') and v.carburant = 'diesel')
  ))
  or
  -- PS981 — VW/Audi TDI nouveaux
  (p.reference = 'PS981' and v.marque = 'Volkswagen' and v.motorisation like '%TDI%' and v.annee_debut >= 2008)
  or
  -- PS983 — Ford 1.5 TDCi
  (p.reference = 'PS983' and v.marque = 'Ford' and v.motorisation like '%1.5 TDCi%')
  or
  -- PS984 — Toyota 1.4 D-4D
  (p.reference = 'PS984' and v.marque = 'Toyota' and v.motorisation like '%D-4D%' and v.motorisation like '%1.4%')
  or
  -- PS986 — Hyundai/Kia CRDi nouveaux
  (p.reference = 'PS986' and (
    (v.marque = 'Hyundai' and v.motorisation like '%CRDi%') or
    (v.marque = 'Kia' and v.motorisation like '%CRDi%')
  ))
  or

  -- AP139/5 — Renault Clio IV / Captur 1.5 dCi
  (p.reference = 'AP139/5' and v.marque = 'Renault' and (v.modele like 'Clio IV%' or v.modele like 'Captur%') and v.carburant = 'diesel')
  or
  -- AP139/6 — Renault Clio IV / Captur TCe
  (p.reference = 'AP139/6' and v.marque = 'Renault' and (v.modele like 'Clio IV%' or v.modele like 'Captur%') and v.carburant = 'essence')
  or
  -- AP183/4 — Renault Megane IV
  (p.reference = 'AP183/4' and v.marque = 'Renault' and (v.modele like 'Megane IV%' or v.modele like 'Scenic%'))
  or
  -- AP144/10 — Dacia Duster II / Lodgy
  (p.reference = 'AP144/10' and v.marque = 'Dacia' and (v.modele like 'Duster II%' or v.modele like 'Lodgy%'))
  or
  -- AP144/11 — Dacia Sandero II / Logan II
  (p.reference = 'AP144/11' and v.marque = 'Dacia' and (v.modele like 'Sandero II%' or v.modele like 'Logan II%'))
  or
  -- AP171/3 — Peugeot 208 I / 2008 I
  (p.reference = 'AP171/3' and v.marque = 'Peugeot' and (v.modele like '208 I%' or v.modele like '2008 I%'))
  or
  -- AP171/4 — Peugeot 308 II / 3008 II
  (p.reference = 'AP171/4' and v.marque = 'Peugeot' and (v.modele like '308 II%' or v.modele like '3008 II%'))
  or
  -- AP148/7 — Citroën C3 II / C3 III
  (p.reference = 'AP148/7' and v.marque = 'Citroën' and v.modele like 'C3%')
  or
  -- AP148/8 — Citroën C-Elysee / Berlingo III
  (p.reference = 'AP148/8' and v.marque = 'Citroën' and (v.modele like 'C-Elysee%' or v.modele like 'Berlingo III%'))
  or
  -- AP177/1 — VW Golf VI/VII TSI
  (p.reference = 'AP177/1' and v.marque = 'Volkswagen' and v.modele like 'Golf V%' and v.carburant = 'essence')
  or
  -- AP177/2 — VW Polo VI / Tiguan II
  (p.reference = 'AP177/2' and v.marque = 'Volkswagen' and (v.modele like 'Polo VI%' or v.modele like 'Tiguan II%'))
  or
  -- AP071/7 — Ford Focus III / Fiesta VI/VII EcoBoost
  (p.reference = 'AP071/7' and v.marque = 'Ford' and (v.modele like 'Focus III%' or v.modele like 'Fiesta V%' or v.modele like 'Fiesta VI%' or v.modele like 'Fiesta VII%'))
  or
  -- AP159/5 — Toyota Yaris III / Auris
  (p.reference = 'AP159/5' and v.marque = 'Toyota' and (v.modele like 'Yaris II%' or v.modele like 'Yaris III%' or v.modele like 'Auris%'))
  or
  -- AP153/3 — Hyundai i10/i20 II
  (p.reference = 'AP153/3' and v.marque = 'Hyundai' and (v.modele like 'i10%' or v.modele like 'i20 II%'))
  or
  -- AP180/3 — Kia Picanto II / Rio III
  (p.reference = 'AP180/3' and v.marque = 'Kia' and (v.modele like 'Picanto II%' or v.modele like 'Rio III%'))
  or
  -- AP173/3 — Nissan Micra IV / Juke
  (p.reference = 'AP173/3' and v.marque = 'Nissan' and (v.modele like 'Micra IV%' or v.modele like 'Juke%'))
  or
  -- AP200/3 — Mercedes Classe A W176
  (p.reference = 'AP200/3' and v.marque = 'Mercedes' and (v.modele like 'Classe A%' or v.modele like 'Classe C W205%'))
  or
  -- AP188/2 — Suzuki Swift III / Vitara II
  (p.reference = 'AP188/2' and v.marque = 'Suzuki' and (v.modele like 'Swift III%' or v.modele like 'Vitara II%'))
  or

  -- K1321 — Renault Clio IV / Captur I
  (p.reference = 'K1321' and v.marque = 'Renault' and (v.modele like 'Clio IV%' or v.modele like 'Captur I%'))
  or
  -- K1321/1 — Renault Megane IV / Scenic III
  (p.reference = 'K1321/1' and v.marque = 'Renault' and (v.modele like 'Megane IV%' or v.modele like 'Scenic III%'))
  or
  -- K1325 — Dacia Duster II / Lodgy
  (p.reference = 'K1325' and v.marque = 'Dacia' and (v.modele like 'Duster II%' or v.modele like 'Lodgy%' or v.modele like 'Dokker%'))
  or
  -- K1325/1 — Dacia Sandero II / Logan II
  (p.reference = 'K1325/1' and v.marque = 'Dacia' and (v.modele like 'Sandero II%' or v.modele like 'Logan II%'))
  or
  -- K1316 — Peugeot 208 I / 2008 I
  (p.reference = 'K1316' and v.marque = 'Peugeot' and (v.modele like '208%' or v.modele like '2008%'))
  or
  -- K1316/1 — Peugeot 308 II / 3008 II
  (p.reference = 'K1316/1' and v.marque = 'Peugeot' and (v.modele like '308 II%' or v.modele like '3008 II%'))
  or
  -- K1316/2 — Citroën C3 II / C3 III / C-Elysee
  (p.reference = 'K1316/2' and v.marque = 'Citroën' and (v.modele like 'C3 II%' or v.modele like 'C3 III%' or v.modele like 'C-Elysee%'))
  or
  -- K1330 — VW Polo VI / Golf VII
  (p.reference = 'K1330' and v.marque = 'Volkswagen' and (v.modele like 'Polo VI%' or v.modele like 'Golf VII%'))
  or
  -- K1335 — Ford Focus III / Fiesta VI/VII
  (p.reference = 'K1335' and v.marque = 'Ford' and (v.modele like 'Focus III%' or v.modele like 'Fiesta VI%' or v.modele like 'Fiesta VII%'))
  or
  -- K1340 — Toyota Yaris III / Auris
  (p.reference = 'K1340' and v.marque = 'Toyota' and (v.modele like 'Yaris II%' or v.modele like 'Yaris III%' or v.modele like 'Auris%'))
  or
  -- K1340/1 — Toyota C-HR / RAV4 IV
  (p.reference = 'K1340/1' and v.marque = 'Toyota' and (v.modele like 'C-HR%' or v.modele like 'RAV4%'))
  or
  -- K1344 — Hyundai i20 II / i30 II
  (p.reference = 'K1344' and v.marque = 'Hyundai' and (v.modele like 'i20 II%' or v.modele like 'i30 II%'))
  or
  -- K1344/1 — Hyundai Tucson II / Santa Fe III
  (p.reference = 'K1344/1' and v.marque = 'Hyundai' and (v.modele like 'Tucson II%' or v.modele like 'Santa Fe%'))
  or
  -- K1338 — Kia Picanto II / Rio III
  (p.reference = 'K1338' and v.marque = 'Kia' and (v.modele like 'Picanto II%' or v.modele like 'Rio III%'))
  or
  -- K1338/1 — Kia Sportage III/IV / cee`d II
  (p.reference = 'K1338/1' and v.marque = 'Kia' and (v.modele like 'Sportage%' or v.modele like '%cee%'))
  or
  -- K1350 — Nissan Micra IV / Juke / Qashqai II
  (p.reference = 'K1350' and v.marque = 'Nissan' and (v.modele like 'Micra IV%' or v.modele like 'Juke%' or v.modele like 'Qashqai II%'))
  or
  -- K1360 — Mercedes Classe A W176
  (p.reference = 'K1360' and v.marque = 'Mercedes' and v.modele like 'Classe A%')
  or
  -- K1360/1 — Mercedes Classe C W205
  (p.reference = 'K1360/1' and v.marque = 'Mercedes' and v.modele like 'Classe C W205%')
  or
  -- K1355 — Suzuki Swift III / Vitara II
  (p.reference = 'K1355' and v.marque = 'Suzuki' and (v.modele like 'Swift III%' or v.modele like 'Vitara II%'))
)
on conflict (product_id, vehicule_id) do nothing;
