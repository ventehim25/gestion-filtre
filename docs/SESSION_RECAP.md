# 📌 Récap de session — FiltroPro

> Point de reprise pour une nouvelle session. Complément de [GUIDE](GUIDE.md) et [BIBLE](BIBLE.md).
> **Dernière session : 12/11/2026** (sécurité, §00 ci-dessous) · avant : 05→07/11 (§0) ; §1-4 = session du 29/10.

---

## 00. Session du 12/11/2026 — sécurité de la base

- **Code en ligne** :
  - `src/components/AuthGate.tsx` (connexion Supabase Auth email + mot de passe, s'active quand la table `utilisateurs_autorises` existe ; hors-ligne OK si une session existe ; écran « compte non autorisé ») ;
  - `AppShell` l'utilise pour toutes les pages sauf `/c`, `/tarif`, `/catalogue` ;
  - `src/components/CompteSection.tsx` dans `/parametres` ;
  - `src/lib/supabase.ts` : sur le serveur, clé `SUPABASE_SERVICE_ROLE_KEY` si présente ;
  - `/c/[...ref]` : colonnes listées (plus de `select("*")`, donc plus de prix d'achat dans la page publique) ;
  - `scripts/cle_supabase.mjs` utilisé par tous les scripts (clé service de `.env.local`, sinon clé anon).
- **SQL prêt, PAS encore collé** :
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
