# Recherche par VIN : analyse de partslink24 et plan pour FiltroPro

Préparé le 12/11/2026, à partir de recherches, des données réelles de la base FiltroPro et d'une discussion avec ChatGPT (« Architecture VIN FiltroPro »).

---

## 1. Ce que fait partslink24, et comment

- **C'est le catalogue officiel des constructeurs** : géré par LexCom (Munich), environ 43 marques, plus de 15 millions de pièces d'origine, sur abonnement payant selon le pays.
- **Pourquoi il trouve le moteur exact sans rien demander** : il ne « lit » pas seulement les caractères du VIN. Il interroge **les fichiers de fabrication des constructeurs**, sous licence. Pour chaque numéro de châssis, le constructeur sait quel moteur, quelle boîte et quelles options sont montés. Les **schémas éclatés** viennent aussi des constructeurs.
- **Ce qu'un VIN européen contient vraiment** :

| Positions | Contenu | Fiable ? |
|---|---|---|
| 1-3 (WMI) | Constructeur et pays | ✅ oui |
| 4-9 (VDS) | Modèle, carrosserie… selon les règles **propres à chaque constructeur** | ⚠️ à décoder marque par marque |
| 10 | Année modèle (obligatoire en Amérique du Nord, **pas en Europe**) | ⚠️ pas toujours utilisé |
| 11 | Usine (souvent) | ⚠️ |
| 12-17 | Numéro de série | — |

  → **Le code moteur n'est pas écrit dans le VIN.** Pour l'obtenir, il faut soit les données du constructeur (comme partslink24), soit un service payant qui les a, soit une confirmation par une personne.
- **Ce qu'on ne copie pas** : ni ses schémas, ni ses photos, ni ses données (droits d'auteur, droit des bases de données, conditions d'utilisation). On reprend seulement **les idées** : un VIN, une réponse, le minimum de choix.

## 2. Ce que FiltroPro a déjà (vérifié sur la base le 12/11)

- **114 373 applications Filtron** (voiture → filtre), dont **91 % avec le code moteur**, pour 921 filtres. Les équivalences Mann, Wix, Mahle et Purflux sont rattachées.
- Marques courantes au Maroc : Renault 5 578 · Citroën 2 855 · Peugeot 2 054 · Hyundai 1 436 · Kia 1 031 · **Dacia 562** (520 avec code moteur ; exemple pour la Logan II : H4B, H4D, B4D 401, D4F…).
- **Conclusion : notre vrai trésor, c'est le code moteur.** Une fois le code moteur connu, le filtre exact est déjà dans la base. Tout le travail consiste à **trouver le code moteur le plus vite possible**.

