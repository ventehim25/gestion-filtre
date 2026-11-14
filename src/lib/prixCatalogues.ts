// 4 catalogues de prix (BIBLE §8.18) : mêmes articles, prix différents selon le type de client.
//   garage      = garages et stations : le prix de vente saisi (prix de base, inchangé)
//   particulier = prix garage + 30 %  · location = + 15 %  · magasin (de pièces) = − 5 %
// Les pourcentages sont dans la table reglages (modifiables dans Paramètres) ; un article peut
// avoir un prix corrigé à la main (colonnes prix_particulier / prix_location / prix_magasin).
import { supabase } from "./supabase";
// (pas d’import de catalogue.ts : il importe ce fichier ; la clé garage = TARIF_KEY de catalogue.ts)

export type TypeCatalogue = "garage" | "particulier" | "location" | "magasin";
export type Pourcentages = Record<Exclude<TypeCatalogue, "garage">, number>;
export type PrixManuels = { prix_particulier?: number | null; prix_location?: number | null; prix_magasin?: number | null };

export const POURCENTAGES_DEFAUT: Pourcentages = { particulier: 30, location: 15, magasin: -5 };

// Clé du lien de chaque catalogue (/tarif?k=…). « garages2026 » reste le lien déjà envoyé aux garages.
export const CATALOGUES: { type: TypeCatalogue; libelle: string; court: string; cle: string }[] = [
  { type: "garage", libelle: "Garages et stations", court: "Garages", cle: "garages2026" },
  { type: "particulier", libelle: "Particuliers", court: "Particuliers", cle: "particuliers-r7k2" },
  { type: "location", libelle: "Location de voitures", court: "Location", cle: "location-m4x8" },
  { type: "magasin", libelle: "Magasins de pièces", court: "Magasins", cle: "magasins-p9d3" },
];

export const typeDeCle = (k: string | null | undefined): TypeCatalogue | null => CATALOGUES.find((c) => c.cle === k)?.type ?? null;
export const infoCatalogue = (t: TypeCatalogue) => CATALOGUES.find((c) => c.type === t) ?? CATALOGUES[0];
export const lienCatalogue = (t: TypeCatalogue) => `https://gestion-filtre.vercel.app/tarif?k=${infoCatalogue(t).cle}`;

// Type de client (fiche client) → catalogue. « comptoir » garde le prix garage (comme avant) ;
// « gros » (ancien type grossiste) = magasin de pièces.
export function catalogueDuClient(type: string | null | undefined): TypeCatalogue {
  if (type === "particulier" || type === "location" || type === "magasin") return type;
  if (type === "gros") return "magasin";
  return "garage";
}

const COLONNE: Record<Exclude<TypeCatalogue, "garage">, keyof PrixManuels> = {
  particulier: "prix_particulier", location: "prix_location", magasin: "prix_magasin",
};

/** Prix d'un article dans un catalogue : prix corrigé à la main s'il existe, sinon prix garage ± pourcentage, arrondi au dirham. */
export function prixPour(type: TypeCatalogue, base: number, manuels: PrixManuels | null | undefined, pct: Pourcentages): number {
  if (type === "garage" || !(base > 0)) return base;
  const manuel = manuels?.[COLONNE[type]];
  if (manuel != null && manuel > 0) return Number(manuel);
  return Math.round(base * (1 + (pct[type] ?? POURCENTAGES_DEFAUT[type]) / 100));
}

/** Pourcentages enregistrés (table reglages) ; ceux de départ si la table n'existe pas encore. */
export async function chargerPourcentages(): Promise<Pourcentages> {
  try {
    const { data, error } = await supabase.from("reglages").select("valeur").eq("cle", "pourcentages_catalogues").maybeSingle();
    if (error || !data) return POURCENTAGES_DEFAUT;
    return { ...POURCENTAGES_DEFAUT, ...(data.valeur as Partial<Pourcentages>) };
  } catch { return POURCENTAGES_DEFAUT; }
}

export async function enregistrerPourcentages(p: Pourcentages): Promise<string | null> {
  const { error } = await supabase.from("reglages").upsert({ cle: "pourcentages_catalogues", valeur: p, modifie_le: new Date().toISOString() });
  return error ? error.message : null;
}
