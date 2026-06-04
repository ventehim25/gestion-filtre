-- Auto-populate compatibilites by matching product names to vehicules
-- Each product's nom_fr contains the car make/model (pattern: "... — Make Model Engine")

insert into public.compatibilites (product_id, vehicule_id)
select distinct p.id, v.id
from public.products p
cross join public.vehicules v
where (
  -- RENAULT CLIO
  (p.nom_fr ilike '%Renault Clio%' and v.marque = 'Renault' and v.modele ilike 'Clio%')
  or
  -- RENAULT MEGANE
  (p.nom_fr ilike '%Renault Megane%' and v.marque = 'Renault' and v.modele ilike 'Mégane%')
  or
  -- RENAULT SYMBOL
  (p.nom_fr ilike '%Renault Symbol%' and v.marque = 'Renault' and v.modele ilike 'Symbol%')
  or
  -- RENAULT KANGOO
  (p.nom_fr ilike '%Renault Kangoo%' and v.marque = 'Renault' and v.modele ilike 'Kangoo%')
  or
  -- RENAULT SCENIC
  (p.nom_fr ilike '%Renault Scenic%' and v.marque = 'Renault' and v.modele ilike 'Scénic%')
  or
  -- RENAULT LAGUNA
  (p.nom_fr ilike '%Renault Laguna%' and v.marque = 'Renault' and v.modele ilike 'Laguna%')
  or
  -- RENAULT MASTER / TRAFIC
  (p.nom_fr ilike '%Renault Master%' and v.marque = 'Renault' and v.modele ilike 'Master%')
  or
  (p.nom_fr ilike '%Renault Trafic%' and v.marque = 'Renault' and v.modele ilike 'Trafic%')
  or
  -- DACIA LOGAN / SANDERO
  (p.nom_fr ilike '%Dacia Logan%' and v.marque = 'Dacia' and v.modele ilike 'Logan%')
  or
  (p.nom_fr ilike '%Logan/Sandero%' and v.marque = 'Dacia' and (v.modele ilike 'Logan%' or v.modele ilike 'Sandero%'))
  or
  -- DACIA SANDERO
  (p.nom_fr ilike '%Dacia Sandero%' and v.marque = 'Dacia' and v.modele ilike 'Sandero%')
  or
  -- DACIA DUSTER
  (p.nom_fr ilike '%Dacia Duster%' and v.marque = 'Dacia' and v.modele ilike 'Duster%')
  or
  -- DACIA DOKKER / LODGY
  (p.nom_fr ilike '%Dacia Dokker%' and v.marque = 'Dacia' and v.modele ilike 'Dokker%')
  or
  (p.nom_fr ilike '%Dacia Lodgy%' and v.marque = 'Dacia' and v.modele ilike 'Lodgy%')
  or
  -- PEUGEOT 206/207
  (p.nom_fr ilike '%Peugeot 206%' and v.marque = 'Peugeot' and (v.modele = '206' or v.modele = '207'))
  or
  (p.nom_fr ilike '%Peugeot 207%' and v.marque = 'Peugeot' and v.modele = '207')
  or
  (p.nom_fr ilike '%206/207%' and v.marque = 'Peugeot' and (v.modele = '206' or v.modele = '207'))
  or
  -- PEUGEOT 308
  (p.nom_fr ilike '%Peugeot 308%' and v.marque = 'Peugeot' and (v.modele = '308' or v.modele = '3008'))
  or
  -- PEUGEOT 405/406/407
  (p.nom_fr ilike '%Peugeot 405%' and v.marque = 'Peugeot' and v.modele = '405')
  or
  (p.nom_fr ilike '%Peugeot 406%' and v.marque = 'Peugeot' and (v.modele = '406' or v.modele = '407'))
  or
  (p.nom_fr ilike '%406/407%' and v.marque = 'Peugeot' and (v.modele = '406' or v.modele = '407'))
  or
  -- PEUGEOT 508 / 5008
  (p.nom_fr ilike '%Peugeot 508%' and v.marque = 'Peugeot' and (v.modele = '508' or v.modele = '5008'))
  or
  -- PEUGEOT PARTNER / BOXER
  (p.nom_fr ilike '%Peugeot Partner%' and v.marque = 'Peugeot' and v.modele ilike 'Partner%')
  or
  (p.nom_fr ilike '%Peugeot Boxer%' and v.marque = 'Peugeot' and v.modele ilike 'Boxer%')
  or
  -- CITROEN C3/C4
  (p.nom_fr ilike '%Citroën C3%' and v.marque = 'Citroën' and (v.modele = 'C3' or v.modele like 'C3%'))
  or
  (p.nom_fr ilike '%Citroen C3%' and v.marque = 'Citroën' and (v.modele = 'C3' or v.modele like 'C3%'))
  or
  (p.nom_fr ilike '%C3/C4%' and v.marque = 'Citroën' and (v.modele = 'C3' or v.modele = 'C4'))
  or
  (p.nom_fr ilike '%Citroën C4%' and v.marque = 'Citroën' and v.modele = 'C4')
  or
  -- CITROEN BERLINGO
  (p.nom_fr ilike '%Berlingo%' and v.marque = 'Citroën' and v.modele ilike 'Berlingo%')
  or
  -- CITROEN C5 / C8
  (p.nom_fr ilike '%Citroën C5%' and v.marque = 'Citroën' and v.modele = 'C5')
  or
  -- VW GOLF
  (p.nom_fr ilike '%VW Golf%' and v.marque = 'Volkswagen' and v.modele ilike 'Golf%')
  or
  (p.nom_fr ilike '%Volkswagen Golf%' and v.marque = 'Volkswagen' and v.modele ilike 'Golf%')
  or
  (p.nom_fr ilike '%Golf IV%' and v.marque = 'Volkswagen' and v.modele = 'Golf IV')
  or
  (p.nom_fr ilike '%Golf V%' and v.marque = 'Volkswagen' and v.modele = 'Golf V')
  or
  (p.nom_fr ilike '%Golf IV/V%' and v.marque = 'Volkswagen' and (v.modele = 'Golf IV' or v.modele = 'Golf V'))
  or
  -- VW POLO
  (p.nom_fr ilike '%VW Polo%' and v.marque = 'Volkswagen' and v.modele ilike 'Polo%')
  or
  -- VW PASSAT
  (p.nom_fr ilike '%VW Passat%' and v.marque = 'Volkswagen' and v.modele ilike 'Passat%')
  or
  -- VW CADDY / TRANSPORTER
  (p.nom_fr ilike '%Caddy%' and v.marque = 'Volkswagen' and v.modele ilike 'Caddy%')
  or
  (p.nom_fr ilike '%Transporter%' and v.marque = 'Volkswagen' and v.modele ilike 'Transporter%')
  or
  -- FORD FOCUS
  (p.nom_fr ilike '%Ford Focus%' and v.marque = 'Ford' and v.modele ilike 'Focus%')
  or
  -- FORD FIESTA
  (p.nom_fr ilike '%Ford Fiesta%' and v.marque = 'Ford' and v.modele ilike 'Fiesta%')
  or
  -- FORD TRANSIT
  (p.nom_fr ilike '%Ford Transit%' and v.marque = 'Ford' and v.modele ilike 'Transit%')
  or
  -- FORD KUGA / RANGER
  (p.nom_fr ilike '%Ford Kuga%' and v.marque = 'Ford' and v.modele ilike 'Kuga%')
  or
  (p.nom_fr ilike '%Ford Ranger%' and v.marque = 'Ford' and v.modele ilike 'Ranger%')
  or
  -- TOYOTA COROLLA
  (p.nom_fr ilike '%Toyota Corolla%' and v.marque = 'Toyota' and v.modele ilike 'Corolla%')
  or
  -- TOYOTA YARIS
  (p.nom_fr ilike '%Toyota Yaris%' and v.marque = 'Toyota' and v.modele ilike 'Yaris%')
  or
  -- TOYOTA HILUX
  (p.nom_fr ilike '%Toyota Hilux%' and v.marque = 'Toyota' and v.modele ilike 'Hilux%')
  or
  -- TOYOTA LAND CRUISER
  (p.nom_fr ilike '%Toyota Land Cruiser%' and v.marque = 'Toyota' and v.modele ilike 'Land Cruiser%')
  or
  (p.nom_fr ilike '%LandCruiser%' and v.marque = 'Toyota' and v.modele ilike 'Land Cruiser%')
  or
  -- TOYOTA RAV4
  (p.nom_fr ilike '%Toyota RAV4%' and v.marque = 'Toyota' and v.modele ilike 'RAV4%')
  or
  -- TOYOTA AVENSIS
  (p.nom_fr ilike '%Toyota Avensis%' and v.marque = 'Toyota' and v.modele ilike 'Avensis%')
  or
  -- HYUNDAI i20/i30
  (p.nom_fr ilike '%Hyundai i20%' and v.marque = 'Hyundai' and (v.modele = 'i20' or v.modele = 'i30'))
  or
  (p.nom_fr ilike '%Hyundai i30%' and v.marque = 'Hyundai' and v.modele = 'i30')
  or
  (p.nom_fr ilike '%i20/i30%' and v.marque = 'Hyundai' and (v.modele = 'i20' or v.modele = 'i30'))
  or
  -- HYUNDAI TUCSON / ix35
  (p.nom_fr ilike '%Hyundai Tucson%' and v.marque = 'Hyundai' and (v.modele ilike 'Tucson%' or v.modele = 'ix35'))
  or
  (p.nom_fr ilike '%Tucson/ix35%' and v.marque = 'Hyundai' and (v.modele ilike 'Tucson%' or v.modele = 'ix35'))
  or
  -- KIA RIO
  (p.nom_fr ilike '%Kia Rio%' and v.marque = 'Kia' and v.modele ilike 'Rio%')
  or
  -- KIA SPORTAGE
  (p.nom_fr ilike '%Kia Sportage%' and v.marque = 'Kia' and v.modele ilike 'Sportage%')
  or
  -- KIA CEED
  (p.nom_fr ilike '%Kia Ceed%' and v.marque = 'Kia' and v.modele ilike 'cee%')
  or
  -- MERCEDES C / E / SPRINTER
  (p.nom_fr ilike '%Mercedes%C 220%' and v.marque = 'Mercedes' and v.modele ilike 'Classe C%')
  or
  (p.nom_fr ilike '%Mercedes%E 220%' and v.marque = 'Mercedes' and v.modele ilike 'Classe E%')
  or
  (p.nom_fr ilike '%Sprinter%' and v.marque = 'Mercedes' and v.modele ilike 'Sprinter%')
  or
  (p.nom_fr ilike '%Mercedes Classe C%' and v.marque = 'Mercedes' and v.modele ilike 'Classe C%')
  or
  (p.nom_fr ilike '%Mercedes Classe E%' and v.marque = 'Mercedes' and v.modele ilike 'Classe E%')
  or
  -- BMW SERIE 3 / 5
  (p.nom_fr ilike '%BMW%3%' and v.marque = 'BMW' and v.modele ilike 'Série 3%')
  or
  (p.nom_fr ilike '%BMW%5%' and v.marque = 'BMW' and v.modele ilike 'Série 5%')
  or
  (p.nom_fr ilike '%BMW Série 3%' and v.marque = 'BMW' and v.modele ilike 'Série 3%')
  or
  (p.nom_fr ilike '%BMW Série 5%' and v.marque = 'BMW' and v.modele ilike 'Série 5%')
  or
  -- NISSAN QASHQAI / MICRA / NOTE
  (p.nom_fr ilike '%Nissan Qashqai%' and v.marque = 'Nissan' and v.modele ilike 'Qashqai%')
  or
  (p.nom_fr ilike '%Nissan Micra%' and v.marque = 'Nissan' and v.modele ilike 'Micra%')
  or
  (p.nom_fr ilike '%Nissan Note%' and v.marque = 'Nissan' and v.modele ilike 'Note%')
  or
  (p.nom_fr ilike '%Nissan Navara%' and v.marque = 'Nissan' and v.modele ilike 'Navara%')
  or
  -- OPEL ASTRA / CORSA / VECTRA
  (p.nom_fr ilike '%Opel Astra%' and v.marque = 'Opel' and v.modele ilike 'Astra%')
  or
  (p.nom_fr ilike '%Opel Corsa%' and v.marque = 'Opel' and v.modele ilike 'Corsa%')
  or
  (p.nom_fr ilike '%Opel Vectra%' and v.marque = 'Opel' and v.modele ilike 'Vectra%')
  or
  -- SEAT IBIZA / LEON
  (p.nom_fr ilike '%Seat Ibiza%' and v.marque = 'Seat' and v.modele ilike 'Ibiza%')
  or
  (p.nom_fr ilike '%Seat Leon%' and v.marque = 'Seat' and v.modele ilike 'León%')
  or
  (p.nom_fr ilike '%Ibiza/Leon%' and v.marque = 'Seat' and (v.modele ilike 'Ibiza%' or v.modele ilike 'León%'))
  or
  -- SKODA OCTAVIA / FABIA
  (p.nom_fr ilike '%Skoda Octavia%' and v.marque = 'Skoda' and v.modele ilike 'Octavia%')
  or
  (p.nom_fr ilike '%Skoda Fabia%' and v.marque = 'Skoda' and v.modele ilike 'Fabia%')
  or
  -- FIAT PUNTO / BRAVO / DUCATO
  (p.nom_fr ilike '%Fiat Punto%' and v.marque = 'Fiat' and v.modele ilike 'Punto%')
  or
  (p.nom_fr ilike '%Fiat Bravo%' and v.marque = 'Fiat' and v.modele ilike 'Bravo%')
  or
  (p.nom_fr ilike '%Fiat Ducato%' and v.marque = 'Fiat' and v.modele ilike 'Ducato%')
  or
  -- SUZUKI SWIFT / VITARA
  (p.nom_fr ilike '%Suzuki Swift%' and v.marque = 'Suzuki' and v.modele ilike 'Swift%')
  or
  (p.nom_fr ilike '%Suzuki Vitara%' and v.marque = 'Suzuki' and v.modele ilike 'Vitara%')
)
on conflict (product_id, vehicule_id) do nothing;
