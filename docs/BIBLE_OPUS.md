# BIBLE FILTROPRO — version Opus (pour comparer avec Fable)

> Écrite par Opus, qui a construit l'app et connaît chaque table et chaque écran.
> Principe : **l'argent le plus facile est celui que tu as déjà gagné mais pas encaissé, puis celui qui dort dans ton stock, puis seulement les nouveaux clients.**

---

## 1. Vision 10 ans — 3 trajectoires

### T1. Le comptoir augmenté (la plus sûre)
Tu restes seul, mais l'app fait le travail de 3 personnes. Relances automatiques, prix par segment, réappro prédictif : **+30 à 50 % de bénéfice net sans un client de plus**, uniquement en récupérant les fuites (impayés, stock dormant, marge mal facturée).
*Ta journée :* matin tournée optimisée, après-midi comptoir, zéro comptabilité le soir.
*Premier pas :* activer les relances d'impayés (semaine 1).

### T2. Le grossiste des garages (la plus rentable à 5 ans)
50 à 150 garages te commandent par WhatsApp, l'app transforme leurs messages en ventes préparées, tes tournées deviennent des livraisons vendues d'avance. Tu ajoutes un service payant « réappro automatique » quand ils dépendent de toi.
*Ta journée :* tu livres ce qui est déjà vendu. Le comptoir devient secondaire.
*Premier pas :* le parseur de commandes WhatsApp (mois 2-3).

### T3. La plateforme pièces auto Maroc (le billet de loterie contrôlé)
Ton vrai trésor caché : la **table `applications`** (compatibilités véhicule↔filtre réelles). Publiée en catalogue public, elle attire sur Google tous ceux qui cherchent « filtre Berlingo 1.5 BlueHDi Maroc ». À terme : marketplace où d'autres vendeurs paient pour être listés sur TES données.
*Premier pas :* catalogue public SEO (mois 3-6) — coût quasi nul, il réutilise tes données existantes.

**Ma recommandation : T1 immédiatement, T2 en parallèle dès le mois 2, T3 en fond de tâche. Les trois se cumulent, elles ne s'excluent pas.**

---

## 2. Les idées classées (argent × simplicité)

| # | Idée | Rapporte | Effort | Geste utilisateur |
|---|------|----------|--------|-------------------|
| 1 | Relances impayés WhatsApp J+7/J+15 | 💰💰💰 immédiat | S | 1 tap sur « Relancer » |
| 2 | Prix par segment client (comptoir/garage/gros) | 💰💰💰 permanent | S | 0 geste (auto à la vente) |
| 3 | Promo auto sur stock dormant 60 j | 💰💰 trimestriel | S | 1 tap « Promo WhatsApp » |
| 4 | Limite de crédit par client | 💰💰 (pertes évitées) | S | 0 geste (alerte à la vente) |
| 5 | Commande WhatsApp → vente préparée | 💰💰💰 croissance | M | coller le message, valider |
| 6 | Réappro prédictif (vitesse de vente réelle) | 💰💰 (ruptures évitées) | M | lire la liste, commander |
| 7 | Catalogue public SEO | 💰💰💰 à 12 mois | M | 0 geste (ça tourne seul) |
| 8 | Bilan hebdo automatique WhatsApp (à toi-même) | 💰 (pilotage) | S | lire un message le vendredi |
| 9 | 💡 BONUS : score de fiabilité garage (paye vite/lent) | 💰💰 | S | badge couleur sur la fiche |
| 10 | 💡 BONUS : abonnement « réappro auto » garages | 💰💰💰 à 2 ans | L | — (phase 2-5 ans) |

### Détail des 4 premières (les quick wins)

**1. Relances impayés.** Problème : l'argent des garages « je te paye la prochaine fois » — c'est TON bénéfice déjà gagné qui dort. Solution : la page d'accueil liste chaque client avec solde dû et ancienneté ; bouton WhatsApp pré-rempli, poli, en français ou arabe. Pourquoi ça rapporte : si tu as 15 000 MAD d'impayés et que tu en récupères 60 % un mois plus tôt, c'est du cash immédiat sans vendre une pièce. Geste : 1 tap.

