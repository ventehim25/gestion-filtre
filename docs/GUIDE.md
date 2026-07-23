# 📗 GUIDE FiltroPro — tout ce que fait l'app et comment l'utiliser

> Le mémo pratique de ton app. Tu le relis quand tu oublies comment marche un truc.
> Complément de la [BIBLE](BIBLE.md) (la stratégie 10 ans). Ici, c'est le **mode d'emploi**.
> **Dernière mise à jour : 23/07/2026.**

---

## 1. Les liens importants

| Quoi | Lien | Pour qui |
|---|---|---|
| **L'app (gestion)** | https://gestion-filtre.vercel.app | Toi |
| **Catalogue public** (SANS prix) — QR de la carte | https://gestion-filtre.vercel.app/catalogue | Tout le monde |
| **Catalogue de PRIX privé** | https://gestion-filtre.vercel.app/tarif?k=garages2026 | Tes garages (tu l'envoies) |
| **Catalogue Google** (une page par réf, sans prix) | https://gestion-filtre.vercel.app/c/OE667/6 | Google / nouveaux clients |
| **Carte de visite** (à imprimer) | https://claude.ai/code/artifact/9d16e0f6-8790-4cb4-b600-9aa30da053f7 | À distribuer |

**Numéro / WhatsApp :** 06 02 35 02 90
**Clé du catalogue privé :** `garages2026` (dans le lien `?k=garages2026`). Pour la changer, demande-moi.

---

## 2. Les SQL à coller (statut)

Tous collés dans l'éditeur Supabase : https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new

| Fichier | Ce que ça active | État |
|---|---|---|
| `supabase/clients_segments.sql` | Type client, remise, limite crédit, relances | ✅ collé |
| `supabase/categorie_huile_moteur.sql` | Catégorie « Huile moteur » | ✅ collé |
| `supabase/idees_bible_19_24.sql` | « J'ai pas », avoir, parrainage, réveil clients | ✅ collé |
| `supabase/idees_bible_2eme_vague.sql` | Commandes garages (lien garage↔client), rappels vidange | ✅ collé |
| `supabase/fournisseur_solde_depart.sql` | Solde de départ fournisseur | ✅ collé |
| `supabase/sale_fournisseur_paye.sql` | Camion « dinoun payé » par bon + paiement auto | ✅ collé |
| `supabase/storage_produits.sql` | Stockage des photos produits | ✅ collé |

> Règle : après un `CREATE`/`ALTER`, le SQL finit par `notify pgrst, 'reload schema';` et tu **recharges l'app**.

---

## 3. Ton roulement (l'argent)

**Ton cycle réel :**
1. Tu prends la marchandise chez **dinoun** (fournisseur crédit) → tu ne le paies pas tout de suite.
2. Tu vends au garage → souvent il ne te paie pas tout de suite (impayé).
3. Plus tard, avec ton argent, tu paies dinoun **bon par bon**.
4. Quand le garage te verse, c'est **tout pour toi** (dinoun est déjà payé).

**Dans l'app :**
- **Marchandise prise** (Fournisseurs) → augmente le stock **et** ta dette dinoun. Choisis la **marque** par ligne (le stock va sur la bonne marque).
- **Vente** (Ventes) → choisis la **source** par ligne : **dinoun** (crédit) ou **filtropro** (ton capital). ⚠️ Une ligne sans source n'est comptée nulle part (voyant orange + rappel avant d'enregistrer).
- **Camion 🚚** sur un bon (Ventes) → marque « dinoun payé » : ça **baisse ta dette dinoun** automatiquement (du coût de sa marchandise sur ce bon). Re-cliquer annule.
- **Solde de départ** (Fournisseurs, crayon) : ce que tu dois déjà à dinoun au démarrage. `50000` = tu lui dois ; négatif (`-500`) = il te doit.
- **Capital (filtropro)** = ton argent qui tourne et grandit. **Crédit (dinoun)** = dette à rembourser.

**Sur un impayé (accueil, carte « À relancer »)**, tu vois : **ta marge** · **coût couvert** (filtropro OU bon dinoun payé) · **à payer dinoun** (le reste dû au fournisseur).

---

## 4. Les pages de l'app

