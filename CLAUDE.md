# FiltroPro — Instructions projet

Plateforme de gestion + catalogue de filtres/pièces auto (commerce au Maroc).
Stack : Next.js 15 (App Router, TS, Tailwind) + Supabase (PostgreSQL) + Vercel.
App en ligne : https://gestion-filtre.vercel.app — GitHub : ventehim25/gestion-filtre (master).
Travailler en **français**. Autonomie totale : agir sans demander, puis rapporter.

## Règle git (IMPORTANTE)
**Commiter ET pusher après CHAQUE modification.** Un commit par changement logique.
`git add` + `git commit` + `git push origin master`. Le dossier contient des espaces → utiliser l'outil Bash pour git.

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
- Lecture/écriture de **données** (insert/update/delete, RPC) marche avec l'anon key via un script Node `@supabase/supabase-js` (voir scripts `_*.mjs` jetables, à supprimer après).

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
- Photos produit : Scene7 via `FilterImage.tsx`. Équivalences = numéros OE (aftermarket indisponible gratuitement).

## Schéma DB (RLS allow-all) — détails colonnes : `src/types/database.ts`
Tables : products, clients, sales, sale_items, vehicules, compatibilites, equivalences, applications,
**garages**, **fournisseurs**, **receptions**, **avances**. Vue product_vehicles.
RPC : `decrement_stock(p_id, qty)`, `decrement_equiv_stock(e_id, qty)` (qty négative = incrémente).
Colonnes ajoutées (migrations dans `supabase/`) :
- products : `prix_promo` (promos.sql)
- equivalences : `prix` (vente), `prix_achat`, `stock` (equivalences_prix.sql + equivalences_stock.sql)
- sale_items : `fournisseur_id` (source capital/crédit), `equivalence_id` (variante de marque vendue), `cout_unitaire` (coût d'achat figé)
- fournisseurs : `type` ('capital' = argent propre type filtropro / 'credit' = à rembourser type dinoun)
- garages : statut ∈ {prospect, a_livrer, preparee, livre, reporte}

## Fonctionnalités principales (par page)
- `/` accueil : raccourcis, chiffres cliquables, montants masquables (œil), alertes (réappro/impayés/hors-ligne/à relancer), vitrine repliable.
- `/tournees` : carte Leaflet/OSM (gratuit), garages (clic = poser), statuts colorés, circuit optimisé multi-jours, "Y aller" Google Maps. Tuiles OSM cachées hors-ligne (sw.js).
- `/produits` : équivalences = **variantes de marque** (Flag/Mann/Wix/Filtrex…) avec prix achat/vente/**stock par marque**. Prix promo + bouton "Promo WhatsApp".
- `/ventes` : choix **source** (capital/crédit) + **marque** par ligne (prix auto, coût figé, décrémente le bon stock), vente croisée, édition/suppression paiement, hors-ligne.
- `/fournisseurs` : type **capital** (filtropro = mon argent, capital qui grandit) vs **crédit** (dinoun = dette : marchandise prise − avances). Filtre mois, montants masquables.
- `/recherche` (par référence) : clic sur la réf = déplie les **références enregistrées** (avec prix), pas les OE auto.
- `/stats` : coûts/bénéfices jour/semaine/mois, par fournisseur, capital vs crédit, évolution du capital. Bénéfices basés sur `cout_unitaire` (fallback `products.prix_achat`).
- PWA installable (bannière), `manifest.json` orientation `any`.

## Scripts (dossier scripts/, reprenables)
scrape_filtron.mjs (apps+équiv+dimensions), scrape_images.mjs (image_url), import_filtron_catalog.mjs,
cleanup_fakes.mjs, seed_garages.mjs. Lancer : `node scripts/xxx.mjs`. (Scripts `_*.mjs` = vérifs jetables.)
