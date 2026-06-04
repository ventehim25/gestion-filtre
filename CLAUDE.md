# FiltroPro — Instructions projet

## Règle git (IMPORTANT)
**Après chaque modification, committer sur git** pour que le travail soit toujours sauvegardé.
- Committer directement sur `master` (workflow solo du propriétaire — ne pas créer de branches).
- Message de commit clair, en français, décrivant le changement.
- Grouper les fichiers d'une même fonctionnalité dans un seul commit.
- Ne pas inclure dans le commit les fichiers déjà modifiés avant l'intervention s'ils ne sont pas liés au changement en cours.

## Stack
- Next.js 15 (App Router) · React · TypeScript · Tailwind
- Données : Supabase (client JS `@/lib/supabase`) — le CLI Supabase est bloqué, utiliser le client JS.
- i18n FR/AR via `@/lib/i18n` + `useLang()` (`t()`), thème sombre (accents rouges).
- Hors-ligne : stockage `localStorage` avec préfixe `filtropro_*` (cf. `offlineSales.ts`, `tasks.ts`).
- PWA installable.

## Notes
- Le `next build` ignore les erreurs TypeScript : après un renommage, grep l'ancien nom (sinon crash à l'exécution).
- Les erreurs `tsc` pré-existantes (typage Supabase « never ») sont connues et non bloquantes.