- **Accueil** : recherche par réf, chiffres, alertes. Cartes : **À relancer (impayés)** avec WhatsApp 1-tap, **À réveiller** (clients endormis), **Vidanges à rappeler**, bouton **📣 Arrivages** (message hebdo à poster en statut WhatsApp).
- **Produits** : fiche par référence + variantes de marque (prix achat/vente/stock/code-barres par marque). **📷 Photo du filtre**. Bouton **fiche WhatsApp**. Promo + « Promo WhatsApp ».
- **Stock** : compter les quantités (scan +1 par boîte, ou saisie). Pour le démarrage.
- **Réappro** : 4 onglets — **Sous seuil**, **📈 Prédictif** (jours de stock restants, commande WhatsApp), **💤 Dormant** (rien vendu 90 j → promo −15 %), **🔎 Demandé** (les « j'ai pas »).
- **Fournisseurs** : capital vs crédit, marchandise prise, avance/paiement, solde de départ, historique. Montants masquables (œil).
- **Clients** : type (comptoir/garage/gros), remise, limite crédit, badge fiabilité, avoir, parrainage, **paliers de fidélité** (suggestion trimestrielle), **+ Ancien impayé** (dette d'avant l'app).
- **Ventes** : panier (scan/recherche), source par ligne, **pack vidange** (propose l'huile avec le filtre), pastille de marge, devis WhatsApp, camion dinoun, supprimer une vente (rend le stock).
- **Commandes garages** : colle le message WhatsApp d'un garage → **vente préparée** (jamais de devinette : inconnu = rouge). Onglet **📦 Chargement du jour**.
- **Tournées** : carte, garages, statuts, circuit optimisé.
- **Stats** : coûts/bénéfices jour/semaine/mois, par fournisseur, capital vs crédit, **📊 Mon bilan de la semaine** (WhatsApp).
- **Catalogues** : catalogue de prix privé (lien + copier/WhatsApp + **Générer PDF**), + les PDF Filtron fixes.
- **Étiquettes, Rappels, Paramètres** : outils annexes.

---

## 5. Le catalogue (comment le gérer)

**Tout se pilote depuis la page Produits.** Change un prix, un stock, une photo → les catalogues suivent tout seuls. **Pas besoin de moi.**

- **Prix** : mets-le dans **Produits** (obligatoire pour vendre). Le catalogue de prix affiche le prix de vente (jamais le prix d'achat).
- **Disponibilité** : un filtre en stock 0 disparaît du catalogue tout seul ; en stock → il apparaît.
- **Photos** : Produits → fiche → **📷 Prendre / choisir** (appareil photo arrière). La photo s'affiche à côté de la réf dans les catalogues et le PDF. Sans photo : logo FiltroPro côté client, appareil photo côté toi (= à photographier).
- **Références** : la recherche des catalogues trouve ton filtre par **n'importe quelle référence équivalente** que tu as (Mann, Bosch, OE…). Plus tu ajoutes de réfs dans **Produits → Variantes de marque**, plus ça couvre.
- **Panier** : le garage ajoute des quantités (compteur éditable) → **Envoyer la commande** → message WhatsApp « QTÉ RÉF » que tu **colles dans Commandes garages** → vente préparée.
- **PDF** : Catalogues → **Générer PDF** → catalogue pro (couverture, cartes photos, prix), regroupé par **préfixe** (OP, OE, AP… + Autres). Attends que les photos chargent avant d'imprimer.

**Deux catalogues, deux usages :**
- **Public** (`/catalogue`, QR carte) : sans prix, pour tout le monde.
- **Privé** (`/tarif?k=garages2026`) : avec prix, à envoyer aux garages seulement.

---

## 6. Faire entrer ton cahier (démarrage)

Fais une **marque « début app »** dans ton cahier. Avant la marque = un seul chiffre ; après = dans l'app.

1. **Stock** : compte les boîtes sur l'étagère (page Stock). Ça ne touche pas à l'argent.
2. **Dette dinoun** : Fournisseurs → dinoun → crayon → **Solde de départ** = ce que tu lui dois (ex. `50000`).
   - *Solde de départ = (marchandise prise) − (avances versées), jusqu'à la marque.* Estime maintenant, corrige plus tard (tu changes juste le chiffre).
3. **Garages qui te doivent déjà** : Clients → fiche → **+ Ancien impayé** (montant + date).
4. **Après la marque** : tout dans l'app (marchandise prise, ventes, camion dinoun payé).

⚠️ Ne rentre jamais deux fois : ce qui est avant la marque reste un seul chiffre (solde de départ), pas des bons ressaisis.

---

## 7. Les réflexes qui rapportent

- **Client qui ne paie pas** → carte « À relancer » → WhatsApp 1-tap.
- **On te demande une réf que tu n'as pas** → Recherche → **« ❌ J'ai pas »** (à 3 demandes, l'app te dit de la stocker).
- **Tu vends un filtre à huile** → tape l'**huile** proposée (pack vidange).
- **Tu paies dinoun un bon** → **camion 🚚** vert.
- **Vendredi** → **📣 Arrivages** en statut WhatsApp + **📊 Mon bilan** (Stats).
- **Un dimanche** → prends tes filtres en photo (Produits) petit à petit.

---

## 8. Les 5 chiffres à regarder chaque vendredi (Bible §7)

1. **Bénéfice net de la semaine** (pas le CA).
2. **Encaissé ÷ vendu (%)** — alerte si < 80 %.
3. **Impayés** : total + le plus vieux.
4. **Stock dormant** (valeur au prix d'achat).
5. **Garages actifs sur 30 jours.**

---

*Généré avec Claude Code. Pour toute modif de l'app, on repart de ce guide et de la [BIBLE](BIBLE.md).*
