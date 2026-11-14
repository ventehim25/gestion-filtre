# FiltroPro — Instructions projet

Plateforme de gestion + catalogue de filtres/pièces auto (commerce au Maroc).
Stack : Next.js 15 (App Router, TS, Tailwind) + Supabase (PostgreSQL) + Vercel.
App en ligne : https://gestion-filtre.vercel.app — GitHub : ventehim25/gestion-filtre (master).
Travailler en **français**. Autonomie totale : agir sans demander, puis rapporter.

## Règle git (IMPORTANTE)
**Commiter ET pusher après CHAQUE modification.** Un commit par changement logique.
`git add` + `git commit` + `git push origin master`. Le dossier contient des espaces → utiliser l'outil Bash pour git.

## Règle « tout enregistrer » (IMPORTANTE — demande de l'utilisateur)
Tout ce qui est fait (fonction livrée, décision, donnée importée/remise à zéro) est **noté dans `docs/BIBLE.md` §8 « Journal des livraisons »** (daté, où c'est, le geste) — et le « Par où je commence lundi matin » de la Bible est tenu à jour. Le point de reprise technique va dans `docs/SESSION_RECAP.md`, le mode d'emploi dans `docs/GUIDE.md`. À faire **avant de terminer** chaque série de changements.
- Contrôle qualité : `npx tsc --noEmit -p .` doit rester à **0 erreur** (le build ignore TS) ; toute nouvelle table/colonne → l'ajouter au type `Database` de `src/types/database.ts`.
- Le CLI `vercel` peut avoir un jeton expiré : **le push GitHub déploie tout seul**. Le SQL peut être exécuté par Claude dans l'éditeur Supabase via Chromium (« Run without RLS » = fausse alerte sur les INSERT).

## Environnement (Windows / PowerShell 5.1)
- Node PAS dans le PATH : préfixer les commandes par
  `$env:PATH = "C:\Program Files\nodejs;C:\Users\deux\AppData\Roaming\npm;" + $env:PATH`
- Build : `npm run build` · Déploiement : `vercel --prod --yes`
- next.config.ts ignore les erreurs TS/ESLint (`ignoreBuildErrors`) — normal.
- Supabase ref `wehsvgoolozqzxsgwibb`. Clé anon JWT publique en fallback dans `src/lib/supabase.ts`.

## DDL / migrations Supabase (IMPORTANT)
- Le **CLI Supabase est bloqué** (Smart App Control Windows) et la **clé anon ne peut pas faire de DDL**.
- Pour créer table/colonne/fonction : fournir un fichier `supabase/*.sql` et **le faire coller à l'utilisateur dans l'éditeur SQL web** (https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new). Écrire le SQL **idempotent** (`if not exists`, `drop policy if exists`).
- Après un CREATE/ALTER, le cache PostgREST peut ne pas voir la table en écriture : terminer le SQL par `NOTIFY pgrst, 'reload schema';` (sinon erreur « Could not find the table … in the schema cache » côté app).
- Lecture/écriture de **données** (insert/update/delete, RPC) par script Node `@supabase/supabase-js` : importer `SUPABASE_URL, SUPABASE_CLE` de `scripts/cle_supabase.mjs` (après `securite.sql`, la clé anon ne suffit plus : il faut `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`). Scripts `_*.mjs` jetables, à supprimer après.

## Gotchas
- Supabase limite à **1000 lignes/requête** → toujours paginer avec `.range()`.
- La classe CSS `.input` (globals.css) est **`w-full`** : elle écrase `w-28`/`w-16`/`flex-1` dans une rangée flex (champs qui disparaissent). Pour des formulaires multi-champs, utiliser une **grille avec libellés** (un `.input` par cellule), pas des largeurs Tailwind sur `.input`.
- Ne jamais piper une string vers `vercel env add` (BOM PowerShell casse l'en-tête) — déjà géré par le fallback clé propre.
- Fetch externe en PowerShell : forcer `Tls12`.

## Design / marque
- Thème **sombre**, accents **doré & brillant**. Nom : **FiltroPro**.
- Logo : `src/components/Logo.tsx` (hexagone rouge + courbes de filtration).
- UI bilingue FR/AR (RTL), devise MAD.

## Règle données
- **Ne JAMAIS inventer de référence** de pièce. Au moindre doute, questionner.
- Source de vérité véhicules : table `applications` (vraies données Filtron) > `compatibilites` (mapping fait main).
- Photos produit : Scene7 via `FilterImage.tsx`. Équivalences = numéros OE (scrape Filtron) **+ variantes de marque officielles** pour les 120 réfs vendues : Mann (+EAN), Wix (catalogues mann-filter.com / wixfilters.com), Mahle & Purflux (filtron.eu, recherche « référence correspondante »). Liste des marques gérées : `src/lib/brands.ts` (FILTER_BRANDS).

## Sécurité (12/11/2026) — `supabase/securite.sql` (voir GUIDE §9)
- Une fois le SQL collé : RLS **fermé**. Chaque table a la règle `equipe` (`for all to authenticated using (public.est_autorise())`). Seuls les emails de `utilisateurs_autorises` accèdent aux données. Le public (anon) ne lit QUE products/equivalences/applications, en **colonnes limitées** (jamais `prix_achat`).
- **Nouvelle table** → dans son SQL : `alter table … enable row level security;` + `create policy equipe on public.xxx for all to authenticated using (public.est_autorise()) with check (public.est_autorise());`. Si une page publique doit la lire : `grant select (colonnes) … to anon` + une règle `for select to anon`.
- **Pages publiques** (`/c`, `/tarif`, `/catalogue`, sitemap) : toujours lister les colonnes, jamais `select("*")`.
- Connexion : `src/components/AuthGate.tsx` (s'active quand `utilisateurs_autorises` existe). Serveur : `SUPABASE_SERVICE_ROLE_KEY` (variable Vercel, sans `NEXT_PUBLIC_`). Scripts : `scripts/cle_supabase.mjs` (clé service lue dans `.env.local`). Ne jamais mettre la clé service dans le code ni sur GitHub.

## Schéma DB — détails colonnes : `src/types/database.ts`
Tables : products, clients, sales, sale_items, vehicules, compatibilites, equivalences, applications,
**garages**, **fournisseurs**, **receptions**, **avances**, **prospects**, rappels_vidange, demandes_manquees, push_subscriptions. Vues product_vehicles, prospects_par_jour.
RPC : `decrement_stock(p_id, qty)`, `decrement_equiv_stock(e_id, qty)` (qty négative = incrémente).
Colonnes ajoutées (migrations dans `supabase/`) :
- products : `prix_promo` (promos.sql)
- equivalences : `prix` (vente), `prix_achat`, `stock` (equivalences_prix.sql + equivalences_stock.sql)
- sale_items : `fournisseur_id` (source capital/crédit), `equivalence_id` (variante de marque vendue), `cout_unitaire` (coût d'achat figé)
- fournisseurs : `type` ('capital' = argent propre type filtropro / 'credit' = à rembourser type dinoun)
- garages : statut ∈ {prospect, a_livrer, preparee, livre, reporte}
- clients : `quartier`, `latitude`/`longitude` (localisation exacte), `origine` ('terrain' | 'prospection')
- receptions : `lignes` jsonb (détail produit/variante/qté → annulation propre)
- avances : `sale_id` (remboursement dinoun d'un bon via le camion) · sales : `fournisseur_paye`
- prospects : robots OSM/Google + note d'intérêt `score` /10 + `statut_prospection`

## Fonctionnalités principales (par page)
- `/` accueil : **4 gros boutons** Réception (`/fournisseurs?reception=1`) · Vente (`/ventes?nouvelle=1`) · Encaisser (`/ventes?impayes=1`) · Mon activité (`/stats`), chiffres cliquables, montants masquables (œil), alertes, vitrine repliable.
- `/tournees` : carte Leaflet/OSM (gratuit), garages (clic = poser), statuts colorés, circuit optimisé multi-jours, "Y aller" Google Maps. Tuiles OSM cachées hors-ligne (sw.js).
- `/produits` : équivalences = **variantes de marque** (Flag/Mann/Wix/Filtrex…) avec prix achat/vente/**stock par marque**. Prix promo + bouton "Promo WhatsApp".
- `/ventes` : **source par ligne automatique** (fournisseur de la dernière réception du filtre, `receptions.lignes`) + boutons dinoun|filtropro ; marque par ligne (recherche par réf Mann/Wix/Mahle/Purflux…) ; prix auto, coût figé ; camion **« Rembourser {coût} »** (`src/lib/dinoun.ts`) ; filtre impayés ; hors-ligne.
- `/fournisseurs` : type **capital** (filtropro = mon argent, capital qui grandit) vs **crédit** (dinoun = dette : départ + marchandise prise − avances). **Marchandise prise** : choix « Chez », scan des boîtes (+1/boîte), prix achat+vente enregistrés sur la fiche, « + Autre marque », code-barres mémorisé, **hors-ligne** (`src/lib/offlineReceptions.ts`), annulation ✕ dans l'historique. Liste « Bons à rembourser » (dinoun).
- `/clients` : onglets **Terrain / Venus de la prospection**, quartier, localisation GPS + « Y aller » + « Ajouter à la tournée », filtres Ville/Quartier.
- `/prospects` : prospects collectés (OSM quotidien + Google Maps à la main), note /10, suivi ; « A passé commande → créer la vente » (seule façon de devenir client).
- `/recherche` (par référence) : clic sur la réf = déplie les **références enregistrées** (avec prix), pas les OE auto.
- `/stats` : coûts/bénéfices jour/semaine/mois, par fournisseur, capital vs crédit, évolution du capital. Bénéfices basés sur `cout_unitaire` (fallback `products.prix_achat`).
- PWA installable (bannière), `manifest.json` orientation `any`.

## Scripts (dossier scripts/, reprenables)
completer_filtron.mjs (applications depuis le nouveau site Filtron, liste complète, sans doublons — remplace scrape_filtron.mjs dont l'adresse répond 404), scrape_images.mjs (image_url), import_filtron_catalog.mjs,
cleanup_fakes.mjs, seed_garages.mjs, scrape_prospects_osm.mjs / scrape_prospects_gmaps.mjs (API Places, clé optionnelle) / import_gmaps_manuel.mjs / prospect_score.mjs (note /10 + envoi Supabase), prospects_quotidien.cmd (tâche Windows 9 h 30), sauvegarde.mjs (copie complète de la base dans `backups/AAAA-MM-JJ/`, tâche Windows « FiltroPro-Sauvegarde » 13 h via sauvegarde_quotidienne.cmd) / restaurer.mjs (compare, puis `--ecrire` remet les lignes manquantes). Lancer : `node scripts/xxx.mjs`. (Scripts `_*.mjs` = vérifs jetables.)
