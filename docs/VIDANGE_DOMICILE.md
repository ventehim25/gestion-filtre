# 🛢️ VIDANGE À DOMICILE EN TRIPORTEUR — recherche & idées clés

> Annexe stratégique de la [BIBLE](BIBLE.md). Le projet : **la vidange (huile + filtres + niveaux) chez le client, faite en triporteur**, dans la région **Tanger / Tétouan**.
>
> Pourquoi ça colle à FiltroPro : tu vends déjà les **filtres** et l'**huile** (Castrol, Motul, Total, Mannol, Fanfaro, Pemko, Kansler). La vidange à domicile est la **sortie de stock la plus rentable** — tu captures toute la chaîne (pièce + huile + main-d'œuvre) sur un seul ticket, avec l'app, le catalogue et les compatibilités que tu possèdes déjà.
>
> **Dernière mise à jour : 23/10/2026.**

---

# 1. RECHERCHE CONCURRENTIELLE — Tanger / Tétouan

## 1.1 Le paysage réel

| Acteur | Modèle | Tanger/Tétouan | Vidange à domicile | Prix affichés | Faille à exploiter |
|---|---|---|---|---|---|
| **Sparta.ma** | Mécano mobile national (fourgon) | ✅ (réseau national) | ✅ | ❌ « devis » | Généraliste, national, pas spécialiste filtre/huile |
| **Gofit (MT&S)** | « Atelier mobile » national | ✅ Tanger | ✅ | ❌ | Couvre tout, expert de rien |
| **Fixiha** | Marketplace (≈15 mécanos à Tanger) | ✅ Tanger | Parfois | ❌ devis | Simple annuaire WhatsApp, ne **fait** pas le service |
| **TAG AUTO** | Garage agréé + service à domicile | ✅ Tanger | ✅ | ❌ | Basé garage, marque nationale |
| **Samel Auto** | Garage classique | Atelier fixe | ❌ | ❌ | Tu viens à eux |
| **Naqiago / Cymtas / Eco Wash** | **Lavage** auto à domicile 7j/7 | ✅ Tanger | — (lavage) | Parfois | **Preuve que le à-domicile marche déjà à Tanger** |

## 1.2 Les 3 enseignements qui comptent

1. **Le à-domicile est déjà validé à Tanger.** Le lavage auto à domicile explose (Naqiago, Cymtas, Eco Wash + presse sur le « lavage mobile »). Le client du Nord accepte déjà qu'on s'occupe de sa voiture chez lui → **risque d'adoption faible**, le marché est déjà éduqué.
2. **Personne n'est spécialiste vidange en triporteur.** Les mobiles existants sont des **généralistes en fourgon** (Sparta, Gofit) ou des **annuaires** (Fixiha). Aucun n'est *hyper-local + spécialiste filtre/huile + triporteur*. **C'est l'espace blanc.**
3. **Aucun n'affiche de prix** — tous en « devis ». Annoncer un **prix ferme et transparent** (« Vidange Clio = X MAD à ta porte, tout compris ») casse le marché sur la confiance.

**Sources :** Sparta.ma · Gofit.ma/atelier-mobile · Fixiha.app/tanger · TagAuto.ma · SamelAuto.ma · Naqiago.com · tanger-experience.com (« lavage mobile »).

---

# 2. IDÉES CLÉS DU PROJET

## 2.1 Le positionnement (la phrase unique)
> **« La vidange chez toi en 20 minutes, prix affiché, sans bouger ta voiture. »**

Pas un garage mobile qui fait tout mal — **le spécialiste de la vidange**. La spécialisation = rapidité, prix bas, zéro négociation.

## 2.2 Pourquoi le triporteur est un atout stratégique (pas un choix par défaut)
- **Il passe partout** : médina de Tétouan, ruelles de Tanger, quartiers denses où un fourgon ne rentre pas → clientèle que Sparta/Gofit **ne peuvent pas** atteindre.
- **Coût dérisoire** : ~15–25 000 MAD vs un fourgon aménagé. Tu peux en avoir **3 avant qu'un concurrent en ait un**.
- **Marketing roulant** : un triporteur floqué **FiltroPro** doré = pub gratuite toute la journée. « Le triporteur de la vidange ».
- **Contrainte assumée** : il ne fait QUE vidange + entretien léger (huile, filtres, niveaux, essuie-glaces, batterie). C'est une **force** : pas d'éparpillement.

