// Catégories de produits : UNE seule liste pour toute l'appli (Produits, Stock, Recherche, Réception, catalogues).
// 16/11/2026 : rangées en 9 familles, comme les grands sites de pièces (Oscaro, Autodoc, Piecesauto24…) — BIBLE §8.31.
// La base n'accepte que les catégories de la table categories_produits (supabase/categories_produits.sql) :
// une nouvelle catégorie = l'ajouter ICI + au type ProductCategory + libellés (i18n.ts, CAT_FR de catalogue.ts)
// + icône (CategoryIcon) + une ligne dans categories_produits (clé serveur, pas de SQL à coller).
import type { ProductCategory } from "@/types/database";
import { translations, type TranslationKey } from "./i18n";

export type Famille = "filtres_huile" | "distribution" | "freinage" | "embrayage" | "train" | "electrique" | "essuyage" | "habitacle" | "autre";

export const FAMILLES: {
  k: Famille; cle: TranslationKey; court: string; icone: ProductCategory;
  categories: ProductCategory[];
  nouveau: ProductCategory; // type proposé pour une « Nouvelle pièce » créée en Réception
}[] = [
  {
    k: "filtres_huile", cle: "famFiltresHuile", court: "Filtres et huile", icone: "filtre_huile", nouveau: "huile_moteur",
    categories: ["filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle", "filtre_refroidissement", "filtration_autre", "huile_moteur", "accessoires_vidange", "outils_vidange"],
  },
  {
    k: "distribution", cle: "famDistribution", court: "Distribution moteur", icone: "kit_distribution", nouveau: "kit_distribution",
    categories: ["kit_distribution", "kit_distribution_pompe", "courroie_distribution", "galet_distribution", "chaine_distribution", "pompe_eau", "kit_courroie_accessoire", "courroie_accessoire", "poulie"],
  },
  {
    k: "freinage", cle: "famFreinage", court: "Freinage", icone: "disque_frein", nouveau: "plaquette_frein",
    categories: ["plaquette_frein", "disque_frein", "frein_hydraulique", "frein_tambour", "capteur_cable_frein"],
  },
  {
    k: "embrayage", cle: "famEmbrayage", court: "Embrayage · Boîte", icone: "kit_embrayage", nouveau: "kit_embrayage",
    categories: ["kit_embrayage", "accessoire_boite", "embrayage_autre"],
  },
  {
    k: "train", cle: "famTrain", court: "Direction · Suspension", icone: "amortisseur", nouveau: "amortisseur",
    categories: ["amortisseur", "suspension_essieu", "transmission", "rotule_direction", "moyeu_roulement"],
  },
  {
    k: "electrique", cle: "famElectrique", court: "Démarrage électrique", icone: "batterie", nouveau: "batterie",
    categories: ["batterie", "alternateur", "demarreur", "outil_batterie", "alterno_demarreur"],
  },
  {
    k: "essuyage", cle: "famEssuyage", court: "Essuie-glaces", icone: "essuie_glace", nouveau: "essuie_glace",
    categories: ["essuie_glace", "essuyage_phares"],
  },
  {
    k: "habitacle", cle: "famHabitacle", court: "Habitacle", icone: "leve_vitre", nouveau: "leve_vitre",
    categories: ["leve_vitre", "serrure", "verin", "commande_pedalier", "electricite_habitacle"],
  },
  { k: "autre", cle: "famAutre", court: "Autres pièces", icone: "autre", nouveau: "autre", categories: ["autre"] },
];

export const CATEGORIES: ProductCategory[] = FAMILLES.flatMap((f) => f.categories);

