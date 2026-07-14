# PROMPT À COLLER DANS FABLE 5 — Bible FiltroPro

---

# MISSION : Écris la « Bible FiltroPro » — vision 10 ans, argent maximum, simplicité maximum

## Qui je suis
Je suis un commerçant **seul** au Maroc. Je vends des **filtres et pièces auto** (huile, air, carburant, habitacle) :
- au comptoir, par **référence** (ex : Filtron OE667/6, Mann HU7032Z, Flag Z555…) ;
- et en **tournées** : je livre des garages dans plusieurs villes, certains paient plus tard (impayés à suivre).
Je travaille sur **téléphone**, souvent **hors-ligne**, en **français et arabe (RTL)**, devise **MAD**.
Je n'ai pas d'équipe, pas de temps : chaque fonctionnalité doit s'utiliser en **1 ou 2 gestes**.

## Mon app aujourd'hui (déjà construite et en ligne)
« FiltroPro » — Next.js 15 + Supabase (PostgreSQL) + Vercel, PWA installable, hors-ligne (ventes synchronisées au retour du réseau).
Fonctionnalités existantes :
- **Produits** : fiche par référence + marque ; chaque produit Filtron a des **variantes de marque** (Mann/Flag/Bosch/Wix…) avec prix achat/vente, stock et **code-barres par marque** (scan caméra).
- **Ventes** : panier par scan ou recherche, choix de la **source d'argent** (capital = mon argent / crédit = fournisseur à rembourser), choix de la marque par ligne, coût figé pour calcul du bénéfice réel, paiements partiels, reçus imprimés et **WhatsApp**.
- **Clients** : soldes dus, relances.
- **Fournisseurs** : type **capital** (mon argent qui grandit) vs **crédit** (dette = marchandise prise − avances).
- **Tournées** : carte gratuite OSM, garages posés au clic, statuts (prospect → à livrer → préparée → livré/reporté), circuit optimisé multi-jours, « Y aller » Google Maps, tuiles cachées hors-ligne.
- **Recherche** : par référence (insensible aux espaces), par véhicule (marque/modèle/année/moteur), par VIN ; vraies données de compatibilité Filtron (table `applications`, 82 véhicules par filtre par ex.).
- **Stats** : bénéfices jour/semaine/mois basés sur le coût réel, par fournisseur, évolution du capital.
- **Étiquettes** code-barres, promos WhatsApp, montants masquables (œil).

## Ta mission
Écris une **BIBLE COMPLÈTE** de ce projet : le document unique que je relirai pendant **10 ans** pour savoir quoi construire, dans quel ordre, et pourquoi.
Objectif n°1 : **maximiser l'argent que ce projet me rapporte**, en gardant une **utilisation ultra-simple** (une personne, un téléphone).
Sois **libre et ambitieux** : tu n'es limité ni par la liste ci-dessous, ni par la taille de l'app actuelle. Si tu vois plus grand (plateforme, marketplace, franchise, données, IA…), dis-le et explique le chemin pour y arriver depuis ma situation réelle.

## Structure demandée (contenu libre, sections obligatoires)

### 1. Vision 10 ans
Où ce projet peut m'amener : de commerçant solo → ??? Décris 2-3 trajectoires possibles (ex : leader local, plateforme B2B pièces auto Maroc, réseau/franchise) avec pour chacune : à quoi ressemble ma journée, mon revenu estimé, et le premier pas concret.

### 2. Les idées qui rapportent (le cœur de la Bible)
Liste d'idées **classées par (argent rapporté × simplicité)**. Pour CHAQUE idée :
- **Le problème** que ça règle (dans MA réalité de commerçant marocain).
- **La solution** en une phrase.
- **Pourquoi ça rapporte** : mécanisme précis (marge, volume, fidélité, temps gagné, clients nouveaux), avec estimation chiffrée même approximative.
- **Utilisation en 1-2 gestes** : décris l'écran et le geste exact. Si ça demande plus, simplifie ou jette.
- **Effort** : S / M / L.
Pense large : acquisition (catalogue public SEO Google, WhatsApp commerce, bouche-à-oreille garages), rétention (fidélité, prix par client grossiste/détail, relances auto d'impayés), marge (achats groupés, promo intelligente sur stock dormant, alertes réappro prédictives), nouveaux revenus (abonnement garages, livraison, données de compatibilité, étiquettes/services aux confrères), et tes propres idées auxquelles je n'ai pas pensé.

### 3. Feuille de route
Phases : **0-6 mois** (quick wins argent), **6-24 mois** (croissance), **2-5 ans** (échelle), **5-10 ans** (vision). Pour chaque phase : 3-5 chantiers max, le résultat attendu en MAD ou en temps gagné, et le signal qui dit « passe à la phase suivante ».

### 4. Spécifications techniques pour Opus (Claude Code)
Pour chaque idée des phases 0-6 mois et 6-24 mois, écris un bloc **« Instructions pour Opus »** copiable tel quel, qui contient :
- Schéma DB : SQL Supabase **idempotent** (`create table if not exists`, `alter table … add column if not exists`, `drop policy if exists`) terminé par `NOTIFY pgrst, 'reload schema';`
- Pages/composants Next.js à créer ou modifier (App Router, TS, Tailwind), et le comportement attendu écran par écran.
- Les contraintes réelles du projet qu'Opus doit respecter : CLI Supabase **bloqué** (le SQL est collé à la main dans l'éditeur web ; les données passent par un script Node `@supabase/supabase-js` avec la clé anon) ; Supabase limite à **1000 lignes/requête** (paginer avec `.range()`) ; la classe CSS `.input` est `w-full` (utiliser des grilles, pas des largeurs Tailwind sur `.input`) ; thème sombre doré, bilingue FR/AR, PWA avec cache (penser au rechargement) ; **ne JAMAIS inventer une référence de pièce**.

### 5. Modèle économique
Comment je gagne aujourd'hui (marge sur pièces) et comment je gagne demain : pricing par segment (comptoir vs garage), quand et comment introduire un abonnement ou un service payant sans faire fuir, seuils chiffrés (ex : « à partir de X garages actifs, lance Y »).

### 6. Risques & garde-fous
Ce qui peut tuer le projet (dépendance à un fournisseur, données fausses, concurrence, impayés, moi-même débordé) et le garde-fou concret pour chacun.

### 7. Tableau de bord des 5 chiffres
Les 5 seuls chiffres que je dois regarder chaque semaine pendant 10 ans, pourquoi ceux-là, et le seuil d'alerte de chacun.

## Règles d'or
1. **Argent d'abord** : chaque page de la Bible doit répondre à « combien ça me rapporte et quand ».
2. **Simplicité absolue** : si une idée demande une formation, elle est mal conçue — redessine-la.
3. **Réaliste depuis MA situation** : une personne, un téléphone, le Maroc, FR/AR, MAD, réseau instable.
4. **Sois concret** : chiffres, exemples avec de vraies références (OE667/6, HU7032Z), écrans décrits geste par geste.
5. **Sois libre** : propose aussi ce que je n'ai pas demandé. Marque ces idées « 💡 BONUS ».
6. **Jamais de référence de pièce inventée** dans les exemples techniques : utilise celles citées ici.

## Format de sortie
Un document **Markdown** unique intitulé `BIBLE.md`, en **français**, sections numérotées comme ci-dessus, tableaux pour les classements d'idées, blocs de code pour le SQL et les « Instructions pour Opus ». Longueur : le nécessaire pour être complet — ne coupe rien, je préfère long et exploitable que court et vague. Termine par une section « Par où je commence lundi matin » : les 3 premières actions, dans l'ordre.