## 2.3 L'avantage imbattable = FiltroPro existe déjà
Un mécano mobile achète ses filtres/huile **au détail**. Toi :
- Tu **possèdes déjà le stock** (filtres + huile) acheté en **gros** → marge pièce + huile + main-d'œuvre cumulée sur un seul ticket.
- Tu as l'**app, le catalogue, les prix, la base de compatibilités `applications`** → tu sais instantanément quel filtre + quelle huile pour chaque voiture.
- Tu as les **garages clients + 300 contacts WhatsApp** → acquisition gratuite.
- Le triporteur = **3ᵉ canal de sortie du stock** (comptoir → livraison garages → **vidange particuliers**), le plus rentable.

## 2.4 L'offre (prix affichés = l'arme)
Des **packs fermes**, affichés, sans négociation — l'inverse de tous les concurrents :

| Pack | Contenu | Logique |
|---|---|---|
| **Essentielle** | Huile standard + filtre huile + contrôle niveaux | Prix d'appel bas, visible |
| **Confort** | Huile semi-synthèse + filtre huile + **filtre air** | Kit véhicule (Bible §4.13) à domicile |
| **Premium** | Huile 100% synthèse + huile + air + habitacle | Marge absolue max |
| **+ options** | Essuie-glaces, batterie, filtre carburant | Vente croisée 1 tap |