export const CATEGORY_KEYS: Record<ProductCategory, TranslationKey> = {
  filtre_huile: "filterOil",
  filtre_air: "filterAir",
  filtre_carburant: "filterFuel",
  filtre_habitacle: "filterCabin",
  filtre_refroidissement: "filterCooling",
  filtration_autre: "catFiltrationAutre",
  huile_moteur: "motorOil",
  accessoires_vidange: "catAccessoiresVidange",
  outils_vidange: "catOutilsVidange",
  kit_distribution: "timingKit",
  kit_distribution_pompe: "catKitPompe",
  courroie_distribution: "timingBelt",
  galet_distribution: "catGalet",
  chaine_distribution: "timingChain",
  pompe_eau: "waterPump",
  kit_courroie_accessoire: "catKitAccessoire",
  courroie_accessoire: "catCourroieAccessoire",
  poulie: "catPoulie",
  plaquette_frein: "catPlaquette",
  disque_frein: "catDisque",
  frein_hydraulique: "catFreinHydraulique",
  frein_tambour: "catTambour",
  capteur_cable_frein: "catCapteurFrein",
  kit_embrayage: "catEmbrayage",
  accessoire_boite: "catAccessoireBoite",
  embrayage_autre: "catEmbrayageAutre",
  amortisseur: "catAmortisseur",
  suspension_essieu: "catSuspension",
  transmission: "catTransmission",
  rotule_direction: "catRotule",
  moyeu_roulement: "catMoyeu",
  batterie: "catBatterie",
  alternateur: "catAlternateur",
  demarreur: "catDemarreur",
  outil_batterie: "catOutilBatterie",
  alterno_demarreur: "catAlternoDemarreur",
  essuie_glace: "catEssuieGlace",
  essuyage_phares: "catEssuyagePhares",
  leve_vitre: "catLeveVitre",
  serrure: "catSerrure",
  verin: "catVerin",
  commande_pedalier: "catCommande",
  electricite_habitacle: "catElectricite",
  autre: "other",
};

/** Famille d'une catégorie (inconnue → « autre »). */
export const familleDe = (c?: string | null): Famille =>
  FAMILLES.find((f) => (f.categories as string[]).includes(c ?? ""))?.k ?? "autre";

/** Pièce de distribution moteur (kit, courroie, galet, chaîne, pompe à eau, accessoire, poulie). */
export const estDistribution = (c?: string | null) => familleDe(c) === "distribution";

/** Filtre Filtron (les 5 types) : photos MANN+HUMMEL, liens « Équivalent Mann/Wix », jamais créé à la main. */
export const estFiltre = (c?: string | null) => !!c && c.startsWith("filtre_");

/** Photo cherchée chez MANN+HUMMEL (Scene7) : filtres Filtron, autres filtrations (UE730…) et « autre ». */
export const photoMann = (c?: string | null) => estFiltre(c) || c === "filtration_autre" || c === "autre";

/** Catégories qu'on peut créer à la main en Réception (« Nouvelle pièce ») : tout sauf les filtres Filtron. */
export const creables = (f: Famille): ProductCategory[] =>
  (FAMILLES.find((x) => x.k === f)?.categories ?? ["autre"]).filter((c) => !estFiltre(c));

/** Libellé français (pages publiques, noms de fiches). */
export const libelleCategorie = (c?: string | null) =>
  (c && CATEGORY_KEYS[c as ProductCategory] ? translations.fr[CATEGORY_KEYS[c as ProductCategory]] : "Pièce auto");

/** Kit / courroie de distribution : case « nombre de dents / largeur » (ex. 141/25 = 141 dents, 25 mm). Gardée dans
 *  products.dimensions (pour les filtres, cette colonne contient les dimensions Filtron) — BIBLE §8.33. */
export const AVEC_DENTS: ProductCategory[] = ["kit_distribution", "kit_distribution_pompe", "courroie_distribution"];
export const avecDents = (c?: string | null) => !!c && (AVEC_DENTS as string[]).includes(c);
/** « 141 / 25 », « 141x25 », « 141-25 » → « 141/25 » (vide → ""). */
export const normDents = (s?: string | null) => (s ?? "").trim().replace(/\s*[/x×-]\s*/i, "/").replace(/\s+/g, "").replace(",", ".");
/** Format attendu : dents/largeur, ex. 141/25 ou 123/27 (largeur avec une décimale permise : 137/25.4). */
export const dentsValides = (s: string) => /^\d{2,3}\/\d{1,2}(\.\d)?$/.test(s);
export const MSG_DENTS = "Nombre de dents / largeur : écris les dents puis la largeur, par exemple 141/25 ou 123/27.";

/** Valeur d'un filtre « toute la famille » dans les menus (« famille:distribution »). */
export const FILTRE_FAMILLE = "famille:";
export const correspondCategorie = (filtre: string, c: string) =>
  !filtre || (filtre.startsWith(FILTRE_FAMILLE) ? familleDe(c) === filtre.slice(FILTRE_FAMILLE.length) : c === filtre);