**2. Prix par segment.** Problème : tu donnes parfois le prix garage à un client comptoir (marge perdue) ou l'inverse (client perdu). Solution : chaque client a un type ; à la vente, le prix s'ajuste seul (ex : comptoir = prix affiché, garage = −8 %, gros = −12 %). Pourquoi ça rapporte : +2-3 points de marge sur la moitié de tes ventes = des milliers de MAD/an. Geste : zéro, c'est automatique.

**3. Stock dormant.** Problème : chaque filtre immobile 60 jours+ est du capital gelé qui aurait pu tourner 2 fois. Solution : l'app détecte (dernière vente par produit via `sale_items`) et te propose la liste + prix promo suggéré + message WhatsApp en 1 tap. Pourquoi ça rapporte : libérer 10 000 MAD de stock mort = 10 000 MAD réinvestis dans ce qui tourne.

**4. Limite de crédit.** Problème : un garage qui doit déjà 4 000 MAD et qui recommande. Solution : plafond par client ; à la vente, alerte rouge « dépasse sa limite » — tu décides, mais en connaissance. Pourquoi ça rapporte : une seule perte évitée paie l'année.

---

## 3. Feuille de route

**0-6 mois (encaisser) :** idées 1, 2, 3, 4 + idée 8. Résultat attendu : impayés ÷2, marge +2 pts, stock dormant liquidé. Signal de passage : impayés stables sous contrôle → phase suivante.

**6-24 mois (croître) :** idées 5, 6, 7 + score garage (9). Résultat : 20-50 garages en commande WhatsApp régulière, premières demandes entrantes via Google. Signal : ≥30 garages actifs/mois → phase suivante.

**2-5 ans (échelle) :** abonnement réappro auto (10) ; embauche d'un livreur (l'app lui donne le circuit, toi tu gardes ventes et achats) ; 2ᵉ point de stock si une ville le justifie.

**5-10 ans (vision) :** T3 — ouvrir le catalogue à d'autres vendeurs (commission ou listing payant). Tes données de compatibilité et ta réputation sont l'actif ; l'app n'est que le véhicule.

---

## 4. Instructions pour Opus (copiables telles quelles)

### 4.1 Relances impayés + limite de crédit
```sql
alter table clients add column if not exists type text not null default 'comptoir'; -- comptoir|garage|gros
alter table clients add column if not exists remise_pct numeric not null default 0;
alter table clients add column if not exists limite_credit numeric not null default 0; -- 0 = pas de limite
alter table clients add column if not exists derniere_relance date;
notify pgrst, 'reload schema';
```
- Accueil : section « À relancer » = clients avec `solde_du > 0`, triés par ancienneté de la plus vieille vente impayée ; bouton WhatsApp (`sendWhatsApp` existant) avec message FR/AR pré-rempli (« Salam {nom}, un petit rappel : reste {solde} MAD — merci ! ») ; après envoi, mettre à jour `derniere_relance`.
- Ventes : si `solde_du + total > limite_credit` (et limite > 0), bandeau rouge non bloquant.

