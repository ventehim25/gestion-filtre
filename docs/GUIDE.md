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
| `supabase/securite.sql` | **Base protégée + connexion obligatoire** (voir §9) | ✅ collé le 12/11/2026 (compte ventehim@gmail.com) |
| `supabase/vin_connus.sql` | Mémoire des VIN confirmés (« VIN ou code moteur ») | ✅ collé le 12/11/2026 |
| `supabase/categories_distribution.sql` | Catégories **chaîne, courroie, pompe à eau, kit de distribution** (voir §16) | ✅ collé le 16/11/2026 (remplacé par la ligne suivante) |
| `supabase/categories_produits.sql` | **Les 9 familles de pièces** (freinage, embrayage, batteries…) ; ensuite plus aucun SQL pour une nouvelle catégorie (voir §16) | ✅ collé le 16/11/2026 |

> Règle : après un `CREATE`/`ALTER`, le SQL finit par `notify pgrst, 'reload schema';` et tu **recharges l'app**.

---

## 3. Ton roulement (l'argent)

**Ton cycle réel :**
1. Tu prends la marchandise chez **dinoun** (fournisseur crédit) → tu ne le paies pas tout de suite.
2. Tu vends au garage → souvent il ne te paie pas tout de suite (impayé).
3. Plus tard, avec ton argent, tu paies dinoun **bon par bon**.
4. Quand le garage te verse, c'est **tout pour toi** (dinoun est déjà payé).

**Dans l'app :**
- **Marchandise prise** (accueil → **Réception**, ou Fournisseurs) → choisis **chez qui** (dinoun = dette, filtropro = ton argent), puis **scanne les boîtes** (+1 par boîte) ou tape la réf (Filtron, Wix, Mann, Mahle, Purflux, Mecafilter… reconnues). Par ligne : qté, **prix d'achat + prix de vente** (marge affichée), marque (« + Autre marque » crée Mahle/Purflux/Mecafilter/SIMI/Meat & Doria…), code-barres mémorisé. **Une marque qui n'est pas dans la liste ?** Dans la liste des marques, choisis **« ➕ Nouvelle marque… »**, écris son nom comme sur la boîte : elle est enregistrée pour toujours et proposée partout (Réception, Produits, Vente), sur tous tes appareils. Enregistrer → stock + prix sur la fiche + dette (ou capital) + catalogue à jour. **Marche hors-ligne** : envoyée au retour du réseau (bandeau jaune).
- **Je reçois** (en haut de Marchandise prise) : touche la famille (**Filtres et huile · Distribution moteur · Freinage · Embrayage · Direction/Suspension · Démarrage électrique · Essuie-glaces · Habitacle · Autres**) → la recherche de chaque ligne ne montre que ça (le choix est gardé). Le scan des boîtes reconnaît tout, quel que soit le choix. Détails : §16.
- **Erreur de réception / de paiement** → Fournisseurs → Historique → **✕** sur la ligne : la réception est annulée (stock retiré + dette corrigée) ; un paiement libre est annulé.
- **Vente** (accueil → **Vente**) → la **source de chaque ligne se met toute seule** : celle de la **dernière réception** de ce filtre (dinoun ou filtropro ; à défaut dinoun). Un même bon peut mélanger les deux. Sous chaque ligne, 2 boutons **dinoun | filtropro** : 1 tap pour corriger.
- **Le portefeuille dinoun** (depuis le 16/11) : quand un bon est payé, sur le bon (Ventes) bouton **🚚 👛 Mettre de côté {coût}** → devient **👛 De côté** : l'argent est dans ton portefeuille, **la dette ne baisse pas encore**. Ou dans Fournisseurs → carte dinoun → **Bons à mettre de côté**.
- **Donner l'argent à dinoun** (après un mois ou plus) : Fournisseurs → carte dinoun → **👛 Portefeuille : X MAD** → **Donner à dinoun** → tape la somme comptée → **une seule avance** est enregistrée (c'est là que la dette baisse) et le portefeuille se vide ; les bons passent à **✓ Donné**. Un bon mis de côté par erreur : **Sortir** dans la liste du portefeuille. Le paiement du garage reste séparé : il ne touche jamais dinoun.
- **Encaisser un garage** → accueil → **Encaisser** (liste des impayés) → 💰 sur le bon.
- **Solde de départ** (Fournisseurs, crayon) : ce que tu dois déjà à dinoun au démarrage. `50000` = tu lui dois ; négatif (`-500`) = il te doit.
- **Capital (filtropro)** = ton argent qui tourne et grandit. **Crédit (dinoun)** = dette à rembourser.

