# Stratégie de prospection B2B — Maroc

> Concertation Claude ↔ ChatGPT du 05/11/2026. Robot : `scripts/scrape_prospects_osm.mjs` (résumé chiffré : [osm/RESUME.md](osm/RESUME.md) ; contacts dans `osm/prospects_osm.csv`, **local uniquement**, le dépôt GitHub étant public).

## TOP 6 des segments (adapté à un catalogue surtout VL)

| # | Segment | Pourquoi | Recherche FR / AR | Balise OSM |
|---|---|---|---|---|
| 1 | **Magasins de pièces auto / sous-grossistes** | Achètent pour stocker, multimarques, réassort régulier | grossiste pièces auto · قطع غيار السيارات | `shop=car_parts` |
| 2 | **Garages & centres de vidange** | Consommation directe et récurrente | centre vidange · مركز تغيير الزيت | `shop=car_repair`, `craft=car_repair` |
| 3 | **Flottes d'utilitaires / livraison / logistique** | Utilitaires VL, vidanges fréquentes, décision locale | société de livraison · شركة توصيل | `office=logistics`, `office=courier` |
| 4 | **Location courte durée** | Parc VL important, entretien périodique | location voiture · كراء السيارات | `amenity=car_rental` |
| 5 | **Auto-écoles** | Parc VL homogène, kilométrage élevé | auto-école · مدرسة تعليم السياقة | `amenity=driving_school` |
| 6 | **Transporteurs poids lourds** | Ciblé sur nos références PL (OM/OR/AM/PK) | transport marchandises · نقل البضائع | `shop=truck`, `shop=truck_repair` |

En complément : stations-service indépendantes, pneus, lavages (déjà collectés par le robot).
**Plus tard** : grandes LLD (contrats nationaux), administrations (marchés publics), concessionnaires, cimenteries et mines (références spécifiques).

## Sources
- **Automatisé (légal)** : OpenStreetMap, via l'API Overpass sous licence ODbL. C'est ce que fait le robot.
- **À la main / assisté** : Google Maps, DirectInfo, Charika, telecontact. Leurs CGU interdisent le scraping automatisé.
- **Officiel** : API Google Places (payante au-delà du quota gratuit), qui permet un vrai robot Google Maps légal.
- **Annuaires pros** : FNTR (transport), ANALOG (LLD), AMDL (logistique), portail des marchés publics (« entretien parc automobile », « fourniture lubrifiants »).

## Règles (loi 09-08 / CNDP)
- Utiliser en priorité les coordonnées **génériques** de société (contact@, standard). Un e-mail ou un mobile nominatif est une donnée personnelle.
- **Pas d'envoi en masse** non sollicité. Le premier contact se fait un par un (WhatsApp/appel), avec l'identité de l'expéditeur claire et une possibilité de dire « stop ».
- Garder la **source** et la **date** de chaque contact. Tenir une liste « ne plus contacter ».
- Toujours qualifier : nombre et marques de véhicules, références utilisées. Une flotte compatible avec notre stock vaut mieux qu'une grosse flotte incompatible.