### 4.2 Prix par segment
- À la sélection du client dans `/ventes`, appliquer `remise_pct` du client sur `prix_unitaire` de chaque ligne (arrondi à l'entier), modifiable à la main ligne par ligne. Aucune nouvelle table. Zéro geste.

### 4.3 Stock dormant
- Pas de SQL. Dans `/produits` (ou `/reappro`) : requête paginée `sale_items` des 60 derniers jours → set des `product_id` vendus ; tout produit avec `stock > 0` hors de ce set = dormant. Badge « 😴 60 j+ », tri par valeur immobilisée (`stock × prix_achat`), bouton « Promo WhatsApp » réutilisant `prix_promo` + `promoWhatsApp()` existants.

### 4.4 Commande WhatsApp → vente préparée
- Nouvelle page `/commandes` : zone de collage du message du garage ; parseur = normalisation sans espaces/majuscule (réutiliser la logique `norm` de `/produits`) qui matche chaque ligne contre `products.reference` **et** `equivalences.reference` (variante → `equivalence_id` prérempli) ; lignes reconnues → création d'une vente `en_attente` liée au client, non reconnues → affichées en rouge pour choix manuel. **Ne jamais deviner une référence : en cas d'ambiguïté, demander.**
- Lier au garage de `/tournees` : passer son statut à `preparee`.

### 4.5 Catalogue public SEO
- Routes publiques `/c/[reference]` (SSG + revalidation) : réf, marque, dimensions, image, véhicules compatibles (table `applications`), équivalences enregistrées, bouton WhatsApp « Demander le prix ». Pas de prix affiché public (choix commercial), pas d'auth. `sitemap.xml` généré depuis `products`. Métadonnées : « Filtre {catégorie} {réf} — compatible {marque} {modèle} — Maroc ».
- Contraintes : paginer `.range()` pour le sitemap ; images Scene7 via `FilterImage` existant.

### 4.6 Bilan hebdo
- Bouton (puis plus tard cron Vercel) qui compose un WhatsApp à toi-même : CA semaine, bénéfice (basé `cout_unitaire`), encaissé, impayés totaux, top 3 ventes, stock dormant. Réutilise les calculs de `/stats`.

**Rappels permanents pour Opus :** SQL collé à la main (CLI bloqué) ; `.range()` au-delà de 1000 lignes ; `.input` est `w-full` → grilles ; FR/AR RTL ; MAD ; PWA → prévenir l'utilisateur de recharger ; commit+push à chaque modif ; **jamais de référence inventée**.

---

## 5. Modèle économique

- **Aujourd'hui :** marge sur pièces (achat 18 → vente 30 sur OE667/6 ≈ 40 %). Le levier n'est pas le prix, c'est **la rotation** (stock qui tourne) et **l'encaissement** (impayés).
- **Demain :** la remise par segment est un outil de fidélisation qui te coûte 8 % mais sécurise le volume garage. La promo dormant sacrifie 10-15 % de marge sur du capital qui en perdait 100 %.
- **Après-demain :** quand ≥30 garages commandent chaque mois par WhatsApp, propose « réappro auto » : tu livres sans qu'ils commandent, facturation fin de mois, 99-199 MAD/mois de service. Ils gagnent du temps, tu gagnes la récurrence. Ne le lance PAS avant : sans dépendance installée, ça fera fuir.
- **Un jour :** le catalogue public devient la porte d'entrée d'une marketplace (commission 3-5 % ou listing payant pour confrères).

## 6. Risques & garde-fous

| Risque | Garde-fou |
|---|---|
| Référence fausse vendue | Règle absolue : jamais inventer ; source = `applications` (Filtron officiel) ; en cas de doute l'app demande |
| Impayés qui explosent | Limite de crédit + relances + score de fiabilité |
| Dépendance au fournisseur crédit (dinoun) | Suivre le ratio capital/crédit dans `/stats` ; objectif : part capital qui monte chaque trimestre |
| Toi, débordé ou malade | Simplicité (1 geste), données dans Supabase (rien dans ta tête), bilan hebdo écrit |
| Concurrence qui copie | Ce qui est copiable c'est l'app ; ce qui ne l'est pas : tes données de compatibilité, ton historique clients, ta tournée. Nourris-les. |
| PWA qui sert une vieille version | Afficher la version dans Paramètres + bandeau « mise à jour disponible » |

## 7. Les 5 chiffres du vendredi

1. **Bénéfice net de la semaine** (pas le CA — le bénéfice, basé sur `cout_unitaire`). Alerte : 2 semaines en baisse.
2. **Encaissé / vendu** (cash-in ÷ CA). Alerte : < 80 %.
3. **Total impayés et âge du plus vieux**. Alerte : > 1 mois de bénéfice, ou une dette > 45 jours.
4. **Valeur du stock dormant 60 j+**. Alerte : > 15 % du stock total.
5. **Garages actifs 30 j** (au moins une commande). Alerte : 2 mois sans croissance → repasse une journée en prospection tournée.

## Par où je commence lundi matin

1. **Colle le SQL 4.1** dans Supabase, puis demande à Opus d'implémenter les relances impayés — c'est ton argent déjà gagné.
2. **Tague tes 20 meilleurs clients** (garage/gros + remise) — 15 minutes, et la marge se corrige toute seule.
3. **Lance la première promo stock dormant** — le capital libéré finance la suite.
