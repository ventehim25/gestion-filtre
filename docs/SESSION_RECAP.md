# 📌 Récap de session — FiltroPro

> Point de reprise pour une nouvelle session. Complément de [GUIDE](GUIDE.md) et [BIBLE](BIBLE.md).
> **Dernière session : 16/11/2026** (distribution, portefeuille dinoun, VIN PSA) · 15/11 (huile toutes marques, protection, Vidani) · **13→14/11/2026** (catalogue par marque, données Filtron complétées, sauvegardes, marque Mecafilter, prévenir avant tournée, kit, 4 catalogues, huile par voiture, §0000) · 12/11 (VIN §000, sécurité §00) · avant : 05→07/11 (§0) ; §1-4 = session du 29/10.

---

## ▶ REPRENDRE ICI (mis à jour le 16/11/2026)

**EN COURS (16/11, nuit) — références de distribution « comme Filtron »** (demande : kits, courroies de distribution et d'accessoire, Gates / Continental / Dolz…, avec équivalences + véhicules + moteurs). BIBLE §8.34.
- **Gates (navigates.gates.com)** : catalogue complet (véhicule, référence croisée, guide d'achat) mais son service de données passe par une **clé du site** (`b2v4apikey`) → interrogation directe **refusée par la sécurité de Claude** (« accès non autorisé ») ; l'utilisateur a choisi « le 3 » (autoriser) puis demandé mon avis → **déconseillé** (clé non donnée à nous, site qui refuse les robots, fragile). Le « Catalogue Builder » (PDF par marque) a donné un PDF vide (bug de sélection du site). Message Gates préparé (Gmail ouvert, gatesautocat@gates.com) — pas confirmé envoyé.
- **Source retenue : catalogue officiel NTN-SNR, PDF public gratuit** — https://www.ntn-snr.com/sites/default/files/2019-03/cat-distribution_2019-opt.pdf (740 pages, 18,7 Mo, multilingue, 2019). Contient par marque → modèle → version : **codes moteur** (K9K.7.96…), **dates** (2010/03 ➪ 2013/11), **nombre de dents** (123…), **kit KD…**, **kit + pompe KDP…**, galets **GT…/GE…**. Pages ≈ 700-740 : **équivalences Gates (K015…, KP…), Dayco (KTBWP…), ContiTech, INA, SKF → SNR** (« * » = équivalence partielle). Pas de Dolz. Autres PDF NTN-SNR utiles (page https://www.ntn-snr.com/fr/documents?section=76) : « Auxiliary belts » (courroies d'accessoires), « Auxiliary kit with water pump », « Engine timing kits with water pump », « Timing Chain Kits ».
- **Prochaine étape** : extraire le PDF (pdfjs-dist est dans node_modules ; pas de Python sur le PC) avec les positions x des colonnes → essai à blanc (chiffres + exemples Dacia/Renault/Peugeot) → montrer à l'utilisateur → seulement après accord : produits SNR (stock 0, catégories kit_distribution / kit_distribution_pompe / galet_distribution, dents dans `dimensions`), équivalences Gates/Dayco/ContiTech/INA/SKF, véhicules dans `applications` (même forme que Filtron). Ne jamais inventer : seulement ce que dit le PDF.
- ChatGPT consulté (Chrome de Claude, mode invité) : sources officielles conseillées Gates AutoCat, Dayco (catalogue web + appli + cross-references), SKF (vsm.skf.com : dents/largeur/composition), Continental (fiches + listes d'équivalences PDF), NTN-SNR (e-catalogue + documentation), INA/Schaeffler, febi partsfinder ; TecDoc = base payante centrale.

**Distribution Gates par voiture (16→17/11, nuit) : FAIT, 37 marques** (BIBLE §8.34, GUIDE §17). Les 37 PDF officiels Gates (« Applications véhicules particuliers », navigates.gates.com) sont sur le Bureau (« gates distribution <marque>.pdf ») et TOUS importés : **1 881 fiches Gates, 44 104 liens, 84 % reliés aux voitures Filtron, 0 ligne écartée**. Outil : `node scripts/import_gates_pdf.mjs "<PDF>"` (essai à blanc ; `--explique=CLIO` = pourquoi une voiture n'est pas reliée) puis `--ecrire` (`--remplacer` pour un réimport : efface d'abord les liens Gates de la marque principale seulement). Règle : code moteur exact d'abord, famille seulement si Filtron n'a que la famille (code exact Gates dans le ⚠), jamais forcé. Colonne `applications.remarque` (SQL collé, vérifié). Fiche voiture : « ⚙ Distribution moteur » + ⚠. **Pistes** : Ford (59 %) et Iveco (51 %) à regarder avec `--explique` si l'utilisateur le demande ; une nouvelle édition Gates = même commande avec `--remplacer` ; équivalences Dayco/SKF/INA = PDF officiel d'une autre marque (Gates ne les donne pas). Navigateur Chromium (Playwright) : se fermait tout seul le 16/11 → ne pas s'acharner ; ChatGPT abandonné.

**Nombre de dents (16/11, nuit) : FAIT** (BIBLE §8.33) — kit / kit + pompe / courroie de distribution : case « 141/25 » rangée dans `products.dimensions` (`AVEC_DENTS`, `normDents`, `dentsValides`), affichée et cherchable partout. Pas de SQL.

**Catalogues par famille (16/11, nuit) : FAIT** (BIBLE §8.32) — `src/components/CatalogueFamilles.tsx` : onglets familles, rubriques sans stock « 🔄 Réapprovisionnement en cours » + Demander (WhatsApp), détails d'un tap. Vérifié à 390 px sur serveur local. Marques ajoutées rattachées à leur famille (§8.31, `reglages.marques_filtres` = `[{ nom, metiers }]`).

**9 familles de pièces (16/11, nuit) : FAIT, SQL collé et vérifié** (BIBLE §8.31, GUIDE §16). 44 catégories dans `src/lib/categories.ts` (`FAMILLES`), marques par famille (`marquesBase`/`marquesPour` dans `brands.ts`), menus par famille (`CategoryOptions`), « Je reçois » à 9 boutons. `supabase/categories_produits.sql` collé (« sql ok ») et vérifié (44 catégories, essais supprimés, inconnue refusée par `products_categorie_fkey`). Rangement fait : 11 pièces de « Autre » → 8 Filtron CW75x/UE730… en `filtration_autre`, 3 huiles en `huile_moteur`. Marque de « CASTROL 5W30 5L AVEC FACTURE » corrigée (Filtron → Castrol, accord de l'utilisateur). **Ensuite** : son premier kit / ses premières plaquettes en Réception. Ensuite, une nouvelle catégorie = code + une ligne dans `categories_produits` (clé serveur), sans SQL.

**Distribution (16/11, soir) : FAIT, SQL collé et vérifié** (BIBLE §8.30, GUIDE §16). 4 catégories (`chaine_distribution`, `courroie_distribution`, `pompe_eau`, `kit_distribution`, liste unique `src/lib/categories.ts`) + 23 marques de distribution (`DISTRIBUTION_BRANDS`, « Renault Origine » / « PSA Origine » car « Renault »/« Peugeot » = noms des codes OE). Marchandise prise : « Je reçois » Filtres · Huile · Distribution · Pompe à eau + « ➕ Nouvelle pièce » (fiche créée à l'envoi, avant la ligne `receptions`, `creerPieces` dans `offlineReceptions.ts`). `supabase/categories_distribution.sql` collé par l'utilisateur (« sql ok ») et vérifié (4 catégories acceptées, inconnue refusée, essais supprimés). **Ensuite** : son premier vrai kit en Réception (Je reçois → Distribution → réf. → « ➕ Nouvelle pièce ») — regarder s'il bloque quelque part. Pistes : voitures compatibles pour la distribution (pas dans Filtron), « Nouvelle pièce » pour l'huile si demandé.

**16/11 (journée)** : VIN Peugeot/Citroën + autres marques (§8.26), nouvelles marques de filtres + « ➕ Nouvelle marque… » (§8.27), fiche produit qui recréait toutes les références corrigée (§8.28), portefeuille dinoun + avances espèces/chèque (§8.29, SQL `avances_paiement.sql` collé et vérifié ; dette dinoun 63 038 au 16/11).

**Vidani relié à FiltroPro (15/11, soir) : FAIT en version de test** (BIBLE §8.25). `scripts/export_vidani.mjs` → `vidani-bot/donnees/filtropro-voitures.json` (17 838 versions, refaite chaque jour à 13 h par `sauvegarde_quotidienne.cmd`). Dans Vidani : `src/filtropro.mjs` ; la fiche du garage passe en premier ; prix = fiche du garage × litres FiltroPro, statut « À valider » ; Vidani relancé sur le PC. Page des étapes Vidani : https://claude.ai/artifact/AyS83NDQdrT9sTy6a4oJUR.
Puis, sur les essais de l'utilisateur : durée de vidange, prestations (durée/prix, « et pour… »), demandes de travaux (devis distribution) — corrigés, puis **IA Claude** pour comprendre tous les messages (`vidani-bot/src/ia.mjs`, BIBLE §8.25) ; tests Vidani **16/16**. **En attente** : l'utilisateur crée sa clé sur console.anthropic.com et la colle dans `vidani-bot/.env` (`ANTHROPIC_API_KEY=`) ; quand il dit « clé IA ajoutée » → faire UN vrai essai (petit script, < 1 centime) et vérifier `donnees/ia-usage.jsonl` (si erreur 400 sur `fallbacks`, l'enlever).

**Protection « rien perdu, jamais d'arrêt » (15/11, soir) : FAIT** (BIBLE §8.24, GUIDE §12). Nouvelle clé publique `sb_publishable_` en ligne, vérifiée sur le téléphone par l'utilisateur (l'ancienne anon JWT n'est plus nulle part ; variable Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` ignorée). `supabase/protection.sql` collé et vérifié : `schema_complet()` (→ `structure.sql` dans chaque sauvegarde), `taille_base()` (108 Mo/500), `decompter_stock_vente()` + table `stock_decomptes`. Ventes : gardées sur le téléphone puis envoyées étape par étape (`envoyerVente`, sans doublon). Cron : réveil de la base en premier + alertes (sauvegarde > 2 jours via `reglages.derniere_sauvegarde`, base > 400 Mo). Huile en Cache API. Robot prospection : headless + 3 serveurs Overpass. **À faire plus tard** : désactiver les anciennes clés dans Supabase → API Keys — **rappel programmé** dans le cron (notification téléphone le 22/11/2026 puis tous les 3 jours) ; quand c'est fait (l'utilisateur clique « Disable » sur les clés legacy, après avoir ouvert l'appli sur chaque téléphone), noter `reglages` cle `anciennes_cles_desactivees` (valeur = date) pour arrêter le rappel ; second réveil GitHub Actions (`.github/workflows/garder-actif.yml` à recréer, exception déjà dans .gitignore ; il faut le droit `workflow` : `gh auth refresh -s workflow` par l'utilisateur) ; décisions de l'utilisateur : Vercel Pro (Hobby = non commercial), Supabase Pro, test de restauration sur un 2e projet.

**Huile pour tous les modèles courants (15/11)** — demande « fais-le sans rien oublier » : FAIT (BIBLE §8.21). 6 715 versions lues dans le guide Liqui Moly (29 marques, voitures + utilitaires) → `huiles_moteurs` = **2 826 lignes / 2 726 codes**. Nouvelle colonne `marques` (`supabase/huiles_marques.sql`, exécutée « Success ») : l'huile ne s'affiche que pour la même famille de marques (« F4A » Ford ≠ Iveco). Codes à huiles différentes selon la version → jusqu'à 3 versions au choix (choix auto par le modèle). Couverture voitures/utilitaires 56 % (Dacia 89 %, Renault 80 %, Peugeot 78 %, VW 73 %…). Outil reprenable : `node scripts/huiles_releve.mjs collecte | fusion | envoi` (données dans `backups/huiles/`). **Ford (15/11) : FAIT** (BIBLE §8.22) : si le code ne suffit pas, recherche par modèle + cylindrée + carburant + puissance + années (lignes « ~FORD|FOCUS|1.6|E|85 », variante = période, `huilesDeLaVoiture`) ; 488 lignes ; Ford 21 % → 52 %. Même méthode possible pour une autre marque : `node scripts/huiles_releve.mjs cles <Marque>` (ajouter la marque dans `CIBLES` si besoin ; vérifier d'abord que le nom des modèles Filtron commence comme celui du guide).

**Toutes les marques (15/11, après-midi) : FAIT** (BIBLE §8.23). `node scripts/huiles_releve.mjs cles toutes --envoi` : +5 463 lignes « ~… » pour les 29 marques → `huiles_moteurs` = **8 799 lignes**. Mercedes/BMW par désignation (« ~MERCEDES|=C220|D|kW », « ~BMW|=320D|… »), `cleMarque` + `estDiesel` partagés entre le script et `src/lib/huiles.ts` (garder les deux identiques). Appli : chargement en parallèle + `indexer()`. Couverture testée (80 432 versions, hors Ford) : 58 % → 61 % (Jeep 1 → 51 %, Mazda 2 → 24 %, Honda 29 → 49 %, Land Rover 22 → 41 %). **Pistes si l'utilisateur le demande** : Mercedes camions (le reste des 37 %), Fiat (56 %), Toyota (61 %) — regarder des exemples non reliés avec `_test_cles`-like avant de toucher aux règles.


**Fait les 13-14/11** (détails plus bas et BIBLE §8.13-8.14) :
1. Onglet « Par marque » de `/recherche` : marque → modèle → moteur → filtres ; moteurs rangés par type puis par date.
2. Données Filtron complétées : 114 373 → **218 956 applications**, une ligne par version de moteur ; diesel Dacia 100 % avec filtre à carburant.
3. **Sauvegarde quotidienne** de toute la base à 13 h (tâche Windows « FiltroPro-Sauvegarde ») : sur le PC (`backups/`) **et** dans Google Drive (`G:\Mon Drive\FiltroPro-sauvegardes`, vérifié par l'utilisateur sur son téléphone).
4. **Copie de secours des photos** : Supabase Storage `produits/copie/` + `backups/photos/` ; l'app l'affiche seulement si le serveur MANN+HUMMEL ne répond plus.

**Copie des photos : TERMINÉE** (vérifié le 14/11 à 20 h 46) : 2 616 copiées, 607 sans photo, 0 erreur ; aussi dans Google Drive (2 616). Noté en BIBLE §8.14. Pour les nouveaux produits : relancer `node scripts/copier_photos.mjs` (ne copie que ce qui manque).

**Marque Mecafilter (14/11, soir)** : ajoutée aux listes de l'app + 122 équivalents officiels pour 95 des 120 réfs vendues (BIBLE §8.15, `supabase/equivalents_mecafilter.sql`). Si l'utilisateur le veut : étendre aux 1 646 réfs Filtron du catalogue (2 009 correspondances déjà connues), mais Vente/Réception chargeraient ≈ 2 700 variantes de plus.

**Prévenir les clients la veille d'une tournée (14/11, soir)** : en ligne (BIBLE §8.16, GUIDE §13). `/tournees` → « Prévenir les clients » (date + villes) ; le cron de 9 h envoie « 🚚 Tournée demain » + bouton sur l'accueil → `/tournees/prevenir?id=…` (WhatsApp 1 tap par client, coché « Prévenu »). **À vérifier** : `supabase/tournees_prevues.sql` collé par l'utilisateur ? (sinon le bloc affiche « Pas encore activé » ; vérifier par une lecture de `tournees_prevues`, erreur PGRST205 = pas collé). Ensuite : une vraie tournée programmée → la notification de la veille arrive-t-elle ?

**Kit, 4 catalogues, huile par voiture (14/11, nuit)** : en ligne (BIBLE §8.17-8.19, GUIDE §14-15). Idées d'Oscaro passées par ChatGPT (top 6 : kits, huile par norme, véhicules habituels, fiches techniques, joints/clés, populaires). Faits : kit (« Vendre ce kit » / WhatsApp), 4 catalogues (+30 / +15 / −5 %, liens dans Paramètres, prix en vente selon le type du client), huile par voiture (59 moteurs relevés dans le guide Liqui Moly : API `/fr/fr/rest/V1/recommendations/<typeId>`, types via `/rest/V1/olyslager/makes|models|types`, catégorie 2 = utilitaires comme Hilux/L200).
**SQL COLLÉ le 14/11 par l'utilisateur (« success ») et vérifié** : tables OK, 59 lignes d'huile, pourcentages lus par le public, tournées refusées au public (42501) ; `/tarif?k=particuliers-r7k2` affiche OE688/3 à 43 MAD (33 × 1,3). Contenu : **`supabase/catalogues_huile_tournees.sql`** (un seul collage : tables tournees_prevues, reglages, huiles_moteurs + colonnes prix_* + 59 lignes d'huile). Vérifier ensuite par lecture (PGRST205 = pas collé). Sans lui : tournées « Pas encore activé », pourcentages de départ, pas d'huile affichée.
**Huile (15/11)** : Golf VII/VIII ajoutées (161 lignes en base). Méthode pour un nouveau modèle : onglet Liqui Moly → types du modèle (`/rest/V1/olyslager/types/<modelId>`), une lecture par (cylindrée, puissance, carburant, année) → `recommendations/<typeId>` → regrouper par code (viscosités communes, plage de litres) → upsert `huiles_moteurs` avec la clé serveur, et ajouter les lignes à la section D du SQL.
**Pistes suivantes** : fiche technique des filtres (dimensions), joints de vidange / clés à filtre (à stocker ?), « véhicules habituels » par garage, page publique « trouve tes filtres et ton huile » pour les particuliers (catalogue particuliers), plus de moteurs d'huile.

**Ensuite, au choix de l'utilisateur** (lui demander) :
- étape 2 du VIN : environ 30 vrais VIN marocains (carte grise + code moteur), test base seule puis Vincario ;
- relier Vidani à FiltroPro (filtres exacts + litres d'huile) ;
- tester vidani-bot sur un vrai WhatsApp ;
- visite DINOUN ; choisir le nom Locali ou Locani ; vérifier les notifications de 8 h ;
- avant début 2027 : remplacer l'ancienne clé publique (anon) de Supabase.

**Façon de travailler avec l'utilisateur** : français simple, une étape à la fois pour ce qu'il fait lui-même (attendre « étape X ok ») ; ne jamais lui demander ni afficher une clé ou un mot de passe ; Filtron : au moins 4 s entre deux pages.

---

## 0000. Session du 13-14/11/2026 — catalogue par marque, données, sauvegardes

- **Onglet « Par marque »** de `/recherche` (`?tab=marques`) : `src/components/CatalogueMarques.tsx`. Marque → modèles (comptage puis pages de 1000 lues en parallèle, mises en cache par marque) → moteurs (`eq marque` + `eq modele`, paginé) → filtres.
- **Partagé** avec le bloc VIN : `src/lib/voitures.ts` (types, `COLS`, `grouper`, `annees`, `decouperModele`) et `src/components/VoitureCarte.tsx`.
- **Données Filtron** : `modele` = « Nom | période » ; `code_moteur` et `annee_fin` sont souvent "" (pas null) ; les motifs comme `VW%` ramènent aussi des sous-marques (VW MARINE…), rangées à part.
- **Robot `scripts/completer_filtron.mjs`** : remplace `scrape_filtron.mjs` (ancienne adresse 404, 250 voitures maximum). Options : essai à blanc par défaut, `--ecrire`, `--detail`, `--tout`, `--depuis N`, `--par-code` (seulement après `supabase/applications_par_code_moteur.sql`). Le 13/11 : +50 592 lignes pour les 138 filtres coupés.
- **Fait le 14/11** : SQL `applications_par_code_moteur.sql` collé (règle `applications_version_unique`), puis `--tout --par-code --ecrire` sur 3 183 références : 218 956 applications, diesel Dacia 100 % avec filtre à carburant. Filtron bloque si on va trop vite : garder 4 s entre deux pages.
- **Sauvegarde (14/11)** : `scripts/sauvegarde.mjs` → `backups/AAAA-MM-JJ/<table>.json.gz` + `manifeste.json` (tables trouvées par l'OpenAPI de PostgREST `/rest/v1/`, les vues sans clé primaire sont ignorées ; relecture et comptage de chaque fichier ; garde 14 + la première du mois ; copie vers `SAUVEGARDE_COPIE` si défini dans `.env.local`). Tâche Windows « FiltroPro-Sauvegarde » chaque jour à 13 h, lancée par `conhost.exe --headless` (avec une fenêtre visible, la première exécution a été coupée : code 0xC000013A). `scripts/restaurer.mjs` : comparaison par défaut, `--ecrire` = lignes manquantes seulement, `--remplacer` = écrase aussi.
- **Google Drive (14/11)** : `SAUVEGARDE_COPIE=G:\Mon Drive\FiltroPro-sauvegardes` dans `.env.local` (Drive pour ordinateur, rien de synchronisé depuis le PC). Les photos sont copiées en plus, seulement les nouvelles (`cpSync force:false`, index remis à jour).
- **Mecafilter (14/11)** : API `https://filtron.eu/api/graphql/catalog-prod`, en-tête `Store: pcat_ft_fr_store_fr`, requête `search_crossreference_no(search, currentPage, pageSize)` → `external_number`, `int_product_identifier` (« OE649/8_FILTRON »), `ext_brand_name` (MECAFILTER). La recherche est « contient » : « ELP » ramène aussi DELPHI. Préfixes balayés : ELH, ELG, ELR, ELP + EL[A-Z]. Réfs écrites « ELH 4359 » (Filtron mélange avec ou sans espace ; la recherche de l'app ignore les espaces). Filtron a coupé l'accès quelques minutes avec `pageSize` 1000 et 4 s d'écart : prendre 8 s.
- **Photos (14/11)** : `scripts/copier_photos.mjs` → Storage `produits/copie/<s7Name>.jpg` (public, `cacheControl` 1 an) + `backups/photos/`. Scene7 répond **403** pour une photo absente. `src/lib/photoCopie.ts` (`s7Name`, `photoCopieUrl`) ; `FilterImage` met la copie juste avant le logo (le mémo d'images change de clé car le nombre d'essais change). Supabase répond 400 pour une copie absente.

---

## 000. Session du 12/11/2026 (suite) — recherche VIN, étape 1

- **Analyse** : `docs/VIN_ANALYSE.md` (partslink24, partsouq, sources du code moteur, plan en 3 étapes).
- **Code** :
  - `src/lib/vin.ts` : WMI vérifiés sur Wikibooks, nettoyage du VIN, année probable, famille = 8 premiers caractères, détection et motifs de code moteur ;
  - `src/components/RechercheVin.tsx` : en haut de l'onglet « Recherche rapide » de `/recherche` ;
  - l'onglet « Par véhicule » utilise `vin.ts` et n'impose plus l'année.
- **Codes moteur Filtron** : écrits de façons variées (« K9K », « K9K 872 », « K9K700 », « K9K-722 », listes « K9K 790/792 »). Le motif `%K9K%612%` couvre l'espace, le tiret et l'absence d'espace. Si rien n'est trouvé, repli sur les 3 premiers caractères.
- **SQL** : `supabase/vin_connus.sql` (table + règle `equipe`) **exécuté le 12/11 par l'utilisateur** (vérifié : anon refusé, enregistrement et famille OK). Le clic de confirmation « destructive » de Supabase a été bloqué par la permission automatique : c'est l'utilisateur qui doit cliquer sur « Run query ». Le code gère l'absence de la table (message clair au clic sur « C'est cette voiture »).
- **Étape 2** : 30 vrais VIN marocains, avec carte grise et code moteur confirmé, à tester sur la base seule et avec Vincario (20 essais gratuits).

---

## 00. Session du 12/11/2026 — sécurité de la base

- **Code en ligne** :
  - `src/components/AuthGate.tsx` (connexion Supabase Auth email + mot de passe, s'active quand la table `utilisateurs_autorises` existe ; hors-ligne OK si une session existe ; écran « compte non autorisé ») ;
  - `AppShell` l'utilise pour toutes les pages sauf `/c`, `/tarif`, `/catalogue` ;
  - `src/components/CompteSection.tsx` dans `/parametres` ;
  - `src/lib/supabase.ts` : sur le serveur, clé `SUPABASE_SERVICE_ROLE_KEY` si présente ;
  - `/c/[...ref]` : colonnes listées (plus de `select("*")`, donc plus de prix d'achat dans la page publique) ;
  - `scripts/cle_supabase.mjs` utilisé par tous les scripts (clé service de `.env.local`, sinon clé anon).
- **SQL collé et vérifié le 12/11** (exécuté par Claude dans l'éditeur Supabase via Chromium, compte `ventehim@gmail.com`, inscriptions fermées). Avec la clé anon : toutes les tables de gestion → 42501, catalogue OK, tarif OK (8 articles).
- **Clé serveur ajoutée le 12/11** : nouvelle **clé secrète Supabase `serveur2`** (format `sb_secret_…`, les clés « legacy » s'arrêtent début 2027) dans `.env.local` → testée : accès complet, 73 clients, prospects OK. Même clé dans **Vercel** (`SUPABASE_SERVICE_ROLE_KEY`, Production), redéploiement déclenché par ce commit. L'ancienne clé secrète, visible sur une capture, a été **supprimée** dans Supabase.
- **À faire avant début 2027** : remplacer la clé publique « legacy » (anon JWT dans `src/lib/supabase.ts`, `scripts/cle_supabase.mjs`, `.env.local`, Vercel) par la **publishable key** `sb_publishable_…`.
- **Contenu du SQL** :
  - `supabase/securite.sql` : `utilisateurs_autorises` + `est_autorise()`, suppression de toutes les règles « allow all », règle `equipe` sur chaque table, lecture publique en colonnes limitées sur products/equivalences/applications, vues en `security_invoker`, RPC de stock fermées à anon, photos : envoi réservé à l'équipe, privilèges par défaut sans anon ;
  - urgence : `supabase/securite_annuler.sql`.
- **Ordre pour l'utilisateur** : GUIDE §9 (compte → inscriptions fermées → SQL → connexion PC et téléphone → clé service dans Vercel et `.env.local`).
- **Piège évité** : une requête `select(..., { head: true })` sur une table inexistante répond **204 sans erreur**. La détection « sécurité installée » utilise donc une vraie lecture (erreur PGRST205 = pas installée).
- **Vérifier après le SQL** : avec la clé anon, `clients` doit renvoyer 0 ligne, `products.prix_achat` doit être refusé, et `/catalogue`, `/tarif`, `/c/…` doivent toujours s'afficher.

---

## 0. Session du 05 au 07/11/2026 — ce qui a changé

### 📊 État actuel de la base (07/11)
- **Remise à zéro faite** : 0 réception, 0 vente, 0 avance. **Stock = 0 et prix = 0** sur toutes les références (sauvegardes locales dans `backups/`, hors GitHub).
- Fournisseurs : **dinoun auto** (crédit, **solde de départ 50 000** = dette) · **filtropro** (capital, départ 0).
- **73 clients**, tous `origine = 'terrain'`. **Prochaine étape = l'utilisateur ressaisit sa marchandise** dans « Marchandise prise ».

### 🔄 Nouveau déroulement (validé avec l'utilisateur + avis ChatGPT)
- **Accueil** : 4 gros boutons **Réception · Vente · Encaisser · Mon activité** (liens directs `/fournisseurs?reception=1`, `/ventes?nouvelle=1`, `/ventes?impayes=1`, `/stats`).
- **Marchandise prise** : choix « Chez » (dinoun/filtropro), **📷 Scanner les boîtes** (caméra ouverte, +1 par boîte, compteur en direct, boîte inconnue = ligne « à compléter »), par ligne qté + **prix achat + prix vente** (enregistrés sur la fiche) + marque (« + Autre marque » crée la variante) + code-barres mémorisé. **Hors-ligne** : file `src/lib/offlineReceptions.ts` reprise ligne par ligne. **Annulation** : ✕ dans l'historique (stock retiré + dette corrigée ; prévient si déjà vendu → stock négatif).
- **Vente** : **source par LIGNE automatique** = fournisseur de la dernière réception du filtre (`receptions.lignes`), boutons dinoun | filtropro pour corriger. (La « source unique par bon » a été abandonnée : un bon peut mélanger les deux.)
- **Camion « Rembourser {coût} » / « Remboursé »** sur chaque bon dinoun (confirmation) + liste **« Bons à rembourser »** sur la carte dinoun. Logique commune `src/lib/dinoun.ts`.
- **Recherche d'article** : taper une réf **Mann, Wix, Mahle, Purflux, Flag…** trouve le Filtron et règle la marque.
- Test complet bout en bout fait le 07/11 (réception → vente mixte → camion → annulations) : OK, données de test nettoyées.

### 🔗 Équivalents de marques (officiels, importés en base)
- **Mann** (+ EAN des boîtes) et **Wix** : catalogues mann-filter.com / wixfilters.com (`supabase/equivalents_mann_wix.sql`).
- **Mahle (255) et Purflux (166)** : filtron.eu, recherche « référence correspondante » parcourue à l'envers (`supabase/equivalents_mahle_purflux.sql`).
- Pour les 120 réfs Filtron de `docs/prix-catalogue.md`. Méthode détaillée dans la mémoire (`project_equivalents_mann_wix.md`).

### 👥 Clients & prospection
- Clients : **quartier**, **localisation GPS** (ma position / lien Maps / carte), **adresse**, filtres Ville/Quartier, « Y aller », « + Ajouter à la tournée ». **Terrain vs prospection** séparés (onglets) ; un prospect devient client **seulement quand il commande** (`/prospects` → « A passé commande → créer la vente »).
- **Prospection** : page `/prospects` (note d'intérêt /10, suivi), robot OSM quotidien (tâche Windows 9 h 30), Google Maps consulté à la main dans Chromium (~50 fiches/séance, jamais de robot furtif). Campagne e-mail **en pause** jusqu'au catalogue rempli (`docs/prospects/CAMPAGNE_EMAIL.md`).

### 🛠️ Technique
- Types Supabase au format v2 : **`npx tsc --noEmit` = 0 erreur** (à garder). Bug NaN du circuit des tournées corrigé. Next.js 15.5.29 (faille corrigée).
- PWA **sw v17** : pages + requêtes RSC en réseau d'abord (mises à jour visibles tout de suite). Scanner = détecteur natif du téléphone (net, léger).
- Le CLI `vercel` a un jeton expiré → **le push GitHub déploie tout seul**. SQL : exécuté par Claude dans l'éditeur Supabase via Chromium (« Run without RLS » = fausse alerte sur les INSERT).
- Chromium : **ne jamais fermer l'onglet/la fenêtre** (demande de l'utilisateur).

---

## 1. Ce qui a été construit (grandes lignes)

### ⚡ Performance (mobile)
- `src/lib/pagedFetch.ts` → **`loadAll`** : pagination en parallèle (compte puis pages en lots). Appliqué à `/produits`, `/reappro`, `/ventes`.
- Catalogue : ne charge que le **stock** (2 requêtes ~120 lignes) + cache localStorage + alias en fond. `/produits` & `/reappro` ne chargent plus les 23 000 codes OE (seulement ~23 variantes de marque).
- Images (`FilterImage`) : mémo localStorage (fin des cascades 404 Scene7).
- Service worker **v9** : données Supabase en network-first + timeout 2 s ; `/catalogue` & `/tarif` hors-ligne ; handlers push.
- Accueil : ~7 scans en série → **1 `Promise.all`**.

### 🔔 Notifications push (auto)
- Route **`/api/cron/relances`** (Node + web-push), **cron Vercel quotidien 08:00 UTC** (`vercel.json`).
- Envoie : relance catalogue (15 j / 5 j), **impayés** (15 j), **réappro** (produits vendus 90 j & bas), **clients endormis**, et le **vendredi** le bilan + rappel arrivages.
- Clé VAPID publique en dur (`src/lib/push.ts`) ; **secrets dans les variables Vercel** : `VAPID_PRIVATE_KEY` + `CRON_SECRET` (valeurs NON stockées dans le dépôt).
- Test : `GET /api/cron/relances?key=<CRON_SECRET>`. Logique : `src/lib/relances.ts`. Page `/relances-catalogue`.
- SQL collé : `supabase/push_notifications.sql` (table `push_subscriptions` + colonne `clients.derniere_relance_catalogue`).
- Appareils abonnés : PC + téléphone Android (Paramètres → Activer les notifications).

### 🤖 Agents (`.claude/agents/`)
- **prospection-clients** · **acquisition-b2c** · **pub-reseaux** (sélectionnables par nom).

### 🗓️ Routines cloud (claude.ai/code/routines) — nécessitent la GitHub App installée sur le dépôt
- Prospection hebdo : `trig_01F8aRQ8p8FJuDexFmVT6onJ` (lundi 08:00 UTC) → `docs/prospects/{ville}.md`.
- Pub hebdo : `trig_01MFfn2jNacW6cKBmsfPZ9qq` (jeudi 08:00 UTC) → `docs/pub/{ref}.md` + affiche HTML.
- Déjà produits : prospects Tanger, Tétouan, Fès ; pubs oe688-3, golf-7-4-filtres, ap071-7.

### 🖥️ Pilotage navigateur (Playwright MCP)
- `.mcp.json` (gitignored, local) : **`playwright`** (navigateur neuf) + **`chrome-reel`** (CDP sur `http://localhost:9222`).
- Raccourci **« Chrome-pour-Claude »** sur le Bureau = lance le Chrome dédié (profil `C:\Users\deux\chrome-debug`, port 9222). **Doit tourner** pour que `chrome-reel` marche.
- **WhatsApp Web** : marche uniquement via `chrome-reel` (le navigateur neuf est détecté/bloqué par Meta). Claude peut **lire et taper**, l'**envoi reste à l'utilisateur** (pas d'auto-spam = pas de bannissement).

### 🗂️ Catalogue (déjà automatique)
- `/tarif?k=garages2026` (AVEC prix, messages directs clients) · `/catalogue` (SANS prix, statut public).
- Affiche **uniquement** `stock > 0` **ET** `prix_vente > 0`. Ajouter un produit (stock+prix) → il apparaît ; stock 0 → il disparaît ; prix changé → à jour. **Zéro maintenance.**
- Message **darija pro** prêt (voir plus bas).

---

## 2. État au 29/10/2026
- **Stock remis à 0** (c'était des tests) : 0 produit / 0 variante en stock → **catalogue vide**.
- **Prix conservés en base** + audités : `docs/prix-catalogue.md` (132 articles, ~40 % de marge, 4 à revoir : do1800, OP643/3, WL5401, FANFARO 5W40).
- Supabase : **3224 produits · 56 clients · 0 ventes**.

## 3. Prochaine étape (demain, à la réception fournisseur)
1. Pour chaque filtre reçu : `/produits` (ou `/stock`) → **stock reçu + prix exact**.
2. Le catalogue **se remplit tout seul**.
3. Envoyer aux clients : le lien `…/tarif?k=garages2026` + le message darija, via WhatsApp (Claude peut le taper dans les contacts, l'utilisateur valide).

### Message darija (pro) prêt
```
🔧 FiltroPro — الجملة ديال الفيلتر وقطع الغيار 🔧
خويا، هاهو الكاطالوݣ ديالنا بأثمنة اليوم 👇 — غير اللي كاين فالستوك:
🔗 https://gestion-filtre.vercel.app/tarif?k=garages2026
(Filtron · Mann · Wix · Bosch + الزيت) · 🚚 توصيل فكامل المغرب · 💯 الريفيرانس مضمونة
📲 0602350290
```

## 4. Pour reprendre dans une nouvelle session
- La **mémoire se charge automatiquement** (voir `MEMORY.md`). Relire aussi ce fichier + [GUIDE](GUIDE.md).
- **Navigateur** : double-cliquer **« Chrome-pour-Claude »** (Bureau) AVANT de demander à Claude d'utiliser le navigateur, et le garder ouvert.
- Fichiers clés : `docs/GUIDE.md`, `docs/BIBLE.md`, `docs/prix-catalogue.md`, `docs/VIDANGE_DOMICILE.md`, `.claude/agents/`, `.mcp.json`, `vercel.json`, `src/lib/{relances,push,pagedFetch,catalogue,dinoun,offlineReceptions,brands}.ts`.
- **À faire ensuite (07/11)** : l'utilisateur ressaisit sa marchandise (premier vrai test du scan caméra sur téléphone) → vérifier avec lui ; puis remplir/structurer le catalogue → relancer la campagne e-mail ; 4 réfs Wix non vérifiées (réseau) à reprendre si besoin.
