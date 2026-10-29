# 📌 Récap de session — FiltroPro

> Point de reprise pour une nouvelle session. Complément de [GUIDE](GUIDE.md) et [BIBLE](BIBLE.md).
> **Dernière session : 29/10/2026.**

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
- Fichiers clés : `docs/GUIDE.md`, `docs/BIBLE.md`, `docs/prix-catalogue.md`, `docs/VIDANGE_DOMICILE.md`, `.claude/agents/`, `.mcp.json`, `vercel.json`, `src/lib/{relances,push,pagedFetch,catalogue}.ts`.