Ordre de grandeur d'un ticket (Maroc) : huile ~200–400 + filtre ~30–60 + main-d'œuvre ~50–100 → **panier ~300–550 MAD**, dont une bonne part de marge puisque tu fournis tout. *(à caler sur tes vrais coûts d'achat.)*

## 2.5 Intégration dans l'app (80% du code existe déjà)
- **RDV WhatsApp** : le client envoie plaque/modèle → l'app trouve filtre+huile compatibles (`applications`) → propose le pack + le créneau. Zéro devinette de référence.
- **Rappel vidange auto** (Bible §4.10, **déjà en base** `rappels_vidange`) : 5 mois après, WhatsApp « ta Clio est due, je passe mardi ? » → le triporteur transforme le rappel en revenu direct.
- **Tournée optimisée** (`/tournees` existe, carte Leaflet) : regrouper les RDV vidange par quartier/jour, comme les livraisons garages.
- **Fidélité / carnet d'entretien digital** du client dans l'app (« 5ᵉ vidange offerte »).

## 2.6 Acquisition (coût quasi nul)
- **Statut WhatsApp** : « 🛢️ Vidange à ta porte, prix affiché ».
- **Parrainage** (Bible §4.15, déjà codé) : « amène un voisin = −50 MAD ».
- **Flottes / entreprises / copropriétés** : un matin devant un immeuble ou une société = 5 voitures d'affilée. Les **contrats de flotte** (taxis, livreurs, administrations) = le revenu le plus stable du métier.
- **Google Business** (Bible §4.25) — les gens cherchent déjà « auto à domicile Tanger » (habitués par le lavage).

## 2.7 Risques & garde-fous
| Risque | Garde-fou |
|---|---|
| **Huile usagée** (écologie/loi) | Bac de récupération + collecteur agréé → **argument marketing vert** (comme Spiffy) |
| **Pluie / hiver au Nord** | Auvent sur le triporteur ; créneaux couverts (parkings d'immeuble) |
| **« Bâclé » perçu** | Prix affiché + **photo avant/après** + carnet digital + garantie écrite = confiance (personne ne le fait) |
| **Copie par Sparta/Gofit** | Ta donnée + ton stock gros + ton ancrage quartier ne se copient pas |

## 2.8 Démarrage petit (test en 1 mois)
1 triporteur, 2–3 packs, **une** zone (un quartier dense de Tétouan **ou** Tanger). Prix affichés sur WhatsApp. **10 vidanges** pour mesurer le temps réel/voiture et le vrai coût. Puis industrialiser avec l'app + un 2ᵉ triporteur.

---

# 3. INSPIRATIONS INTERNATIONALES (à voler)

## 3.1 La référence n°1 — Spiffy (USA)
Le modèle le plus proche : **vidange + lavage + entretien à domicile via app**, dashboard « prochaine vidange », **récupération écologique de l'huile usagée** (aspiration moteur).
- 🔗 https://www.getspiffy.com/spiffy-app · vidange verte : https://www.prnewswire.com/news-releases/spiffy-launches-green-mobile-oil-change-coast-to-coast-300548105.html
- **À voler :** dashboard « prochaine vidange », argument huile récupérée, multi-service sur une visite.

## 3.2 Marchés émergents (les plus proches : parc ancien, prix bas, méfiance)
- **GoMechanic (Inde)** — doorstep, **prix affichés « −40% vs concessionnaire »**, forfaits clairs. 🔗 https://gomechanic.in/delhi
  - ⚠️ **Leçon inverse :** a explosé en grandissant trop vite → reste **lean** (philosophie de la Bible).
- **Pitstop (Inde)** — entretien de routine **chez le client**, inspection + ventes additionnelles décidées par le client. 🔗 https://pitstop.co.in/
  - **À voler :** le forfait à prix affiché + l'inspection qui remonte des ventes (ta pastille « ce véhicule prend aussi… »).

## 3.3 Afrique (contexte le plus similaire : WhatsApp, parc vieux, confiance à bâtir)
- **Carviva (Nigeria)** — doorstep multi-service : vidange + carburant + lavage + dépannage.
- **Mecho Autotech (Nigeria)** — techniciens certifiés à domicile, passé à l'échelle.
- **Drivva (Nigeria)** — carnet d'entretien digital + réservation.
- **Flickwheel (Nigeria)** — **financement** de l'entretien (paiement en plusieurs fois pour gros paniers).
- 🔗 https://www.businesstechafrica.co.za/entrepreneurship/start-ups/2026/08/23/ (Drivva) · https://www.techinafrica.com/flickwheel-revolutionizing-vehicle-maintenance-in-nigeria/

## 3.4 Spécialistes « rapidité » (pour l'offre + les scripts de vente)
- **YourMechanic** — https://www.yourmechanic.com/ (devis en ligne instantané)
- **Wrench** — https://www.wrench.com/ (mobile, orienté **flottes** = revenu stable)
- **Take 5 / Valvoline Instant Oil Change / Jiffy Lube** — « vidange 15 min sans sortir de la voiture » : packs, upsell, promesse de temps.

## 3.5 Les 3 réflexes communs à tous les gagnants
1. **Prix affiché + promesse de temps** (« X MAD, 20 min ») — aucun concurrent marocain ne le fait.
2. **Dashboard / carnet d'entretien** qui rappelle la prochaine vidange → revenu récurrent auto (**déjà en base**, Bible §4.10).
3. **Argument écologique** sur l'huile usagée récupérée (la marque de Spiffy).

---

# 4. PROCHAINES ÉTAPES

1. Choisir **la zone de test** (un quartier dense de Tétouan ou Tanger).
2. Définir les **3 packs + prix fermes** (à partir de tes coûts d'achat réels).
3. Acheter/aménager **1 triporteur** (+ bac huile usagée, outillage vidange).
4. Brancher la **prise de RDV WhatsApp** sur l'app (réutilise `applications` + `rappels_vidange`).
5. **10 vidanges test** → mesurer temps/voiture, coût réel, marge réelle.
6. *(à faire)* **Mini business-plan chiffré** : coûts triporteur + matériel, seuil de rentabilité, nombre de vidanges/jour.

*Document généré avec Claude Code. Annexe de la [BIBLE](BIBLE.md) — à relire et à mettre à jour quand le test terrain donne de vrais chiffres.*
