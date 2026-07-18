# 📖 BIBLE FILTROPRO — 10 ans, argent maximum, simplicité maximum

> **Le document unique.** Tu le relis chaque trimestre pendant 10 ans. Il répond toujours à trois questions : **quoi construire, dans quel ordre, et combien ça rapporte.**
>
> Trois lois gravées en tête de toutes les pages :
> **Loi 1.** L'argent le plus facile est celui que tu as déjà gagné mais pas encaissé (**impayés**).
> **Loi 2.** Le deuxième argent le plus facile dort dans ton stock (**rotation**).
> **Loi 3.** Le client le moins cher est celui qui revient tout seul (**garages fidélisés, Google**).
> Tout le reste — nouveaux clients, nouvelles villes, nouveaux services — vient APRÈS ces trois lois.
>
> Et une règle d'usage : **si une fonctionnalité demande plus de 2 gestes ou une explication, elle est mal conçue.** On la redessine ou on la jette.
>
> **Dernière mise à jour : 18/07/2026** — **TOUTES les idées des phases 1-2 sont en ligne** ✅ : §4.1 (14/07), §4.3/§4.11-§4.16 (18/07, SQL `idees_bible_19_24.sql` collé ✓), puis §4.2 dormant, §4.4 bilan hebdo, §4.5 fiche produit, §4.6 commandes garages + chargement (page `/commandes`), §4.7 prédictif, §4.8 catalogue public SEO (`/c/…` + sitemap), §4.9 paliers, §4.10 rappels vidange — **SQL à coller : `supabase/idees_bible_2eme_vague.sql`**. Reste côté commerçant : taguer les clients, fiche Google Business (idée 25). Prochaines constructions = phase 3 (abonnement réappro, mode livreur) quand les seuils du §5.3 sont atteints.

---

# 1. VISION 10 ANS — trois trajectoires

Les trois trajectoires ne sont pas des choix : elles se **cumulent**. T1 tout de suite, T2 dès le mois 2, T3 en tâche de fond. Chacune finance la suivante.

## T1 · Le comptoir augmenté (années 0-2 — la fondation, obligatoire)

**L'idée.** Tu restes seul, mais l'app fait le travail d'un comptable, d'un agent de recouvrement et d'un gestionnaire de stock. Aujourd'hui tu perds de l'argent par trois fuites invisibles : les impayés qui traînent (ton bénéfice dort chez les autres), la marge mal facturée (prix garage donné à un client comptoir dans la précipitation), et le capital gelé dans du stock qui ne bouge plus. T1 colmate les trois.

**Ta journée (année 1).** 7h30, tu ouvres l'app. L'accueil te dit : *« 3 clients à relancer (4 200 MAD) — 2 filtres à recommander — objectif du jour : 1 100 MAD de bénéfice »*. Tu tapes une fois sur chaque relance, WhatsApp part tout seul. Tu vends au comptoir : le scan trouve la boîte, le prix du client s'applique tout seul selon son segment, une pastille discrète te confirme que la marge est bonne. Le vendredi 18h, ton bilan de la semaine arrive sur WhatsApp. Zéro cahier, zéro calcul de tête, zéro nuit à compter.

**Revenu estimé.** +30 à 50 % de **bénéfice net à volume constant**. Ce n'est pas de la magie : si tu portes 15 000 MAD d'impayés permanents, que tu perds 2-3 points de marge sur la moitié des ventes par improvisation de prix, et que 10 000 MAD dorment en stock mort, la somme récupérable dépasse largement 1 500-3 000 MAD/mois.

**Premier pas concret.** Les relances d'impayés améliorées (semaine 1, spec §4.1). La page `/rappels` existe déjà — il faut la brancher sur WhatsApp en un tap et l'amener sur l'accueil.

## T2 · Le grossiste des garages (années 1-5 — le moteur de croissance)

**L'idée.** Tes tournées cessent d'être de la prospection pour devenir des **livraisons vendues d'avance**. Les garages t'envoient leur liste par WhatsApp (« 2 oe667/6, 1 hu7032z, 4 wl 7510 »), l'app la transforme en vente préparée, ton téléphone te dit exactement quoi charger dans le véhicule. Le garage qui trouve plus simple de commander chez toi que d'appeler ton concurrent… commande chez toi.

**Ta journée (année 3).** La veille au soir, 8 commandes WhatsApp sont déjà converties en ventes préparées, les garages sont passés en statut « préparée » sur la carte. Le matin, l'app te sort la liste de chargement : « 12× OE667/6 · 6× HU7032Z · 4× WL 7510 », cases à cocher. Tu livres, tu encaisses, chaque garage a son plafond de crédit et son badge de fiabilité — tu ne te poses plus la question « je lui fais crédit ou pas ? », le chiffre est sous tes yeux. À ~30 garages actifs, tu lances le service payant « réappro automatique » : tu passes AVANT qu'ils commandent, parce que l'app connaît leur consommation.