**Sur un impayé (accueil, carte « À relancer »)**, tu vois : **ta marge** · **coût couvert** (filtropro OU bon dinoun payé) · **à payer dinoun** (le reste dû au fournisseur).

---

## 4. Les pages de l'app

- **Accueil** : **4 gros boutons** (Réception · Vente · Encaisser · Mon activité), recherche par réf, chiffres, alertes. Cartes : **À relancer (impayés)** avec WhatsApp 1-tap, **À réveiller** (clients endormis), **Vidanges à rappeler**, bouton **📣 Arrivages** (message hebdo à poster en statut WhatsApp).
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
- **Un bon est payé** → **camion 🚚 « 👛 Mettre de côté »** (l'argent va dans le portefeuille dinoun). **Tu donnes le portefeuille à dinoun** → Fournisseurs → **Donner à dinoun**.
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

## 9. Sécurité : protéger la base (à faire une seule fois, environ 15 minutes)

Avant : n'importe qui pouvait lire, modifier ou effacer tes clients, tes ventes et tes prix d'achat avec la clé publique de l'appli. Après : il faut te connecter, et seuls les emails autorisés voient les données. Le catalogue public (`/catalogue`, `/tarif`, `/c/…`) reste ouvert, **sans les prix d'achat**.

**Fais les étapes dans cet ordre** (si tu lances le SQL avant d'avoir un compte, tu ne peux plus entrer) :

1. **Créer ton compte** : Supabase → **Authentication → Users → Add user → Create new user**. Mets ton email et un mot de passe solide (au moins 12 caractères), et coche **Auto Confirm User**.
2. **Fermer les inscriptions** : Supabase → **Authentication → Sign In / Providers** (ou Settings). Décoche **« Allow new users to sign up »**. Personne d'autre ne pourra créer de compte.
3. **Lancer le SQL** :
   - ouvre `supabase/securite.sql` et **remplace `TON_EMAIL@exemple.com`** par l'email de l'étape 1 ;
   - colle tout dans l'éditeur SQL (lien en §1) et clique sur **Run** ;
   - la dernière ligne doit afficher ton email.
4. **Te connecter** : recharge l'appli sur le **PC** puis sur le **téléphone**, et connecte-toi. Fais-le **avant d'aller sur le terrain** : hors réseau, l'appli marche seulement si tu t'es déjà connecté sur ce téléphone.
5. **Clé service pour les tâches automatiques** : Supabase → **Settings → API → `service_role`** (clé secrète : ne la montre à personne, ne l'envoie jamais par WhatsApp) :
   - dans **Vercel → Settings → Environment Variables**, ajoute `SUPABASE_SERVICE_ROLE_KEY` = cette clé (Production), puis **Redeploy**. Sans elle, les notifications de 8 h et la page publique `/c/…` ne trouvent plus les données ;
   - dans le fichier **`.env.local`** du PC, ajoute la ligne `SUPABASE_SERVICE_ROLE_KEY=…`. Sans elle, le robot de prospection de 9 h 30 et les scripts ne peuvent plus écrire.

**Ajouter une personne** (un employé, plus tard) : crée son compte (étape 1), puis colle dans l'éditeur SQL :
`insert into public.utilisateurs_autorises (email) values (lower('son@email.com'));`

**Urgence** (l'appli ne marche plus après la sécurisation) : colle `supabase/securite_annuler.sql`. La base redevient ouverte comme avant, le temps de corriger.

---

## 10. Trouver les filtres par VIN ou par code moteur

**Recherche → Recherche rapide → bloc « VIN ou code moteur »** (en haut) :
- **La marque (facultatif, comme sur partslink24)** : les boutons Dacia, Renault, Peugeot… au-dessus du champ. Utile quand le VIN n'est pas reconnu, ou pour un code moteur partagé par plusieurs marques (ex. K9K chez Renault, Dacia, Nissan). Sinon, laisse « Toutes » : la marque est lue toute seule dans le VIN (« Auto »).
- **Le plus fiable : le code moteur**, écrit sur le moteur (par exemple `H4D`, `DV6FC`, `K9K 872`). Tape-le et les voitures s'affichent avec leurs filtres (huile, air, habitacle, carburant), le prix et le stock.
- **Le VIN** (17 caractères, sur la carte grise ou le pare-brise) : l'appli reconnaît la marque.
  - 🟢 si ce VIN a déjà été vendu → les filtres s'affichent directement ;
  - 🟠 si un VIN qui lui ressemble a déjà été confirmé → vérifie, puis confirme ;
  - 🔴 sinon → tape le code moteur ou le modèle dans le 2e champ, choisis la bonne voiture et appuie sur **« C'est cette voiture »**. La prochaine fois, ce VIN sera reconnu tout seul.
- Si la variante tapée n'existe pas dans les données Filtron, l'appli montre le moteur de base avec un avertissement 🟠 : vérifie le modèle et l'année avant de vendre.
- L'année lue dans le VIN est seulement une **indication** : beaucoup de marques européennes ne l'écrivent pas.
- **Le VIN propose directement les voitures probables 🟠** (depuis le 16/11) :
  - **Peugeot, Citroën** : le type de moteur (caractères 6 à 8, ex. « RHZ », « RHW » = 2.0 HDi) ;
  - **VW, Audi, Seat** : le code de modèle (caractères 7 et 8, ex. « 5G » = Golf VII, « 6R » = Polo V) — attention, « 1K » couvre Golf 5 et Golf 6 : vérifie l'année ;
  - **Fiat** : le code de modèle (caractères 4 à 6, ex. « 169 » = Panda II) ; **Mercedes** : le modèle exact (caractères 4 à 9) ;
  - **Renault, Dacia et les autres** : FiltroPro **apprend** : dès qu'un VIN est confirmé, les VIN du même modèle proposent ce modèle.
  Vérifie le modèle, le moteur et l'année, puis appuie sur **« C'est cette voiture »**. Pour réduire la liste, tape la puissance, le moteur ou le modèle dans le 2e champ (il cherche d'abord parmi les voitures proposées).

## 11. Le catalogue par marque

**Recherche → onglet « Par marque »** : pour trouver un filtre sans VIN ni code moteur.
1. Appuie sur la **marque** (Dacia, Renault, Peugeot… ou une marque de la liste « Autres marques »).
2. Appuie sur le **modèle**. Le chiffre à droite est la période de fabrication (« 13- » = depuis 2013). Tu peux taper le nom dans le champ pour le trouver plus vite (ex. « Logan »).
3. Appuie sur le **moteur** de la voiture (le code moteur en jaune est écrit sur le moteur ou sur la carte grise). À droite : le nombre de filtres et combien sont en stock.
4. Les filtres s'affichent : huile, air, habitacle, carburant, avec la photo, le prix et le stock.

Les moteurs sont rangés **par type** (ex. « Moteur 1.2 · D4F »), et dans chaque type, du plus ancien au plus récent.

S'il n'y a pas de filtre à carburant : sur beaucoup de moteurs essence, il est dans le réservoir (pas à changer en vidange). Sur un diesel, vérifie dans le catalogue Filtron : certaines références manquent encore dans la base.

Pour revenir en arrière, appuie sur « Marques » ou sur le nom de la marque en haut.

## 12. Sauvegarde : tes données gardées pour toujours

Toutes les informations (filtres, voitures de Filtron, autres marques, ventes, clients) sont dans **ta base**. Si Filtron change son site ou bloque, rien n'est perdu.

En plus, **chaque jour à 13 h**, le PC fait une copie complète de la base dans le dossier `backups` du projet (un dossier par jour). Tu n'as rien à faire. Si le PC était éteint à 13 h, la copie se fait quand tu l'allumes.

- Pour vérifier : ouvre `backupsjournal.log` ; la dernière ligne doit dire « TERMINÉ sans erreur ».
- Une deuxième copie part aussi dans **Google Drive**, dossier **FiltroPro-sauvegardes** (visible sur ton téléphone). Si le PC tombe en panne, rien n'est perdu. Ne synchronise jamais le dossier Downloads avec Google Drive : il contient ta clé secrète.
- Les **photos** des filtres sont aussi copiées chez toi. Si le site de MANN+HUMMEL change, l'app affiche ta copie toute seule.
- Si un jour des données disparaissent : demande à Claude de les remettre depuis la dernière sauvegarde. Il compare d'abord, puis remet seulement ce qui manque.
- Depuis le 15/11, chaque sauvegarde contient aussi **`structure.sql`** : le plan complet de la base (tables, règles de sécurité, fonctions). Même si Supabase perdait tout, Claude peut tout reconstruire avec ce fichier + les données.
- **Notifications sur ton téléphone** (le matin) : « 💾 Sauvegarde en retard » si le PC n'a pas fait de copie depuis 2 jours (allume-le vers 13 h) ; « ⚠️ Base presque pleine » si la base dépasse 400 Mo (108 Mo le 15/11, le maximum gratuit est 500 Mo).
- **Ventes** : chaque vente est d'abord gardée dans le téléphone, puis envoyée. Si le réseau coupe au milieu, elle repart toute seule plus tard, sans doublon et sans compter le stock deux fois.

## 13. Prévenir les clients la veille d'une tournée

1. Va dans **Tournées** → bloc **« Prévenir les clients »** (en haut à droite).
2. Choisis le **jour de la tournée**, puis touche les **villes** (le chiffre = nombre de clients). Tu peux en choisir plusieurs.
3. (Si tu veux) **« Voir ou modifier le message »** : le message est en darija, avec le lien de tes prix. {nom}, {ville} et {jour} se remplissent tout seuls (« غدا الثلاثاء » la veille).
4. Touche **« 📅 Programmer la tournée »**.
5. **La veille à 9 h**, ton téléphone reçoit une notification « 🚚 Tournée demain ». Un bouton apparaît aussi sur l'accueil.
6. Touche la notification (ou **« Envoyer le message »** dans Tournées) : la liste des clients s'affiche. Pour chacun, touche **« Envoyer »** : WhatsApp s'ouvre avec le message prêt, tu appuies sur envoyer, puis tu reviens. Le client passe en **« Prévenu ✓ »**.

Pourquoi pas d'envoi tout seul ? WhatsApp bloque les numéros qui envoient le même message à beaucoup de gens d'un coup. Un tap par client, c'est sûr.

## 14. Kit de filtres et huile par voiture

Dans **Recherche** (VIN, code moteur ou « Par marque »), chaque voiture montre :
- ses filtres, puis la ligne **« Huile moteur »** : les viscosités possibles (ex. 5W-40 · 10W-40) et la quantité (ex. 4,4 à 4,8 L), d'après le guide Liqui Moly, avec les bidons que tu as **en stock**. Si l'huile change avec ou sans filtre à particules (FAP), ou selon la version (ex. « Euro 5 » / « Euro 6 »), touche la bonne version. Si tu lis « vérifier sur la jauge », la quantité change selon la voiture : remplis jusqu'au repère de la jauge.
- Depuis le 15/11, l'huile est connue pour environ 2 700 codes moteur + 5 950 versions par modèle (Dacia, Renault, Peugeot, Citroën, VW, Hyundai, Kia, Toyota, BMW…). Pour un moteur pas encore connu, la fiche donne un lien vers le guide Liqui Moly.
- Quand Filtron ne donne pas le code exact du moteur (souvent chez **Ford, Jeep, Mazda, Honda, Land Rover**…), FiltroPro cherche l'huile par le modèle, la cylindrée, la puissance et les années — depuis le 15/11 pour **toutes les marques** (Mercedes et BMW : par la désignation, ex. « C 220 CDI », « 320d »). La fiche l'écrit : « d'après le modèle, la cylindrée et la puissance », avec la version du guide sur laquelle c'est relevé. Vérifie juste que l'année de la voiture correspond.
- la barre **« Kit »** : les 4 filtres (+ l'huile) avec le total. **« 🧾 Vendre ce kit »** remplit la vente d'un coup ; **« WhatsApp »** envoie la liste et les prix au client.

## 15. Tes 4 catalogues de prix

Tu tapes **un seul prix** : le prix garage (comme avant). Les autres se calculent :
- **Garages et stations** : ton prix ;
- **Particuliers** : + 30 % ;
- **Location de voitures** : + 15 % ;
- **Magasins de pièces** : − 5 %.

1. **Paramètres** → « Mes 4 catalogues de prix » : les 4 liens (Copier / WhatsApp / Voir) et les pourcentages à changer (« Enregistrer »).
2. Un article à un prix spécial ? Fiche produit → « Prix par catalogue » : tape le prix (vide = calculé, en gris).
3. Dans la **fiche client**, choisis le **type** (Garage / station, Particulier, Location de voitures, Magasin de pièces). En **Vente**, le prix suit le type du client tout seul. Les relances et le message de tournée envoient aussi le bon lien.

---

*Généré avec Claude Code. Pour toute modif de l'app, on repart de ce guide et de la [BIBLE](BIBLE.md).*

---

## 16. Toutes les pièces, rangées en 9 familles (depuis le 16/11/2026)

**SQL** `supabase/categories_produits.sql` : ✅ collé le 16/11/2026. Plus jamais de SQL pour ajouter une catégorie : tu me la demandes, je l'ajoute.

**Les familles** (comme les grands sites de pièces) :
- **Filtres et huile** : filtres (huile, air, carburant, habitacle, refroidissement), autres filtrations, huile moteur, accessoires de vidange, outils de vidange.
- **Distribution moteur** : kit de distribution, kit + pompe à eau, courroie de distribution, galet tendeur/enrouleur, kit chaîne, pompe à eau, kit et courroie d'accessoire, poulie.
- **Freinage** : plaquettes, disques, hydraulique, freins à tambours, capteurs et câbles.
- **Embrayage et boîte de vitesse** : embrayage et volant moteur, accessoires de boîte, autres pièces d'embrayage.
- **Direction / Suspension / Train** : amortisseurs, suspension d'essieux, transmission, rotules/direction, moyeux et roulements.
- **Démarrage électrique** : batteries, alternateurs, démarreurs, outils batteries, alterno-démarreurs.
- **Essuie-glaces et pièces** : essuie-glaces, essuyage des phares.
- **Pièces habitacle** : lève-vitres, serrure/fermeture, vérins, commandes et pédalier, électricité.
- **Autres pièces**.

**Recevoir une pièce qui n'est pas un filtre** (Filtron ne fait que des filtres : la première fois, chaque pièce est à créer) :
1. Accueil → **Réception** → choisis **Chez** (dinoun / filtropro).
2. **Je reçois** → la famille (ex. **Freinage**).
3. Sur la ligne, tape la **réf. écrite sur la boîte**. Elle n'existe pas encore → touche **« ➕ Nouvelle pièce »**.
4. Choisis le **Type** (ex. Plaquettes de frein) et la **Marque** : la liste suit la famille (freinage : Bosch, TRW, Brembo, Ferodo…; distribution : Gates, Dayco, Dolz…; batteries : Varta, Bosch, Exide…), ou « ➕ Nouvelle marque… » : la marque ajoutée est **rattachée à la famille** de la pièce (une marque d'huile ajoutée n'apparaît pas dans Freinage).
5. Qté, prix d'achat, prix de vente, code-barres (scanne la boîte) → **Enregistrer**. La fiche est créée toute seule (même hors-ligne). La fois suivante, la boîte est reconnue au scan.
- **Kit ou courroie de distribution** : remplis aussi la case **🦷 Dents / largeur** (ex. **141/25**, 123/27). Elle s'affiche partout (catalogue compris) et tu peux chercher une pièce en tapant « 141/25 ». Pour une fiche déjà créée : Produits → ✏️ → case « Nombre de dents / largeur ».
- **Un filtre** se choisit toujours par sa réf. Filtron (pas de « Nouvelle pièce » pour les filtres).
- **Même pièce chez une autre marque** : Produits → la fiche → « Variantes de marque », ou en Réception « + Autre marque » sous la ligne. Chaque marque garde son prix et son stock.
- **Pièce d'origine** : « Renault Origine » ou « PSA Origine » (pas « Renault » tout court : ce nom sert aux codes constructeur, l'appli le refuse).
- **Produits / Stock** : le menu « Catégorie » est rangé par famille ; « — Freinage (tout) — » montre toute la famille d'un coup.
- **Catalogues** (/tarif, /catalogue) : rangés en **onglets par famille**. Une pièce avec stock (et prix pour /tarif) apparaît toute seule dans sa rubrique ; le client touche « ▼ détails » pour voir le type, la marque, le prix, les références équivalentes et la fiche complète. Une rubrique **sans stock** affiche « 🔄 Réapprovisionnement en cours » avec un bouton **Demander** (WhatsApp vers toi). Photo : prends la boîte en photo dans la fiche (photo automatique seulement pour les filtres).
- **Vente** : rien ne change ; la marque affichée est la vraie.

## 17. Distribution : les voitures et les kits Gates (depuis le 16/11/2026)

Les kits de distribution, kits avec pompe à eau, courroies, galets et kits chaîne **Gates** sont dans l'appli avec **leurs voitures**, lus dans le **catalogue PDF officiel Gates** (rien d'inventé).

**Voir la distribution d'une voiture** : Recherche → VIN / code moteur, ou « Par marque » → marque → modèle → moteur. Sous les filtres, la rubrique **⚙ Distribution moteur** montre les pièces Gates. Plusieurs choix pour la même voiture ? Lis le **⚠** sous la référence : « à partir de 09/2010 », « pour véhicules avec climatisation », « avec roue dentée », « moteur K9K 608 »… Il dit lequel prendre. Dans le doute, regarde la date de mise en circulation sur la carte grise ou demande au garagiste.

**Recevoir un kit Gates** : Réception → Je reçois **Distribution** → tape la réf. de la boîte (ex. **K025578XS**) : la fiche existe déjà (avec ses voitures), pas besoin de « Nouvelle pièce ». Qté, prix d'achat, prix de vente → Enregistrer. Le kit apparaît alors dans tes catalogues.

**Ajouter une marque de voiture** (ex. Dacia) :
1. Ouvre **navigates.gates.com**, choisis le catalogue **« Applications véhicules particuliers »** de la marque (PAS « Electric and Hybrid »).
2. Télécharge le PDF et pose-le sur le **Bureau** (nom conseillé : « gates distribution dacia.pdf »).
3. Dis à Claude « PDF Dacia sur le Bureau ». Il fait un essai, vérifie, puis importe (`node scripts/import_gates_pdf.mjs "<PDF>" --ecrire`).

**Pas encore** : les équivalences avec les autres marques (Dayco, SKF, INA, Continental…). Gates ne les donne pas. Il faudra le catalogue officiel PDF d'une autre marque : ses pièces viendront alors sur les mêmes fiches voiture.

## 18. Freinage : disques et plaquettes Metelli, TRW, Bosch (depuis le 17/11/2026)

Les **disques et plaquettes Metelli** sont dans l'appli avec **leurs voitures** (catalogue PDF officiel Metelli), et chaque fiche a ses **équivalences TRW et Bosch** (et le numéro européen WVA des plaquettes).

**Voir les freins d'une voiture** : Recherche → VIN / code moteur ou « Par marque » → la voiture → rubrique **Freinage** : chaque pièce dit **avant** ou **arrière** (⚠), et parfois « avec / sans ABS », « jusqu'à 12/2012 », « jantes 16 pouces »… La fiche montre aussi la cote : Ø du disque (ventilé ou plein), système et épaisseur de la plaquette.

**Recevoir des plaquettes TRW ou Bosch** : Réception → Je reçois **Freinage** → tape la réf. de la boîte (ex. **GDB2018** ou **0 986 494 697**) → l'appli trouve la fiche Metelli équivalente (22-0975-1) et règle la marque (TRW / Bosch) : chaque marque garde son prix et son stock.

**Une réf. TRW / Bosch introuvable** : pas dans le catalogue Metelli → « ➕ Nouvelle pièce ». **LPR** n'est pas dans ce catalogue : donne la réf. à Claude, il la relie par le numéro WVA.

Les équivalences TRW / Bosch sont celles que **Metelli** déclare (« adaptable à ») : en cas de doute, compare la forme de la plaquette ou les cotes du disque.

**Kits Graf et Metelli (depuis le 17/11/2026)** : sur les mêmes fiches voiture que Gates, avec le **nombre de dents / largeur** (ex. TP074 = 123/27). Le kit Metelli 29-0xxx est la variante de marque du kit Graf TPxxx (mêmes voitures). **Un garagiste donne un numéro d'origine** (ex. 9467611180) : tape-le dans Recherche → l'appli trouve le kit (Graf TP119).