**La recherche VIN actuelle** (`src/app/recherche/page.tsx`) lit seulement la marque (positions 1-3) et l'année (position 10), puis le vendeur choisit le modèle et le moteur lui-même. Défauts repérés :
- Elle **impose l'année** lue en 10e position. Or beaucoup de constructeurs européens n'y mettent pas l'année : le bon véhicule peut alors disparaître de la liste.
- Le tableau des constructeurs a des **erreurs probables** à vérifier sur la liste officielle des WMI :
  - `TMA` est noté Skoda (c'est probablement Hyundai, usine tchèque) ;
  - `WFO` contient la lettre O, interdite dans un VIN ;
  - `MAT` est noté Opel, à vérifier.
- Il **manque des codes récents** : par exemple `VR3` (Peugeot, Stellantis), `VR7` (Citroën), Kia, Toyota et Nissan fabriqués en Europe, les marques chinoises (Chery, Geely, MG). Aucune vérification de la saisie : longueur, lettres I, O et Q interdites.

## 3. Les sources pour passer du VIN au code moteur

| Source | Donne le code moteur ? | Coût | Pour le Maroc |
|---|---|---|---|
| Lecture du VIN seul | ❌ (marque, parfois année) | Gratuit | Déjà fait |
| **Plaque du moteur** (lue par le garagiste) | ✅ directement (ex. « K9K 612 ») | Gratuit | **Le plus fiable, tout de suite** |
| **Carte grise marocaine** | ❌, mais réduit les choix : marque, type, genre, carburant, n° de châssis, nombre de cylindres, puissance fiscale, 1re mise en circulation | Gratuit | Le nouveau modèle a une **zone de lecture automatique** (comme un passeport), à étudier |
| NHTSA vPIC (américain) | Rarement | Gratuit | ❌ inutile pour Dacia, Renault, Peugeot |
| **Vincario** (ex vindecoder.eu) | Parfois : exemple publié d'une Dacia Duster avec le code moteur K4M | **20 essais gratuits**, puis environ 0,25 $ par recherche selon un site comparatif (à vérifier) | À **tester sur de vrais VIN marocains** avant de payer |
| TecDoc (TecAlliance) | Oui, selon la licence | Licence négociée, contrat de confidentialité | Trop lourd pour démarrer |
| Catalogues constructeurs (comme partslink24) | ✅ | Abonnement par marque | Pour une recherche à la main, pas pour l'automatique |

## 4. Le plan proposé pour FiltroPro (du moins cher au plus cher)

**Le principe : 4 couches, dans cet ordre.** On ne paie une recherche que si les couches gratuites n'ont pas trouvé.

1. **Mémoire des VIN confirmés** (gratuit) : chaque VIN confirmé par une vente est retenu avec sa voiture et son code moteur. La fois suivante, le même VIN donne les filtres **sans aucun choix**, comme partslink24.
2. **Identification locale** (gratuit) : marque (positions 1-3) + carte grise (carburant, cylindres, puissance fiscale, année) + nos 114 000 applications. On en tire **une** proposition, ou une liste courte de moteurs possibles.
3. **Service payant à la demande** (Vincario ou un autre, après test) : seulement s'il reste plusieurs moteurs possibles. Le résultat est gardé en mémoire, pour ne jamais payer deux fois le même VIN. Plafond mensuel de dépenses.
4. **Code moteur → filtres** : huile, air, habitacle et carburant avec leurs équivalences, tout est déjà dans la base.

**Toujours afficher un niveau de confiance**, pour ne jamais vendre un mauvais filtre :
- 🟢 **Confirmé** : VIN déjà confirmé, ou code moteur lu sur le moteur → filtres affichés directement.
- 🟠 **Probable** : une seule variante correspond, mais sans preuve → le vendeur confirme d'un tap.
- 🔴 **Incertain** : plusieurs moteurs possibles → le vendeur choisit dans une **liste courte**, jamais dans 114 000 lignes.

Attention : un même code moteur de base (par exemple K9K) a plusieurs variantes (K9K 608, 612…). Si les filtres diffèrent selon la variante, on reste en 🟠 ou en 🔴.

## 5. L'écran pour le vendeur dans le camion (téléphone, une main)

1. **Un seul champ** : VIN, **ou code moteur** (« K9K 612 »), ou bouton **📷 Carte grise**. Il y a aussi les **véhicules récents** et **mes garages** (les voitures habituelles de chaque garage).
2. **Le véhicule trouvé**, avec sa pastille 🟢🟠🔴 et un bouton **« Ce n'est pas le bon moteur »**.
3. **Les 4 filtres** sur une seule page, avec le stock, le prix et les marques équivalentes, puis **+ Ajouter à la vente**.
4. **Ça marche hors réseau** pour les véhicules déjà en mémoire.

## 6. Ce qu'il faut respecter

- **partslink24** : s'inspirer des idées seulement ; pas de copie des données, des schémas ou des photos, pas d'aspiration automatique de son site.
- **Données personnelles (loi 09-08)** : un VIN rattaché à un client, une plaque ou un téléphone peut identifier une personne.
  - On garde le VIN et les données techniques **séparés** des données du client.
  - La photo de la carte grise sert à lire les champs techniques, puis elle est **effacée**. Le nom et l'adresse ne sont jamais enregistrés.
  - Si on envoie une photo à un service extérieur, on **cache d'abord** le nom et l'adresse.
- La base est déjà protégée (connexion obligatoire, `securite.sql`). Les nouvelles tables auront la règle `equipe`.

## 7. Les étapes

| Étape | Contenu | Coût en argent |
|---|---|---|
| **1. Gratuit, tout de suite** | Corriger le tableau des constructeurs (vérifié sur la liste officielle) ; contrôler la saisie du VIN (17 caractères, O et I corrigés) ; **l'année devient une indication, plus un filtre obligatoire** ; **recherche par code moteur** ; **mémoire des VIN confirmés** ; véhicules récents ; pastilles de confiance | 0 DH |
| **2. Le test** | Réunir **30 vrais VIN marocains** avec carte grise et code moteur confirmé (10 Dacia ou Renault, 10 Peugeot, 10 Hyundai ou Kia) ; mesurer ce que trouvent la base seule et Vincario (avec les 20 essais gratuits) | 0 DH |
| **3. Seulement si le test est bon** | Brancher le service payant à la demande, avec plafond mensuel ; lecture automatique de la carte grise par photo | Selon le prix réel mesuré à l'étape 2 |

**Lien avec Vidani** : le même moteur d'identification servira à l'assistant WhatsApp. Le client envoie son VIN ou la photo de sa carte grise, et reçoit le prix exact de la vidange avec le bon filtre.

## 8. Autre inspiration : partsouq (proposé par l'utilisateur)

- Site de pièces d'origine (Dubaï) : on tape le **VIN** sur la page d'accueil, puis on navigue dans le catalogue du constructeur, ou on cherche par nom, numéro ou code de pièce. Marques : Toyota, Nissan, Hyundai, Kia, Renault, Peugeot, VW, BMW, Mercedes…
- **Même principe que partslink24** : le moteur exact vient des catalogues des constructeurs, pas du VIN lui-même. Une page de partsouq signalait d'ailleurs que le décodage VIN était **temporairement limité à Toyota** : preuve que ces données dépendent de fournisseurs extérieurs.
- **Ce qu'on reprend** (idées seulement, aucune donnée ni image copiée) : un seul champ bien visible pour le VIN ; recherche aussi par numéro de pièce ; parcours en peu d'écrans, bilingue (partsouq existe en arabe).

## 9. Étape 1 livrée le 12/11/2026

- **Recherche rapide → bloc « VIN ou code moteur »** (`src/components/RechercheVin.tsx`) :
  - code moteur → voitures + leurs filtres, regroupés par voiture ;
  - VIN confirmé → 🟢 ; même famille de VIN (8 premiers caractères) → 🟠 ; VIN inconnu → 🔴, on tape le code moteur ou le modèle, puis « C'est cette voiture » retient le VIN.
- **Repli** : si la variante (ex. « K9K 612 ») n'existe pas dans les données Filtron, on montre le moteur de base (« K9K ») avec un avertissement 🟠.
- **`src/lib/vin.ts`** : tableau des constructeurs **vérifié** (9 erreurs corrigées, plus de 30 codes ajoutés, dont DF9 Laraki pour le Maroc), corrections O→0, I→1, Q→0, contrôle des 17 caractères, année probable (indication seulement).
- **Onglet « Par véhicule »** : même tableau vérifié, et l'année du VIN **n'est plus appliquée d'office**.
- **Mémoire** : table `vin_connus` (`supabase/vin_connus.sql`, règle `equipe`), données techniques seulement.

---

### Sources
- [Conditions d'utilisation de partslink24 (LexCom)](https://legal.lexcom.de/legaldocs/partslink24-tos/-/10/en/tos-prev.html)
- [Škoda Norvège, partslink24](https://www.skoda-auto.no/ekstern/partslink24)
- [Comparatif des recherches VIN pour les pièces](https://www.knowyourparts.com/best-vin-number-lookup-for-parts/)
- [Décodeur VIN européen : l'équipement n'est pas dans le VIN](https://www.carwhere.com/european-vin-decoder)
- [Vincario, décodeur Dacia](https://vincario.com/vin-decoder/dacia/)
- [Vincario, tarifs 2026](https://vincario.com/blog/?p=698)
- [TrustRadius, Vincario](https://www.trustradius.com/compare-products/vincario)
- [Qu'est-ce que TecDoc (licence)](https://dev-opla.com/resources/what-is-tecdoc-auto-parts-ecommerce-guide)
- [Liste des WMI (Wikibooks)](https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/World_Manufacturer_Identifier_(WMI))
- [Arrêté marocain sur l'immatriculation (maroctl)](https://maroctl.com/routier/code-de-la-route/arrete-n-2711-10-immatriculation-des-vehicules-a-moteur-et-des-remorques/)
- [Challenge.ma, nouvelle carte grise](https://www.challenge.ma/?p=323348)
