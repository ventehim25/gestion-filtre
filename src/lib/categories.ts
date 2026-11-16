// Catégories de produits : UNE seule liste pour toute l'appli (Produits, Stock, Recherche, catalogues).
// 16/11/2026 : + distribution (chaîne, courroie, pompe à eau, kit) — demande de l'utilisateur, BIBLE §8.30.
// La base n'accepte que ces valeurs (contrainte products_categorie_check, supabase/categories_distribution.sql).
import type { ProductCategory } from "@/types/database";
import type { TranslationKey } from "./i18n";

export const CATEGORIES: ProductCategory[] = [
  "filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle", "filtre_refroidissement",
  "huile_moteur",
  "chaine_distribution", "courroie_distribution", "pompe_eau", "kit_distribution",
  "autre",
];

export const CATEGORY_KEYS: Record<ProductCategory, TranslationKey> = {
  filtre_huile: "filterOil",
  filtre_air: "filterAir",
  filtre_carburant: "filterFuel",
  filtre_habitacle: "filterCabin",
  filtre_refroidissement: "filterCooling",
  huile_moteur: "motorOil",
  chaine_distribution: "timingChain",
  courroie_distribution: "timingBelt",
  pompe_eau: "waterPump",
  kit_distribution: "timingKit",
  autre: "other",
};

export const DISTRIBUTION: ProductCategory[] = ["chaine_distribution", "courroie_distribution", "pompe_eau", "kit_distribution"];

/** Pièce de distribution (pas un filtre) : autres marques, pas de photo MANN, pas d'équivalent Mann/Wix. */
export const estDistribution = (c?: string | null) => !!c && (DISTRIBUTION as string[]).includes(c);

/** Filtre (photos MANN+HUMMEL, liens « Équivalent Mann/Wix »). */
export const estFiltre = (c?: string | null) => !!c && c.startsWith("filtre_");
