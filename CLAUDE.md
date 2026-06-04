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
- SQL Supabase : `npx supabase db query --linked --file "supabase/x.sql"` (projet linké).
- Supabase ref `wehsvgoolozqzxsgwibb`. Clé anon JWT publique en fallback dans `src/lib/supabase.ts`.

## Gotchas
- Supabase limite à **1000 lignes/requête** → toujours paginer avec `.range()`.
- Ne jamais piper une string vers `vercel env add` (BOM PowerShell casse l'en-tête) — déjà géré par le fallback clé propre.
- Fetch externe en PowerShell : forcer `Tls12`.

## Design / marque
- Thème **sombre**, accents **ROUGE & NOIR** (PAS de jaune ni orange). Nom : **FiltroPro**.
- Logo : `src/components/Logo.tsx` (hexagone rouge + courbes de filtration).
- UI bilingue FR/AR (RTL), devise MAD.

## Règle données
- **Ne JAMAIS inventer de référence** de pièce. Au moindre doute, ignorer.
- Source de vérité véhicules : table `applications` (vraies données Filtron) > `compatibilites` (mapping fait main).
- Photos produit : Scene7 via `FilterImage.tsx`. Équivalences = numéros OE (aftermarket indisponible gratuitement).

## Schéma DB (RLS allow-all)
products, clients, sales, sale_items, vehicules, compatibilites, equivalences, applications,
vue product_vehicles, RPC decrement_stock. Détails colonnes : voir src/types/database.ts.

## Scripts (dossier scripts/, reprenables)
scrape_filtron.mjs (apps+équiv+dimensions), scrape_images.mjs (image_url), import_filtron_catalog.mjs,
cleanup_fakes.mjs. Lancer : `node scripts/xxx.mjs`.