**Revenu estimé.** ×2 à ×4 le volume actuel, plus une **rente d'abonnements** : 30 garages × 149 MAD/mois ≈ 4 500 MAD/mois récurrents, avant même de vendre une pièce. C'est à ce moment que tu embauches un livreur — l'app lui donne le circuit et les quantités, les prix d'achat et le capital restent masqués (l'œil existe déjà). Toi tu gardes les achats, les prix et la relation.

**Premier pas concret.** Le parseur de commandes WhatsApp (mois 2-3, spec §4.6).

## T3 · La plateforme pièces auto Maroc (années 3-10 — le billet à cent millions, contrôlé)

**L'idée.** Ton actif le plus sous-estimé n'est pas ton stock : c'est ta **table `applications`** — les vraies compatibilités véhicule↔filtre (données Filtron réelles, 82 véhicules pour certaines références), en français, pour le parc roulant marocain. Personne au Maroc ne l'offre proprement en ligne. Publiée en catalogue public, chaque page attire sur Google le garagiste ou le particulier qui tape « filtre huile Berlingo 1.5 BlueHDi » — gratuitement, pour toujours, pendant que tu dors.

**Ta journée (année 7).** Le catalogue reçoit des milliers de visites par mois. Les demandes de prix arrivent sur ton WhatsApp sans que tu aies prospecté. Des confrères d'autres villes paient pour être listés sur TES pages (ou te versent une commission sur les contacts). Tu ne portes plus les cartons : tu pilotes les données, les prix et le réseau. « FiltroPro » n'est plus une boutique, c'est une marque et une infrastructure.

**Revenu estimé.** Le commerce (T1+T2) **plus** des revenus de plateforme : listings payants (des confrères à 200-500 MAD/mois), commissions 3-5 % sur les mises en relation, licence des données de compatibilité à d'autres commerçants.

**Premier pas concret.** Le catalogue public SEO (mois 4-6, spec §4.8) — coût quasi nul, il réutilise des données que tu possèdes déjà.

---

# 2. LES IDÉES QUI RAPPORTENT — classées par (argent × simplicité)

## 2.1 Le classement

| # | Idée | Argent | Quand ça paye | Effort | Geste utilisateur |
|---|------|--------|---------------|--------|-------------------|
| 1 | ✅ Relances impayés WhatsApp 1-tap | 💰💰💰 | Semaine 1 | S | 1 tap |
| 2 | ✅ Prix par segment (comptoir/garage/gros) | 💰💰💰 | Immédiat, permanent | S | 0 geste après le taggage |
| 3 | ✅ Limite de crédit + badge fiabilité payeur | 💰💰 | Au premier impayé évité | S | 0 geste |
| 4 | ✅ Promo stock dormant 60 j | 💰💰 | Chaque trimestre | S | 1 tap |
| 5 | ✅ Marge visible à la vente (garde-fou) | 💰💰 | Immédiat | S | 0 geste |
| 6 | ✅ Bilan hebdo WhatsApp (bouton /stats) | 💰 (pilotage) | Chaque vendredi | S | lire |
| 7 | ✅ Commande WhatsApp → vente préparée | 💰💰💰 | Mois 2-3 | M | coller + valider |
| 8 | ✅ Liste de chargement (onglet /commandes) | 💰💰 (temps) | Mois 3 | S | lire + cocher |
| 9 | ✅ Réappro prédictif (jours de stock restants) | 💰💰 | Mois 3-4 | M | lire + commander |
| 10 | ✅ Catalogue public SEO (/c/…) | 💰💰💰 | Mois 6-12 (composé) | M | 0 geste |
| 11 | ✅ Fidélité paliers garages (remise trimestrielle) | 💰💰 | Mois 6 | S | 1 tap pour valider |
| 12 | ✅ Rappel vidange client final | 💰💰💰 | Mois 6-9 | M | 1 tap |
| 13 | ✅ Fiche produit WhatsApp | 💰 | Immédiat | S | 1 tap |
| 14 | Abonnement « réappro auto » garages | 💰💰💰 | Année 2+ | L | — |
| 15 | Mode livreur (embauche sans perte de contrôle) | 💰💰 | Année 2-3 | M | — |
| 16 | 💡 BONUS — Achats groupés entre confrères | 💰💰 | Année 3+ | L | — |
| 17 | Marketplace / listings payants confrères | 💰💰💰 | Année 4+ | L | — |
| 18 | ✅ Pack vidange (filtre + huile en 1 tap) | 💰💰💰 | Immédiat | S | 1 tap |
| 19 | ✅ Registre « j'ai pas » (ventes perdues) | 💰💰💰 | Dès le 1er mois | S | 1 tap |
| 20 | ✅ Kit véhicule (huile + air + habitacle du même véhicule) | 💰💰 | Immédiat | M | 1 tap |
| 21 | ✅ Clients endormis (« à réveiller ») | 💰💰 | Chaque mois | S | 1 tap |
| 22 | ✅ Devis WhatsApp 1-tap (valable 7 j) | 💰💰 | Immédiat | S | 1 tap |
| 23 | ✅ Diffusion arrivages/promos (statut WhatsApp) | 💰💰 | Chaque semaine | S | 1 tap + partager |
| 24 | ✅ Parrainage garages (avoir 100 MAD) | 💰💰 | Mois 2-3 | S | 1 choix |
| 25 | 💡 BONUS — Fiche Google Business (zéro code, à faire par MOI) | 💰💰 | Mois 1-3 | S | 1 h un dimanche |

**Comment lire ce tableau :** les idées 1-6 sont la trajectoire T1 (l'argent déjà gagné), 7-12 ouvrent T2 (la croissance), 10 et 17 construisent T3 (la plateforme). L'ordre du tableau EST l'ordre de construction. **✅ = déjà en ligne** (idées 1-2-3 livrées le 14/07/2026). L'idée 18 est arrivée avec la catégorie Huile moteur : elle se classe en réalité juste derrière les relances — à construire en phase 1.

## 2.2 Détail des idées (problème → solution → argent → geste)

### Idée 1 · Relances impayés WhatsApp — *l'idée n° 1, sans débat*

- **Le problème.** « Je te paye la prochaine fois » — et la prochaine fois c'est dans 45 jours. Cet argent est TON bénéfice, déjà gagné, qui dort chez les autres. Et relancer au téléphone, c'est gênant socialement — donc tu ne le fais pas, ou trop tard. La page `/rappels` liste déjà les impayés, mais lister ne suffit pas : il faut que l'action tienne en un tap.
- **La solution.** L'app te montre chaque matin sur l'accueil qui relancer (cadence J+7, J+15, J+30) et envoie un WhatsApp poli pré-écrit, FR ou darija, en un tap. Le message écrit n'est pas gênant : c'est « l'application » qui rappelle, pas toi. C'est même un signe de sérieux.
- **Pourquoi ça rapporte.** Si tu portes 15 000 MAD d'impayés en permanence et que les relances raccourcissent le délai moyen de 30 à 15 jours, tu libères ~7 500 MAD de trésorerie **en continu** — que tu réinvestis en stock qui tourne à ~40 % de marge. Effet composé toute l'année : c'est plusieurs milliers de MAD de bénéfice annuel, sur de l'argent déjà gagné.
- **Le geste.** Accueil → carte « À relancer » → tap sur le bouton WhatsApp du client. Le message part, le client sort de la liste 7 jours. C'est tout.
- **Effort : S** — spec §4.1.

### Idée 2 · Prix par segment — *la marge qui se répare toute seule*

- **Le problème.** Au comptoir, tu improvises le prix. Le garage fidèle mérite −8 %, le client de passage paye plein tarif — mais dans la précipitation tu donnes parfois le prix garage à tout le monde, ou tu oublies quelle remise tu avais accordée à qui. Chaque erreur = marge brûlée, invisible, quotidienne.
- **La solution.** Chaque client a un type (comptoir / garage / gros) avec sa remise en % ; à la vente, dès que tu choisis le client, le bon prix s'applique **tout seul** sur chaque ligne — modifiable à la main si besoin.
- **Pourquoi ça rapporte.** +2 à 3 points de marge sur la moitié de tes ventes. Sur 40 000 MAD de CA mensuel, c'est 400-600 MAD/mois récupérés sans aucun effort — 5 000-7 000 MAD/an. Et dans l'autre sens : le garage qui voit que « son » prix est toujours le même, sans discussion, te fait confiance et arrête de négocier chaque ligne.
- **Le geste.** Zéro au quotidien. Tu tagues une fois tes 20 meilleurs clients (15 minutes sur ton téléphone), ensuite c'est automatique pour toujours.
- **Effort : S** — spec §4.1 (même migration que l'idée 1).

### Idée 3 · Limite de crédit + badge fiabilité

- **Le problème.** Le garage qui doit déjà 4 000 MAD et qui recharge le camion. Tu n'oses pas dire non de tête, parce que tu n'as pas le chiffre sous les yeux au moment exact de la vente — et dire « attends, je vérifie mon cahier » casse la relation.
- **La solution.** Un plafond de crédit par client ; à la vente, si le nouveau total dépasse, un bandeau rouge non bloquant : « ⚠ dépasse sa limite de 800 MAD ». Plus un badge automatique calculé sur l'historique réel : 🟢 paye en moins de 7 jours, 🟠 7-30 jours, 🔴 plus de 30 jours.
- **Pourquoi ça rapporte.** Une seule créance douteuse évitée (2 000-5 000 MAD chez un garage qui « disparaît ») paye dix ans de cette fonctionnalité. Et le bandeau te donne une excuse sociale parfaite : « l'application me bloque, régularise d'abord un peu » — ce n'est pas toi qui refuses, c'est le système.
- **Le geste.** Zéro — l'alerte vient à toi au moment exact où tu en as besoin.
- **Effort : S** — spec §4.1.

### Idée 4 · Promo stock dormant

- **Le problème.** Chaque filtre immobile depuis 60 jours et plus est du capital gelé. 10 000 MAD de stock mort à 40 % de marge potentielle = 4 000 MAD de bénéfice que tu ne feras JAMAIS s'il ne bouge pas — pendant que les best-sellers, eux, attendent que tu aies la trésorerie pour les recommander.
- **La solution.** L'app détecte les dormants (aucune vente depuis 60 jours, stock > 0), les trie par valeur immobilisée, propose un prix promo (−15 %) et un message WhatsApp prêt à diffuser (statut WhatsApp, groupes de garages).
- **Pourquoi ça rapporte.** Libérer 10 000 MAD dormants = 10 000 MAD réinvestis dans OE667/6 et compagnie qui tournent chaque mois. Mieux vaut −15 % aujourd'hui que 0 % pour toujours. À chaque trimestre, cette liste te rend 2 000-5 000 MAD de trésorerie.
- **Le geste.** 1 tap « Promo −15 % » par produit, ou 1 tap « Promo WhatsApp » pour diffuser la liste (le bouton existe déjà côté produits).
- **Effort : S** — spec §4.2.

### Idée 5 · Marge visible à la vente

- **Le problème.** Dans la précipitation, une remise de trop et tu vends À PERTE sans le voir — le prix d'achat n'est pas sous tes yeux, surtout sur les variantes de marque dont les coûts diffèrent (le Mann coûte plus cher que le Flag).
- **La solution.** Sur chaque ligne de vente, un point de couleur discret : 🟢 marge normale, 🟠 marge < 15 %, 🔴 prix sous le coût d'achat. Personne d'autre que toi ne comprend le code couleur — le client en face ne voit qu'un petit point.
- **Pourquoi ça rapporte.** Les ventes à perte accidentelles disparaissent complètement. Si ça t'arrive ne serait-ce que 2 fois par mois sur un panier de 150 MAD, c'est ~1 000 MAD/an sauvés, et surtout : la certitude de ne jamais travailler pour rien.
- **Le geste.** Zéro. Le point est là, tu le vois ou pas.
- **Effort : S** — spec §4.3.

### Idée 6 · Bilan hebdo automatique

- **Le problème.** Tu pilotes au ressenti. Les mauvaises semaines se voient trois semaines trop tard, quand la trésorerie coince déjà.
- **La solution.** Chaque vendredi, un message WhatsApp à toi-même (d'abord déclenché par un bouton, plus tard automatique) : bénéfice réel de la semaine, % encaissé/vendu, total impayés + le plus vieux, top 3 des ventes, valeur du stock dormant, comparaison avec la semaine précédente.
- **Pourquoi ça rapporte.** Indirect mais décisif : c'est le tableau de bord (§7) qui vient à toi au lieu que tu ailles le chercher. Une dérive détectée avec 3 semaines d'avance, c'est une décision (relance, promo, stop crédit) prise à temps.
- **Le geste.** Lire un message le vendredi soir.
- **Effort : S** — spec §4.4.

### Idée 7 · Commande WhatsApp → vente préparée — *la porte de la trajectoire T2*

- **Le problème.** Les garages t'appellent ou t'envoient des listes en vrac ; tu notes sur un papier ; tu oublies une ligne ; la tournée part incomplète ; le garage déçu commande la fois suivante chez celui qui n'oublie pas.
- **La solution.** Tu colles le message WhatsApp du garage dans l'app. Le parseur reconnaît les références ligne par ligne (insensible aux espaces et à la casse, variantes de marque comprises : « hu7032z » → Mann, rattaché au produit Filtron OE667/6, au prix de la variante Mann). Ce qui est reconnu devient une **vente préparée** liée au client du garage ; ce qui ne l'est pas s'affiche en rouge pour choix manuel — **jamais de devinette sur une référence**.
- **Pourquoi ça rapporte.** Zéro oubli = zéro vente ratée. Mais le vrai mécanisme est ailleurs : ça rend la commande **facile côté garage**. Le garage qui sait que « j'envoie ma liste sur WhatsApp et c'est réglé » commande plus souvent chez toi que chez le concurrent qu'il faut appeler et faire répéter. C'est de la part de marché structurelle : 5 garages qui passent d'une commande par mois à trois, à 300 MAD de panier et 35 % de marge, c'est ~2 000 MAD/mois de bénéfice en plus.
- **Le geste.** Copier le message dans WhatsApp → le coller dans l'app → valider. Deux gestes.
- **Effort : M** — spec §4.6.

### Idée 8 · Liste de chargement par tournée

- **Le problème.** Le matin, tu charges le véhicule de mémoire. Un carton oublié = « je te l'apporte la prochaine fois » = une vente en pause qui devient souvent une vente perdue.
- **La solution.** L'app agrège toutes les ventes préparées des garages de la tournée du jour en une seule liste : « 12× OE667/6 · 6× HU7032Z · 4× WL 7510 », groupée par catégorie, cases à cocher pendant que tu charges.
- **Pourquoi ça rapporte.** Fini les allers-retours (du gasoil et des heures) et les livraisons incomplètes. Une heure gagnée par tournée × 2-3 tournées/semaine = une demi-journée par semaine rendue au comptoir ou à la prospection.
- **Le geste.** Lire et cocher.
- **Effort : S** — spec §4.6 (même chantier que l'idée 7).

### Idée 9 · Réappro prédictif

- **Le problème.** La rupture sur une référence qui tourne est la pire perte du métier : le client va en face, ET il apprend le chemin d'en face. Le `stock_min` fixe actuel ne suffit pas — il ne connaît pas la vitesse réelle de chaque référence.
- **La solution.** L'app calcule la vitesse réelle de vente (90 derniers jours) et affiche les **jours de stock restants** : « OE667/6 : 8 j restants — suggère d'en commander 20 ». Liste triée par urgence, groupée par fournisseur habituel, consultable au moment où tu passes ta commande.
- **Pourquoi ça rapporte.** Chaque rupture évitée sur un best-seller préserve la marge du mois sur cette référence ET le client. Si OE667/6 te rapporte 400 MAD/mois de marge, une rupture de 10 jours coûte ~130 MAD + le risque du client perdu. Sur 10 références qui tournent, c'est structurel.
- **Le geste.** Lire la liste en passant ta commande fournisseur. Rien à saisir.
- **Effort : M** — spec §4.7.

### Idée 10 · Catalogue public SEO — *l'actif qui travaille pendant que tu dors*

- **Le problème.** Tes nouveaux clients viennent uniquement du bouche-à-oreille et des tournées — des canaux qui coûtent ton temps, la ressource que tu n'as pas. Pendant ce temps, des gens tapent chaque jour sur Google « filtre huile Duster 1.5 dCi » et tombent sur rien d'utile au Maroc.
- **La solution.** Une page publique par référence : réf, photo, dimensions, **liste des véhicules compatibles** (ta table `applications`), marques équivalentes, bouton « Demander le prix sur WhatsApp ». **Sans prix affiché** : le prix se discute au Maroc, et la visite doit se convertir en conversation WhatsApp — là où tu vends.
- **Pourquoi ça rapporte.** Le SEO est **composé** : chaque page publiée travaille pour toujours, sans budget pub. Dans 12 mois, « filtre huile DS3 Crossback Maroc » = toi. Un seul client Google par jour à 100 MAD de panier ≈ 36 000 MAD/an de CA nouveau, coût d'acquisition zéro. Et c'est la fondation de la trajectoire T3 : le jour où ce catalogue a du trafic, il devient une plateforme.
- **Le geste.** Zéro — ça tourne seul une fois construit.
- **Effort : M** — spec §4.8.

### Idée 11 · Fidélité paliers garages

- **Le problème.** Rien ne récompense le garage fidèle, et rien ne le retient le jour où un concurrent passe avec −5 %. La fidélité non structurée est fragile.
- **La solution.** Des paliers trimestriels automatiques : > 3 000 MAD/trimestre → −5 % ; > 8 000 → −8 % ; > 15 000 → −10 %. L'app calcule le CA réel de chaque client et te **suggère** la mise à jour de sa remise — tu valides d'un tap (jamais automatique : c'est du prix). Tu annonces les paliers aux garages : ils connaissent la règle du jeu.
- **Pourquoi ça rapporte.** Le garage qui sait qu'il lui manque 900 MAD pour atteindre le palier −8 % **concentre ses achats chez toi** au lieu de les répartir. La remise s'autofinance par le volume déplacé de chez tes concurrents vers toi — c'est le même mécanisme que les grossistes pros, à ton échelle.
- **Le geste.** 1 tap pour valider une suggestion de palier, une fois par trimestre.
- **Effort : S** — spec §4.9 (calcul sur données existantes).

### Idée 12 · 💡 BONUS — Rappel vidange client final (*l'idée qui attache les garages pour toujours*)

- **Le problème.** Le garage oublie de rappeler ses clients pour la vidange → il perd la main-d'œuvre, tu perds le filtre. Personne ne tient cet agenda, parce que c'est fastidieux.
- **La solution.** À la livraison (ou à la vente), toi ou le garage notez en 5 secondes : « Dacia de Ahmed, vidange aujourd'hui ». Dans 5 mois, l'app te dit : « rappelle au garage que la Dacia de Ahmed est due ». Un tap → WhatsApp au garage : « Salam, la Dacia de Ahmed arrive à sa vidange — je te livre le filtre ? ».
- **Pourquoi ça rapporte.** Chaque rappel converti = 1 filtre vendu + de la main-d'œuvre offerte au garage. **Le garage gagne un client rappelé, toi tu gagnes la pièce — et le garage ne peut plus te quitter : c'est TON app qui nourrit SON agenda.** À 30 garages × 3-4 rappels convertis/mois × ~30 MAD de marge par filtre, c'est ~3 000 MAD/mois de flux permanent, plus la fidélité structurelle qui n'a pas de prix.
- **Le geste.** À la vente : 1 champ texte optionnel (5 secondes). Cinq mois plus tard : 1 tap.
- **Effort : M** — spec §4.10.

### Idée 13 · 💡 BONUS — Fiche produit WhatsApp (le vendeur silencieux)

- **Le problème.** On te demande dix fois par jour « t'as le filtre pour … ? » — tu réponds par un « oui » sec ou une photo floue de la boîte.
- **La solution.** Un tap sur un produit → message WhatsApp prêt : photo, référence, dimensions, « compatible avec : … » (3-4 véhicules de `applications`), ton numéro. Tu réponds par une fiche pro en 5 secondes.
- **Pourquoi ça rapporte.** Ça convertit mieux qu'un « oui » (le client voit la boîte, les compatibilités, il fait confiance), et chaque fiche transférée dans un groupe WhatsApp de garagistes est de la pub gratuite signée FiltroPro.
- **Le geste.** 1 tap depuis la fiche produit.
- **Effort : S** — spec §4.5.

### Idée 18 · 🆕 Pack vidange — *filtre + huile sur la même visite*

- **Le problème.** Le client (ou le garage) t'achète le filtre OE667/6 à ~30 MAD… et achète le bidon d'huile à 300 MAD ailleurs. Or une vidange, c'est TOUJOURS les deux ensemble — tu laisses partir la plus grosse ligne du ticket. L'huile est maintenant au catalogue (Castrol, Motul, Total, Mannol, Fanfaro, Pemko, Kansler) : il faut qu'elle sorte systématiquement avec le filtre.
- **La solution.** À la vente, dès qu'un filtre à huile entre dans le panier, l'app propose discrètement « 🛢️ + l'huile ? » avec les huiles en stock — un tap et la ligne s'ajoute (remise du client appliquée, pastille de marge comprise).
- **Pourquoi ça rapporte.** C'est le panier multiplié par 5 à 10 **sur une visite déjà payée**. La marge huile (15-25 %) est plus faible en %, mais énorme en absolu : ~45-70 MAD par bidon contre ~12 MAD sur le filtre seul. Si 10 vidanges par semaine passent au pack, c'est **+2 000 à 2 500 MAD de marge par mois** — sans un client de plus, sans un geste de plus qu'un tap.
- **Le geste.** 1 tap sur la suggestion qui apparaît toute seule. Rien à chercher, rien à configurer.
- **Effort : S** — spec §4.11.

### Idée 19 · 🆕 Registre « j'ai pas » — *l'étude de marché gratuite que tu jettes chaque jour*

- **Le problème.** Chaque jour, on te demande 3-5 références que tu n'as pas. Tu dis « j'ai pas », le client va en face, et l'information disparaît. C'est la meilleure étude de marché possible — de la demande RÉELLE, avec le client devant toi — et elle part à la poubelle.
- **La solution.** Quand la recherche ne trouve rien (ou que tu n'as pas le stock), un bouton « ❌ J'ai pas » enregistre la référence demandée en 1 tap. À la 3ᵉ demande de la même référence, l'app te dit : « OE667/6 demandé 3× ce mois → stocke-le ».
- **Pourquoi ça rapporte.** Une référence ajoutée sur demande réelle est une vente quasi garantie à ~40 % de marge, ET un client qui apprend que « lui, il a » — il revient et il le dit. 5 références identifiées par mois × 2-3 ventes chacune × 12 MAD de marge ≈ **150-400 MAD/mois qui composent** : le mois suivant elles vendent encore. Au bout d'un an, ton stock est sculpté par la demande de TA ville, pas par le catalogue du fournisseur.
- **Le geste.** Le client demande → tu cherches → pas trouvé → 1 tap « ❌ J'ai pas » (la réf est déjà tapée dans la recherche, rien à ressaisir). La liste triée par fréquence t'attend dans `/reappro`.
- **Effort : S** — spec §4.12.

### Idée 20 · 🆕 Kit véhicule — *la vente croisée par la donnée que toi seul possèdes*

- **Le problème.** Le client vient pour le filtre à huile du Duster. Les filtres air et habitacle du MÊME véhicule, il les changera « plus tard » — c'est-à-dire ailleurs. Tu as pourtant dans `applications` la liste exacte des filtres de chaque véhicule : la donnée est là, elle ne vend pas.
- **La solution.** À la vente, quand le filtre ajouté est lié à un véhicule, l'app affiche les AUTRES filtres compatibles du même véhicule **en stock** : « Ce véhicule prend aussi : filtre air {réf} · habitacle {réf} — ajouter ? ». Jamais de devinette : uniquement les compatibilités de la table `applications`.
- **Pourquoi ça rapporte.** +1 filtre sur 1 vente sur 5, c'est +12-20 MAD de marge par occurrence. À 15 ventes de filtres/jour, ça fait **~900-1 800 MAD de marge/mois** sur des clients déjà devant toi. Pour les garages : le kit complet (huile + air + habitacle + bidon) monte le panier vidange de 30 à 450+ MAD.
- **Le geste.** 1 tap par filtre suggéré. La rangée s'ignore sans friction.
- **Effort : M** — spec §4.13.

### Idée 21 · 🆕 Clients endormis — *le client qui a disparu sans bruit*

- **Le problème.** Un garage qui commandait chaque mois s'arrête. Tu ne le remarques que 6 mois plus tard — il est déjà installé chez le concurrent. Un client régulier perdu = 200-500 MAD de marge mensuelle évaporée en silence.
- **La solution.** Le miroir exact des relances impayés (déjà livrées) : une carte accueil « 😴 À réveiller » — clients avec ≥ 3 achats dans l'historique et AUCUN achat depuis 45 jours. Un tap → WhatsApp : « Salam {nom} 🙏 Ça fait un moment ! Dis-moi ce qu'il te faut, je te prépare ça » (+ la promo en cours s'il y en a une).
- **Pourquoi ça rapporte.** Réveiller UN garage régulier par mois = 200-500 MAD/mois de marge récupérée, en continu. Coût : un tap. C'est la rétention la moins chère qui existe — et le message arrive souvent pile quand le concurrent a fait une erreur.
- **Le geste.** Accueil → carte « À réveiller » → tap WhatsApp. Le client sort de la liste 30 jours.
- **Effort : S** — spec §4.14.

### Idée 22 · 🆕 Devis WhatsApp — *l'écrit vend mieux que le marchandage*

- **Le problème.** « Fais-moi un prix pour cette liste » — tu réponds de tête, le garage compare, rappelle, tu as oublié ce que tu avais dit. Pas de trace = pas de relance = négociation recommencée à zéro à chaque fois.
- **La solution.** Le panier de `/ventes` peut sortir en **devis** au lieu d'une vente : un tap « 📄 Devis WhatsApp » compose un message propre (lignes, remise du client déjà appliquée, total, « valable 7 jours ») et l'envoie au client.
- **Pourquoi ça rapporte.** Un prix écrit avec une validité **ferme la porte au marchandage ligne par ligne** (+1-2 points de marge préservés) et convertit mieux : le garage transfère ton devis à son client final pour valider la réparation — c'est lui qui vend pour toi. Et le devis non conclu à J+5 est une relance toute prête.
- **Le geste.** Composer le panier comme d'habitude → 1 tap « Devis » au lieu de « Vendre ». Rien d'autre.
- **Effort : S** — spec §4.15.

### Idée 23 · 🆕 Diffusion arrivages & promos — *le statut WhatsApp, ta vitrine gratuite*

- **Le problème.** Tu reçois de la marchandise, personne ne le sait. Tes 300+ contacts WhatsApp (clients, garages, confrères) regardent les statuts tous les jours — et tu ne publies rien, ou un effort manuel irrégulier.
- **La solution.** Un bouton « 📣 Arrivages » compose automatiquement le message de la semaine : produits reçus/réapprovisionnés depuis 7 jours + promos en cours (`prix_promo`), format propre avec ton numéro. Tu le partages en statut WhatsApp et dans ta liste de diffusion garages.
- **Pourquoi ça rapporte.** Le statut WhatsApp est le canal marketing le plus vu au Maroc et il est **gratuit**. 2-3 ventes déclenchées par semaine à 100-300 MAD de panier ≈ **1 000-3 000 MAD/mois de CA** pour 1 tap hebdomadaire. Régularité = les clients prennent l'habitude de checker TON statut avant d'acheter.
- **Le geste.** Vendredi : 1 tap « Arrivages » → partager. 30 secondes.
- **Effort : S** — spec §4.16.

### Idée 24 · 🆕 Parrainage garages — *tes meilleurs commerciaux travaillent déjà pour toi gratuitement*

- **Le problème.** Tes garages contents parlent de toi… quand ça se présente. Rien ne les motive à le faire activement, et tu ne sais jamais qui t'a amené qui.
- **La solution.** Une règle simple, annoncée à tous : « amène-moi un garage, tu as **100 MAD d'avoir** à sa première commande ». À la création d'un client garage, tu choisis le parrain ; à la première vente du filleul, l'app crée l'avoir du parrain et te le rappelle à sa prochaine vente (« avoir 100 MAD à déduire »).
- **Pourquoi ça rapporte.** Un garage actif vaut 200-500 MAD de marge PAR MOIS ; tu l'acquiers pour 100 MAD **une seule fois**, payés uniquement au succès. Il n'existe pas de coût d'acquisition plus bas — et le filleul arrive pré-vendu par quelqu'un qu'il croit.
- **Le geste.** À la création du garage : 1 choix dans une liste « parrainé par… ». Le reste est automatique.
- **Effort : S** — spec §4.15 (même chantier que l'avoir).

### Idée 25 · 💡 BONUS — Fiche Google Business (zéro ligne de code, une heure un dimanche)

- **Le problème.** Quelqu'un tape « pièces auto » + ta ville sur Google Maps : tu n'existes pas. Tes concurrents non plus, souvent — la place est à prendre gratuitement.
- **La solution.** Créer la fiche Google Business « FiltroPro » : photos de la boutique et des rayons, horaires, lien `wa.me`, lien vers le catalogue public `/c/` quand il sera en ligne (§4.8). Demander un avis 5★ aux 10 meilleurs clients (un message WhatsApp chacun).
- **Pourquoi ça rapporte.** « Filtre à huile près de moi », « pièces auto {ta ville} » : la fiche Maps capte ce trafic **avant même le SEO**. 1-2 nouveaux clients par semaine qui savent où tu es et t'écrivent direct sur WhatsApp. Coût : zéro, pour toujours. Et la fiche + le catalogue se renforcent mutuellement sur Google.
- **Le geste.** Aucun dans l'app — une heure de configuration, puis répondre aux avis.
- **Effort : S** — pas de spec : c'est TOI qui la fais, pas Opus.

### Idées 14-17 · Année 2 et au-delà (résumé — détails et seuils au §5)

- **14 · Abonnement « réappro auto » garages.** Le garage abonné (149 MAD/mois) ne commande plus : TU passes avec ce qu'il faut, calculé sur sa consommation réelle. NE PAS lancer avant ~30 garages actifs et 6 mois d'historique fiable — la rente exige une confiance déjà installée. C'est le premier revenu qui ne dépend pas d'un carton porté.
- **15 · Mode livreur.** Un écran restreint : circuit + quantités + encaissements à noter. Prix d'achat, marges et capital masqués (le mécanisme « œil » existe déjà). Tu embauches sans ouvrir tes chiffres — la condition pour grandir sans perdre le contrôle.
- **16 · 💡 BONUS — Achats groupés confrères.** Ta donnée de réappro te dit QUOI grouper ; 3-4 confrères qui commandent ensemble obtiennent 5-10 % chez le fournisseur. Toi tu organises, donc tu prends la meilleure part — et tu apprends qui sont les confrères sérieux (futurs clients de la marketplace).
- **17 · Marketplace / listings payants.** Quand le catalogue public fait un vrai trafic (≥ 500 visites/mois), les confrères paieront pour y apparaître. Commencer par UN pilote dans UNE ville où tu ne livres pas : aucune cannibalisation, et tu apprends le métier de plateforme sans risquer le tien.

---

# 3. FEUILLE DE ROUTE

## Phase 1 — 0-6 mois : ENCAISSER (trajectoire T1)

**Chantiers (6) :** ① ✅ relances impayés 1-tap (§4.1 — livré 14/07/2026) · ② ✅ prix par segment + limite de crédit + badge (§4.1 — livré) · ③ 🆕 pack vidange filtre + huile (§4.11) · ④ promo stock dormant (§4.2) · ⑤ marge visible (§4.3) · ⑥ bilan hebdo (§4.4) — et en bonus rapide la fiche produit WhatsApp (§4.5).
**Renforts rapides à glisser entre deux chantiers (effort S, gain immédiat) :** registre « j'ai pas » (§4.12) · clients endormis (§4.14) · devis WhatsApp (§4.15) · diffusion arrivages (§4.16) · fiche Google Business (idée 25 — toi, pas Opus).
**Résultat attendu :** impayés divisés par 2, +2-3 points de marge, stock dormant liquidé une première fois, zéro vente à perte. Ordre de grandeur : **+1 500 à 3 000 MAD de bénéfice/mois à volume constant**.
**Signal de passage à la phase 2 :** deux mois de suite avec encaissé/vendu ≥ 85 % ET impayés totaux < 1 mois de bénéfice.

## Phase 2 — 6-24 mois : CROÎTRE (T2 + graine de T3)

**Chantiers (5) :** ① commande WhatsApp → vente préparée + liste de chargement (§4.6) · ② réappro prédictif (§4.7) · ③ catalogue public SEO (§4.8) · ④ fidélité paliers (§4.9) · ⑤ rappel vidange (§4.10).
**Renforts croissance :** kit véhicule (§4.13) · parrainage garages (§4.15) — les deux nourrissent directement le nombre de garages actifs (chiffre n° 5 du tableau de bord).
**Résultat attendu :** 20-40 garages en commande régulière, tournées vendues d'avance, premières demandes entrantes depuis Google. Ordre de grandeur : **CA ×1,5 à ×2**.
**Signal de passage :** ≥ 30 garages actifs/mois ET catalogue ≥ 500 visites/mois.

## Phase 3 — 2-5 ans : L'ÉCHELLE

**Chantiers (4) :** ① abonnement « réappro auto » (idée 14) · ② mode livreur + première embauche (idée 15) · ③ achats groupés confrères (idée 16) · ④ deuxième zone de tournée (ou petit dépôt relais).
**Résultat attendu :** 4 000-10 000 MAD/mois de revenus récurrents d'abonnements + volume doublé grâce au livreur, pendant que toi tu passes aux achats, aux prix et à la donnée.
**Signal de passage :** les abonnements couvrent le salaire du livreur (~3 000-4 000 MAD/mois).

## Phase 4 — 5-10 ans : LA PLATEFORME (T3)

**Chantiers (3) :** ① marketplace pilote dans 1 ville non couverte · ② listings payants / commissions sur mise en relation · ③ licence des données de compatibilité (API ou export payant pour d'autres commerçants).
**Résultat :** FiltroPro n'est plus une boutique avec une app — c'est une **infrastructure** que le marché utilise. Toi tu possèdes les trois choses non copiables : la donnée, la marque, le réseau.

---

# 4. SPÉCIFICATIONS TECHNIQUES POUR OPUS (Claude Code)

> ## §4.0 Rappels permanents — à inclure mentalement dans CHAQUE spec
>
> - **CLI Supabase bloqué** (Smart App Control Windows) : le SQL ci-dessous est écrit dans un fichier `supabase/*.sql` et **collé à la main par l'utilisateur** dans l'éditeur SQL web (https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new). Le SQL doit être **idempotent** (`create table if not exists`, `add column if not exists`, `drop policy if exists`) et se terminer par `notify pgrst, 'reload schema';` (sinon erreur « Could not find the table … in the schema cache »).
> - Les **données** (insert/update/delete, RPC) passent par un script Node `@supabase/supabase-js` avec la clé anon (scripts `_*.mjs` jetables, à supprimer après).
> - Supabase limite à **1000 lignes/requête** → toujours paginer avec `.range()`.
> - La classe CSS `.input` est **`w-full`** : elle écrase `w-28`/`flex-1` dans une rangée flex → pour les formulaires multi-champs, **grille avec libellés** (un `.input` par cellule), jamais de largeur Tailwind sur `.input`.
> - Thème **sombre doré**, bilingue **FR/AR (RTL)** via `useLang()`, devise **MAD**. PWA avec cache : après déploiement, prévenir l'utilisateur de **recharger** l'app.
> - **Ne JAMAIS inventer une référence de pièce.** Exemples autorisés dans le code/tests : OE667/6 (Filtron), HU7032Z (Mann), WL 7510 (WIX), Z555 (Flag).
> - **Commit + push après chaque modification** (`git add` + `git commit` + `git push origin master`, via l'outil Bash à cause des espaces du dossier). Build : `npm run build` avec Node préfixé au PATH ; déploiement `vercel --prod --yes`.
> - Bénéfices : toujours basés sur `sale_items.cout_unitaire` avec fallback `products.prix_achat` (et pour une variante, `equivalences.prix_achat`).

---

## §4.1 Segments clients, limite de crédit, relances (idées 1-2-3) — ✅ LIVRÉ le 14/07/2026

> **Fait** (commit b7ae4b0) : SQL `supabase/clients_segments.sql` appliqué ; `/clients` (type + remise + limite + badge fiabilité basé sur l'âge de la dette en cours) ; accueil (carte « À relancer », WhatsApp 1-tap, masquage 7 jours) ; `/ventes` (remise auto sur chaque ligne, bandeau limite de crédit non bloquant). Le solde client est désormais **calculé en direct** depuis les ventes (commit b8f5240) — ne plus se fier à `clients.solde_du` stocké. La spec d'origine est conservée ci-dessous pour référence.

**Instructions pour Opus — copiable tel quel :**

```
Implémente les segments clients, la limite de crédit et les relances WhatsApp (Bible §4.1).

1) SQL à fournir dans supabase/clients_segments.sql (je le collerai dans l'éditeur web) :
```

```sql
alter table clients add column if not exists type text not null default 'comptoir';      -- 'comptoir' | 'garage' | 'gros'
alter table clients add column if not exists remise_pct numeric not null default 0;      -- remise en %, appliquée à la vente
alter table clients add column if not exists limite_credit numeric not null default 0;   -- 0 = pas de limite
alter table clients add column if not exists derniere_relance date;                      -- masque le client de la liste 7 jours
notify pgrst, 'reload schema';
```

```
2) Page /clients — fiche client : ajouter dans le formulaire (grille avec libellés,
   un .input par cellule — PAS de largeurs Tailwind sur .input) :
   - sélecteur « Type » : Comptoir / Garage / Gros (FR/AR),
   - champ « Remise % » (nombre),
   - champ « Limite crédit (MAD) » (nombre, 0 = illimité).
   Afficher sur la carte client un badge fiabilité calculé :
   délai moyen entre sale.date et le passage à statut 'paye' sur les 6 derniers mois
   (paginer sales avec .range()) → 🟢 < 7 j, 🟠 7-30 j, 🔴 > 30 j.

3) Accueil (/) — carte « À relancer » :
   clients avec solde_du > 0 ET (derniere_relance null OU derniere_relance < aujourd'hui − 7 j),
   triés par ancienneté de la plus vieille vente non soldée (statut != 'paye').
   Chaque ligne : nom, montant dû, âge de la dette, bouton WhatsApp (réutiliser src/lib/whatsapp.ts)
   avec message pré-rempli selon la langue :
   FR : « Salam {nom} 🙏 Petit rappel : il reste {solde} MAD chez FiltroPro. Merci ! »
   AR : équivalent en arabe.
   Après le tap : derniere_relance = date du jour → le client sort de la liste 7 jours.
   Montants masquables par l'œil existant.

4) Page /ventes — à la sélection du client :
   - appliquer remise_pct au prix de chaque ligne (arrondi à l'entier, champ modifiable à la main) ;
   - si limite_credit > 0 ET solde_du + total panier > limite_credit :
     bandeau rouge NON bloquant « ⚠ dépasse sa limite de {dépassement} MAD » ;
   - afficher le badge fiabilité 🟢🟠🔴 à côté du nom du client.

5) La page /rappels existante reste (vue détaillée) ; la carte accueil est le raccourci quotidien.
Contraintes : §4.0 de la Bible. Commit + push.
```

## §4.2 Promo stock dormant (idée 4) — ✅ LIVRÉ le 18/07/2026 (onglet 💤 Dormant dans /reappro)

**Instructions pour Opus — copiable tel quel :**

```
Implémente la détection du stock dormant et la promo 1-tap (Bible §4.2). Pas de SQL.

1) Page /reappro — ajouter un onglet « Dormant » (l'onglet réappro actuel reste) :
   - Charger les sale_items des 90 derniers jours (joindre sales pour la date ;
     paginer avec .range(), limite 1000) → construire le set des product_id
     ET des equivalence_id vendus.
   - Dormant = produit (stock > 0) ou variante (equivalences.stock > 0)
     absent du set ET créé depuis > 60 jours (created_at du produit).
   - Trier par valeur immobilisée décroissante : stock × prix_achat
     (pour une variante : equivalences.stock × equivalences.prix_achat,
     fallback products.prix_achat).
   - Afficher : référence, marque, stock, valeur immobilisée (masquable par l'œil),
     dernière vente (« jamais » ou date).

2) Actions :
   - bouton par ligne « Promo −15 % » → products.prix_promo = round(prix_vente × 0,85) ;
   - bouton global « 📣 Promo WhatsApp » → réutiliser la génération de message promo
     existante de /produits avec la liste des dormants en promo.

3) Ajouter le total « Valeur dormante » en tête d'onglet (masquable),
   et le même chiffre dans /stats.
Contraintes : §4.0. Commit + push.
```

## §4.3 Marge visible à la vente (idée 5) — ✅ LIVRÉ le 18/07/2026

**Instructions pour Opus — copiable tel quel :**

```
Ajoute la pastille de marge sur chaque ligne de vente (Bible §4.3). Pas de SQL.

Page /ventes : sur chaque ligne du panier, un petit <span> rond coloré (aucun texte) :
- coût = equivalences.prix_achat si une variante est choisie, sinon products.prix_achat
  (même logique que le cout_unitaire figé à l'enregistrement) ;
- 🔴 rouge si prix_unitaire < coût (vente à perte) ;
- 🟠 orange si marge < 15 % du prix ;
- 🟢 vert sinon.
Discret : un point de 8 px, pas de libellé, pas de tooltip — seul l'utilisateur
connaît le code. Recalculer à chaque modification du prix ou de la quantité.
Contraintes : §4.0. Commit + push.
```

## §4.4 Bilan hebdo WhatsApp (idée 6) — ✅ LIVRÉ le 18/07/2026 (bouton dans /stats)

**Instructions pour Opus — copiable tel quel :**

```
Ajoute le bilan hebdomadaire en un tap (Bible §4.4). Pas de SQL.

Page /stats — bouton « 📊 Mon bilan de la semaine » :
compose un message texte (FR) et l'ouvre via wa.me (numéro de l'utilisateur,
stocké dans localStorage à la première utilisation, modifiable dans /parametres) :
- bénéfice de la semaine (lundi → aujourd'hui, base cout_unitaire,
  fallback prix_achat — réutiliser les calculs existants de /stats) ;
- encaissé / vendu en % ;
- total impayés + âge de la plus vieille créance ;
- top 3 des produits vendus (quantités) ;
- valeur du stock dormant (calcul §4.2) ;
- comparaison avec la semaine précédente (bénéfice, en % : ▲ / ▼).
Paginer toutes les requêtes (.range()).
Étape 2 (plus tard, ne pas bloquer) : cron Vercel + notification push PWA le vendredi 18h.
Contraintes : §4.0. Commit + push.
```

## §4.5 Fiche produit WhatsApp (idée 13) — ✅ LIVRÉ le 18/07/2026 (bouton vert dans /produits)

**Instructions pour Opus — copiable tel quel :**

```
Ajoute la fiche produit WhatsApp 1-tap (Bible §4.5). Pas de SQL.

Page /produits — sur chaque fiche produit, bouton « 📤 Fiche WhatsApp » :
compose et ouvre un message wa.me (sans destinataire → l'utilisateur choisit) :
- nom FR + référence + marque (ex : « Filtre à huile Filtron OE667/6 ») ;
- dimensions si présentes ;
- « Compatible : » + les 4 premières applications (marque modèle moteur) +
  « … et X autres véhicules » si plus ;
- variantes disponibles (marques des equivalences avec stock > 0, SANS prix) ;
- « 📞 FiltroPro — {téléphone depuis /parametres} ».
Ne JAMAIS inventer une compatibilité : uniquement la table applications.
Contraintes : §4.0. Commit + push.
```

## §4.6 Commande WhatsApp → vente préparée + liste de chargement (idées 7-8) — ✅ LIVRÉ le 18/07/2026 (page /commandes, SQL `idees_bible_2eme_vague.sql`)

**Instructions pour Opus — copiable tel quel :**

```
Implémente le parseur de commandes WhatsApp et la liste de chargement (Bible §4.6).

1) SQL à fournir dans supabase/garages_client.sql :
```

```sql
alter table garages add column if not exists client_id uuid references clients(id);
notify pgrst, 'reload schema';
```

```
2) Nouvelle page /commandes (lien depuis l'accueil et /tournees) :
   - sélecteur du garage (liste garages) ;
   - textarea « Colle le message du garage » ;
   - parseur, ligne par ligne :
     a. normaliser : majuscules, retirer TOUS les espaces (réutiliser la logique
        de recherche insensible aux espaces déjà présente : wl7510 ↔ WL 7510) ;
     b. extraire la quantité : « 2 oe667/6 », « oe667/6 x2 », « oe667/6 ×2 »,
        « oe667/6 *2 » — défaut 1 ;
     c. matcher la référence normalisée contre products.reference
        ET equivalences.reference (normalisées pareil, paginer .range()) ;
        match sur une équivalence → mémoriser equivalence_id + prix de la variante.
   - Rendu : ligne reconnue = verte (réf, désignation, marque, qté, prix) ;
     ambiguë (plusieurs matches) ou inconnue = ROUGE avec mini-recherche manuelle.
     NE JAMAIS choisir à la place de l'utilisateur — jamais de devinette de référence.
   - Bouton « Valider la commande » :
     * si garages.client_id est vide → bouton « Créer le client depuis ce garage »
       (copie nom/téléphone/ville, type 'garage') puis lier ;
     * créer une sale statut 'en_attente' (montant_paye 0) avec les sale_items
       (equivalence_id, cout_unitaire figé, prix = prix variante × (1 − remise client)) ;
     * NE PAS décrémenter le stock à la préparation — le stock se décrémente
       à la livraison (passage en payé/partiel), comme le flux de vente actuel ;
     * passer le garage en statut 'preparee'.

3) Liste de chargement — dans /tournees, bouton « 📦 Chargement du jour » :
   agréger les sale_items des ventes 'en_attente' des clients liés aux garages
   du jour sélectionné (garages.jour) ; afficher « qté × référence (marque) »
   groupé par catégorie, avec cases à cocher (état local, pas de table).
Contraintes : §4.0. Commit + push.
```

## §4.7 Réappro prédictif (idée 9) — ✅ LIVRÉ le 18/07/2026 (onglet 📈 Prédictif dans /reappro)

**Instructions pour Opus — copiable tel quel :**

```
Implémente le réappro prédictif (Bible §4.7). Pas de SQL.

Page /reappro — onglet « Prédictif » (l'onglet stock_min actuel reste) :
- Charger les sale_items des 90 derniers jours (paginer .range()) ;
- par produit ET par variante : vitesse = quantité vendue ÷ 90 (unités/jour) ;
- jours restants = stock ÷ vitesse (∞ si vitesse 0 → exclu de la liste) ;
- suggestion de commande = ceil(vitesse × 30) − stock (couverture 30 jours), min 0 ;
- afficher : référence, marque, stock actuel, « X j restants », suggestion,
  trié par jours restants croissant, filtre rapide « < 15 j » ;
- grouper par fournisseur habituel = dernier fournisseur_id utilisé dans
  les sale_items de ce produit (fallback « — ») ;
- bouton « 📤 Commande WhatsApp » par groupe fournisseur : message listant
  « qté × référence » à envoyer au téléphone du fournisseur.
Contraintes : §4.0. Commit + push.
```

## §4.8 Catalogue public SEO (idée 10) — ✅ LIVRÉ le 18/07/2026 (/c/[réf] + sitemap.xml + robots.txt, hors service worker)

**Instructions pour Opus — copiable tel quel :**

```
Implémente le catalogue public SEO (Bible §4.8). Pas de SQL.

1) Route publique /c/[reference] (App Router, rendu serveur) :
   - generateStaticParams paginé sur products (.range() par 1000) +
     revalidate 86400 (ISR 24 h) ;
   - la référence dans l'URL est encodée (OE667/6 → OE667%2F6) : prévoir
     la normalisation/décodage, et une variante slug sans caractères spéciaux ;
   - contenu : référence + marque + catégorie (FR), photo (FilterImage),
     dimensions, tableau des véhicules compatibles (table applications :
     marque, modèle, moteur, années — paginer), marques équivalentes
     (equivalences.marque + reference) SANS AUCUN PRIX ;
   - disponibilité : « ✅ Disponible » si stock > 0 sinon « Sur commande » —
     JAMAIS le chiffre exact du stock, JAMAIS les prix d'achat/vente ;
   - bouton principal « 💬 Demander le prix sur WhatsApp » → wa.me du commerçant,
     message pré-rempli « Salam, prix et dispo du {référence} ? » ;
   - metadata SEO : title « Filtre {catégorie} {référence} {marque} — compatible
     {1er véhicule} — Maroc | FiltroPro », description avec 3 véhicules,
     openGraph avec l'image.

2) /sitemap.xml généré depuis products (paginer) ; robots.txt autorisant /c/
   et interdisant le reste de l'app.

3) Le service worker (sw.js) NE DOIT PAS intercepter /c/ (pages publiques
   toujours fraîches pour Google et les visiteurs).

4) Lien discret « Catalogue » dans le footer de l'accueil.
Aucune donnée sensible exposée. Contraintes : §4.0. Commit + push.
```

## §4.9 Fidélité paliers garages (idée 11) — ✅ LIVRÉ le 18/07/2026 (suggestions sur les fiches /clients)

**Instructions pour Opus — copiable tel quel :**

```
Implémente les paliers de fidélité trimestriels (Bible §4.9). Pas de SQL.

Page /clients — pour les clients type 'garage' ou 'gros' :
- calculer le CA du trimestre en cours par client (paginer sales .range()) ;
- palier suggéré : ≥ 3000 MAD → 5 % ; ≥ 8000 → 8 % ; ≥ 15000 → 10 % ; sinon 0 ;
- si palier suggéré ≠ remise_pct actuelle : badge « 💡 Suggestion : passer à X % »
  avec bouton 1-tap « Appliquer » (update remise_pct) et bouton « Ignorer » ;
- JAMAIS automatique sans validation : c'est du prix ;
- afficher la progression vers le palier suivant : « encore 900 MAD pour −8 % »
  (aussi utilisable en argument de vente au garage) ;
- bouton « 📤 Annoncer » : WhatsApp au garage « Salam {nom}, tu es passé au
  palier −{X}% chez FiltroPro 🎉 » ou « il te manque {Y} MAD ce trimestre
  pour le palier −{X}% ».
Contraintes : §4.0. Commit + push.
```

## §4.10 💡 Rappel vidange client final (idée 12) — ✅ LIVRÉ le 18/07/2026 (après-vente + carte accueil, SQL `idees_bible_2eme_vague.sql`)

**Instructions pour Opus — copiable tel quel :**

```
Implémente les rappels vidange (Bible §4.10).

1) SQL à fournir dans supabase/rappels_vidange.sql :
```

```sql
create table if not exists rappels_vidange (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  garage_id uuid references garages(id),
  client_id uuid references clients(id),
  vehicule text not null,            -- « Dacia Dokker de Ahmed » (texte libre, 5 secondes)
  date_prevue date not null,         -- défaut : +5 mois
  fait boolean not null default false
);
alter table rappels_vidange enable row level security;
drop policy if exists rappels_all on rappels_vidange;
create policy rappels_all on rappels_vidange for all using (true) with check (true);
notify pgrst, 'reload schema';
```

```
2) Page /ventes — après l'enregistrement d'une vente à un client type 'garage' :
   petit bloc optionnel repliable « 🔔 Rappel vidange » : 1 champ texte
   (« Dacia Dokker de Ahmed ») + date pré-remplie à +5 mois (modifiable).
   Enregistrer → insert rappels_vidange lié au client (et au garage si lié).
   Ignorer = aucun geste, le bloc n'oblige à rien.

3) Accueil — carte « 🔔 Vidanges à rappeler » : rappels non faits avec
   date_prevue ≤ aujourd'hui + 7 j ; chaque ligne : véhicule, garage, bouton
   WhatsApp « Salam, la {vehicule} arrive à sa vidange — je te livre le filtre ? » ;
   après le tap → fait = true (avec petit undo 5 s).
Contraintes : §4.0. Commit + push.
```

## §4.11 Pack vidange — filtre + huile (idée 18) — ✅ LIVRÉ le 18/07/2026

**Instructions pour Opus — copiable tel quel :**

```
Implémente la suggestion « pack vidange » filtre + huile (Bible §4.11). Pas de SQL
(la catégorie 'huile_moteur' existe déjà — commit 94f5d11).

1) Page /ventes — quand une ligne de catégorie 'filtre_huile' est ajoutée au panier
   (scan, recherche ou variante) ET qu'aucune ligne 'huile_moteur' n'est déjà
   dans le panier :
   - afficher SOUS la ligne une rangée discrète refermable « 🛢️ + l'huile ? » :
     les produits categorie 'huile_moteur' avec stock > 0, triés par quantités
     vendues sur 90 jours (paginer sale_items avec .range(), fallback tri par nom),
     6 suggestions max, format « {marque/nom} — {prix} MAD » ;
   - 1 tap sur une suggestion = ajoute la ligne au panier avec la logique
     existante (remise du client appliquée, cout_unitaire figé, pastille de
     marge §4.3 si déjà en place) et referme la rangée ;
   - croix ✕ pour fermer sans ajouter ; ne réapparaît pas dans la même vente ;
   - discret : une seule rangée horizontale scrollable, pas de modal,
     pas de popup — zéro friction si on l'ignore.

2) Fiche produit WhatsApp (§4.5, si déjà implémentée) : pour un filtre à huile,
   ajouter une ligne « 🛢️ Huiles disponibles : {marques en stock} » (sans prix).

3) Ne JAMAIS suggérer une huile hors stock. Aucun mapping viscosité↔véhicule
   inventé : la suggestion est triée par popularité réelle des ventes, le choix
   de la bonne huile reste à l'utilisateur.
Contraintes : §4.0. Commit + push.
```

## §4.12 Registre « j'ai pas » — ventes perdues (idée 19) — ✅ LIVRÉ le 18/07/2026 (SQL : `idees_bible_19_24.sql`)

**Instructions pour Opus — copiable tel quel :**

```
Implémente le registre des ventes perdues (Bible §4.12).

1) SQL à fournir dans supabase/demandes_manquees.sql :
```

```sql
create table if not exists demandes_manquees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference text not null,           -- la référence telle que cherchée (normalisée majuscules)
  note text,                          -- optionnel : « pour Clio 4 », nom du client…
  traite boolean not null default false
);
alter table demandes_manquees enable row level security;
drop policy if exists demandes_all on demandes_manquees;
create policy demandes_all on demandes_manquees for all using (true) with check (true);
notify pgrst, 'reload schema';
```

```
2) Page /recherche — quand la recherche par référence ne donne AUCUN résultat
   (ou en complément des résultats) : bouton « ❌ J'ai pas » qui insère la
   référence tapée (normalisée : majuscules, espaces retirés) dans
   demandes_manquees, avec un mini-champ note optionnel. Toast de confirmation,
   1 tap au total. Marche aussi hors-ligne (file d'attente comme les ventes).

3) Page /reappro — onglet « Demandé » : agréger demandes_manquees non traitées
   par référence (count + date de dernière demande), trié par count décroissant.
   Badge rouge sur l'onglet si une référence atteint 3 demandes sur 30 jours.
   Bouton par ligne « ✔ Traité » (traite = true) et « ➕ Créer le produit »
   (préremplit /produits avec la référence — SANS inventer marque ni prix :
   champs vides à compléter à la main).

4) Accueil — dans les alertes existantes : « {réf} demandé {n}× ce mois »
   quand n ≥ 3.
Contraintes : §4.0. Commit + push.
```

## §4.13 Kit véhicule — vente croisée par compatibilité (idée 20) — ✅ déjà présent dans /ventes (suggestions « même véhicule »)

**Instructions pour Opus — copiable tel quel :**

```
Implémente la suggestion « kit véhicule » à la vente (Bible §4.13). Pas de SQL.

1) Page /ventes — quand une ligne est ajoutée au panier et que son produit a
   des lignes dans applications :
   - prendre les véhicules du produit (applications du product_id, paginer) ;
   - chercher les AUTRES produits (catégorie différente : filtre_air,
     filtre_habitacle, filtre_carburant) partageant au moins un véhicule
     identique (même marque + modele + code_moteur si présent, sinon
     marque + modele + moteur) — requête sur applications, paginer .range() ;
   - ne garder que les produits avec stock > 0 (produit ou une variante) ;
   - afficher une rangée discrète refermable « 🚗 Ce véhicule prend aussi : »
     avec max 3 suggestions « {catégorie} {référence} — {prix} MAD » ;
   - 1 tap = ajoute la ligne (remise client, cout_unitaire figé, logique
     existante) ; ✕ referme ; une seule apparition par vente ;
   - si plusieurs véhicules matchent des kits différents, prendre le premier
     véhicule commun — ne rien afficher en cas d'ambiguïté totale plutôt
     que de suggérer faux. JAMAIS de compatibilité hors table applications.

2) Si le pack vidange (§4.11) est en place : fusionner les deux rangées en une
   seule « Compléter : 🛢️ huile · 🚗 kit véhicule » pour ne pas empiler.
Contraintes : §4.0. Commit + push.
```

## §4.14 Clients endormis (idée 21) — ✅ LIVRÉ le 18/07/2026 (basé sur le rythme d'achat réel de chaque client, mieux que 45 j fixes)

**Instructions pour Opus — copiable tel quel :**

```
Implémente la relance des clients endormis (Bible §4.14).

1) SQL à fournir dans supabase/clients_reveil.sql :
```

```sql
alter table clients add column if not exists derniere_relance_com date;  -- relance commerciale (≠ derniere_relance impayés)
notify pgrst, 'reload schema';
```

```
2) Accueil — carte « 😴 À réveiller » (sous « À relancer ») :
   clients avec ≥ 3 ventes au total ET aucune vente depuis 45 jours
   (paginer sales .range() ; réutiliser le chargement existant de l'accueil)
   ET (derniere_relance_com null OU < aujourd'hui − 30 j).
   Chaque ligne : nom, « dernier achat il y a {n} j », total des 6 derniers mois
   (masquable par l'œil), bouton WhatsApp :
   FR : « Salam {nom} 🙏 Ça fait un moment ! Dis-moi ce qu'il te faut,
   je te le prépare. » — ajouter « 🔥 En ce moment : {produits en prix_promo,
   max 3} » s'il y a des promos actives.
   Après le tap : derniere_relance_com = aujourd'hui → sort de la liste 30 j.
   Trier par total 6 mois décroissant (réveiller les plus gros d'abord).
Contraintes : §4.0. Commit + push.
```

## §4.15 Devis WhatsApp + avoir de parrainage (idées 22 et 24) — ✅ LIVRÉ le 18/07/2026

**Instructions pour Opus — copiable tel quel :**

```
Implémente le devis WhatsApp et l'avoir de parrainage (Bible §4.15).

1) SQL à fournir dans supabase/devis_parrainage.sql :
```

```sql
alter table clients add column if not exists avoir numeric not null default 0;        -- crédit à déduire (MAD)
alter table clients add column if not exists parrain_id uuid references clients(id);  -- qui l'a amené
alter table clients add column if not exists parrain_paye boolean not null default false;
notify pgrst, 'reload schema';
```

```
2) Devis — page /ventes : à côté du bouton de validation, bouton « 📄 Devis » :
   compose un texte WhatsApp depuis le panier SANS créer de vente ni toucher
   au stock :
   « 📄 Devis FiltroPro — {date}
     {qté} × {référence} ({marque}) — {prix} MAD
     …
     Total : {total} MAD
     ✅ Valable 7 jours · 📞 {téléphone /parametres} »
   La remise du client est déjà appliquée aux lignes. Ouvre wa.me du client
   (ou sans destinataire si pas de téléphone). Aucune persistance : simple,
   zéro friction.

3) Parrainage — page /clients : à la création/édition d'un client, sélecteur
   optionnel « Parrainé par » (liste des clients type garage/gros).
   À l'enregistrement d'une VENTE payée/partielle d'un client dont
   parrain_id est renseigné ET parrain_paye = false ET c'est sa 1ère vente :
   avoir du parrain += 100 ; parrain_paye = true ; toast « 🎁 Avoir de
   100 MAD crédité à {parrain} ».

4) Page /ventes — si le client sélectionné a avoir > 0 : bandeau doré
   « 🎁 Avoir : {avoir} MAD — déduire ? » ; 1 tap déduit du total
   (min(avoir, total)), décrémente clients.avoir, trace dans sale.notes
   (« avoir déduit : X MAD »).
Contraintes : §4.0. Commit + push.
```

## §4.16 Diffusion arrivages & promos (idée 23) — ✅ LIVRÉ le 18/07/2026

**Instructions pour Opus — copiable tel quel :**

```
Implémente le message hebdo « Arrivages » (Bible §4.16). Pas de SQL.

Accueil (ou /produits) — bouton « 📣 Arrivages » :
compose un message WhatsApp à partager (statut / liste de diffusion) :
- « 🆕 Arrivé cette semaine : » produits créés depuis 7 jours
  (products.created_at, paginer) — « {référence} {marque} ({catégorie FR}) »,
  SANS prix (le prix se discute), max 10 lignes + « … et X autres » ;
- « 🔥 Promos en cours : » produits avec prix_promo non null —
  « {référence} : {prix_promo} MAD au lieu de {prix_vente} » (ici OUI avec
  prix : c'est le but d'une promo), max 5 lignes ;
- « 🛢️ Huiles dispo : {marques huile_moteur en stock} » ;
- « 📞 FiltroPro — {téléphone} · on livre les garages 🚚 ».
Si aucune section n'a de contenu : bouton grisé « rien de nouveau ».
Ouvre wa.me sans destinataire (l'utilisateur choisit statut ou diffusion).
Version AR du gabarit selon la langue active.
Contraintes : §4.0. Commit + push.
```

---

# 5. MODÈLE ÉCONOMIQUE

## 5.1 Comment tu gagnes aujourd'hui

Marge brute ~40 % sur les pièces (ordre de grandeur : un filtre acheté 18 MAD vendu 30). Ton levier n'est **PAS** le prix de vente — le marché le fixe. Tes trois vrais leviers :
1. **La rotation du capital** : 10 000 MAD qui tournent 12 fois/an à 40 % rapportent plus que 30 000 MAD qui tournent 3 fois.
2. **Le taux d'encaissement** : une vente non encaissée est un prêt gratuit que TU fais.
3. **Le mix** : vendre la variante Mann HU7032Z quand le client veut de la qualité, et surtout **l'huile avec le filtre** (idée 18) — marge absolue supérieure sur la même visite, même client, même geste. Un bidon à 300 MAD rapporte 4 à 6 fois la marge du filtre qu'il accompagne.

## 5.2 Comment tu gagnes demain

- **Phase 1-2 — le commerce optimisé.** La remise par segment est un **outil de volume**, pas un cadeau : −8 % au garage qui te fait 5 000 MAD/mois vaut mieux que plein tarif sur un garage qui va voir ailleurs. La promo dormant sacrifie 15 % d'une marge qui, immobile, en perdait 100 %.
- **Phase 3 — les services.** L'abonnement « réappro auto » est le premier revenu déconnecté du carton porté. Prix de lancement : 149 MAD/mois, pilote gratuit 1 mois sur tes 5 meilleurs garages. La règle absolue : **on ne fait payer que ce dont le client dépend déjà.** D'abord la dépendance (commandes faciles, rappels vidange qui nourrissent son agenda), ensuite l'abonnement. Jamais l'inverse — sinon fuite.
- **Phase 4 — la plateforme.** Listings payants de confrères sur ton catalogue, commissions sur mise en relation, licence de la donnée de compatibilité. Le commerce devient une vitrine de la plateforme, pas l'inverse.

## 5.3 Les seuils chiffrés (à respecter, pas à deviner)

| Seuil constaté | Action à déclencher |
|---|---|
| Impayés > 1 mois de bénéfice | Stop crédit aux nouveaux clients ; relances quotidiennes |
| Encaissé/vendu ≥ 85 % deux mois de suite | Passer à la phase 2 (croissance garages) |
| ≥ 30 garages actifs/mois + 6 mois d'historique | Lancer « réappro auto » 149 MAD/mois (pilote : 5 meilleurs garages, 1 mois gratuit) |
| Abonnements ≥ salaire d'un livreur (3 000-4 000 MAD/mois) | Embaucher, activer le mode livreur |
| Catalogue ≥ 500 visites/mois | Formulaire structuré de demande de prix (lead direct) ; préparer la marketplace |
| ≥ 3 confrères demandent l'app ou tes prix | Pilote marketplace dans UNE ville non couverte |

## 5.4 Pricing par segment (règle simple)

- **Comptoir** : plein tarif. C'est le client qui paye la commodité (tout de suite, devant lui).
- **Garage** : remise au palier de fidélité (0/5/8/10 % — §4.9), crédit sous plafond avec badge.
- **Gros** (confrère, revendeur) : prix négocié au cas par cas, jamais en dessous de coût + 12 %, paiement cash ou plafond strict.

---

# 6. RISQUES & GARDE-FOUS

| Risque | Ce qui se passe si tu l'ignores | Garde-fou concret |
|---|---|---|
| **Référence fausse vendue** | Un moteur endommagé = ta réputation morte dans 3 villes | Règle absolue déjà dans l'app et dans chaque spec : **jamais inventer** ; source = `applications` (données Filtron réelles) ; le parseur de commandes met en ROUGE au lieu de deviner |
| **Impayés qui explosent avec la croissance T2** | Tu grossis ton CA en finançant tes clients — faillite en pleine croissance | Limite de crédit PAR client + badge fiabilité + relances auto ; nouveau garage = plafond bas par défaut (500 MAD) qui monte avec l'historique |
| **Dépendance au fournisseur crédit** | Il change ses conditions, tu n'as pas de plan B | Suivre le ratio capital/crédit dans `/stats` ; objectif écrit : la part capital monte chaque trimestre ; le réappro prédictif dit quoi acheter en capital en priorité (les best-sellers d'abord) |
| **Toi, débordé ou malade** | Tout s'arrête — l'app ne sert à rien si tout est dans ta tête | Tout est dans Supabase, rien dans un cahier ; bilan hebdo écrit ; mode livreur préparé AVANT d'en avoir besoin ; la simplicité 1-geste rend le poste tenable par un remplaçant quelques jours |
| **Concurrent qui copie l'app** | Il a les écrans, pas la substance | L'app est copiable ; **tes données ne le sont pas** : compatibilités, historiques clients, badges de fiabilité, rappels vidange, positions Google. Chaque mois d'usage creuse le fossé. Nourris la donnée. |
| **PWA qui sert une vieille version** | Bugs fantômes, chiffres faux à l'écran | Numéro de version visible dans `/parametres` + bandeau « mise à jour disponible — recharger » ; le catalogue public `/c/` hors du service worker |
| **SEO qui ne décolle pas** | Tu as « perdu » l'effort du catalogue | Le catalogue coûte ~0 à maintenir ; même 50 visites/mois le rentabilisent ; ne JAMAIS dépendre d'un seul canal — tournées + WhatsApp + SEO en parallèle |
| **L'app devient une usine à gaz** | Toi-même tu ne l'utilises plus | La règle des 2 gestes est un critère de REFUS : toute idée qui la viole est redessinée ou jetée, y compris celles de cette Bible |

---

# 7. LE TABLEAU DE BORD — les 5 chiffres du vendredi (pendant 10 ans)

1. **Bénéfice net de la semaine** (jamais le CA — le bénéfice, base `cout_unitaire`). *C'est le moteur.* **Alerte : 2 semaines de baisse consécutives.**
2. **Encaissé ÷ vendu (%).** *C'est le carburant : en dessous, tu finances tes clients à leur place.* **Alerte : < 80 %.**
3. **Impayés : total + âge du plus vieux.** *La dette des autres envers toi.* **Alerte : total > 1 mois de bénéfice, ou une créance > 45 jours.**
4. **Valeur du stock dormant 60 j+ (MAD au prix d'achat).** *Le poids mort.* **Alerte : > 15 % de la valeur totale du stock.**
5. **Garages actifs 30 j (≥ 1 commande).** *L'avenir.* **Alerte : 2 mois sans croissance → ajouter une journée de prospection tournée.**

> Pourquoi ces cinq-là et pas d'autres : 1 = le moteur ; 2-3 = le carburant (trésorerie) ; 4 = le poids mort ; 5 = l'avenir. Le CA, le nombre de références, les visites du site : du détail. Si les 5 chiffres sont bons, tout le reste suit. Le bilan hebdo (§4.4) te les apporte chaque vendredi sans que tu les cherches.

---

# PAR OÙ JE COMMENCE LUNDI MATIN *(mis à jour le 18/07/2026 — idées 5, 18-24 en ligne ✅)*

**1. Colle le SQL `supabase/idees_bible_19_24.sql` dans l'éditeur Supabase** (2 minutes, une seule fois) puis **recharge l'app** (PWA). Sans ça, « j'ai pas », le réveil des endormis et l'avoir/parrainage restent en veille — tout le reste marche déjà.

**2. Tague tes 20 meilleurs clients** (type garage/gros + remise + limite de crédit, dans `/clients`) — 15 minutes. Tant que ce n'est pas fait, les prix automatiques et le parrainage tournent à vide.

**3. Prends les nouveaux réflexes (une semaine suffit)** : client sans sa réf → « ❌ J'ai pas » · filtre à huile vendu → tap sur l'huile suggérée · vendredi → « 📣 Arrivages » en statut WhatsApp. Et un dimanche : la fiche Google Business (idée 25 — la seule chose que l'app ne peut pas faire à ta place).

*Prochains chantiers côté Opus : promo stock dormant (§4.2), bilan hebdo (§4.4), fiche produit WhatsApp (§4.5) — puis le parseur de commandes WhatsApp (§4.6) qui ouvre la trajectoire T2. Relis le §7 chaque vendredi : cinq chiffres, dix ans.*
