// Marques de filtres gérées comme « variantes de marque » (prix/stock propres).
// Les autres équivalences (~23 000) sont des codes OE constructeur : utiles à la recherche seulement.
import { supabase } from "./supabase";

// Marques de départ. 16/11/2026 : + SIMI, Meat & Doria, Gold Filter, Tech Filter, Fuji, Kraftstofffilter
// (demande de l'utilisateur, marques vues en magasin ; « Kraftstofffilter » est le nom écrit sur ses boîtes).
export const FILTER_BRANDS = ["Filtron", "Flag", "Filtrex", "Mann", "Wix", "Bosch", "Champion", "Purflux", "Mecafilter", "Mahle", "Hengst", "UFI", "Fram", "Misfat", "Wunder", "SIMI", "Meat & Doria", "Gold Filter", "Tech Filter", "Fuji", "Kraftstofffilter"];

// Marques ajoutées par l'utilisateur lui-même (« ➕ Nouvelle marque… » en Réception et en Produits) :
// gardées dans la base, réglage « marques_filtres » (table reglages), donc partout et sur tous les appareils.
const CLE = "marques_filtres";
const fusion = (a: string[], b: string[]) => {
  const out = [...a];
  for (const m of b) if (!out.some((x) => x.toLowerCase() === m.toLowerCase())) out.push(m);
  return out;
};
const lireStockees = async (): Promise<string[]> => {
  const { data } = await supabase.from("reglages").select("valeur").eq("cle", CLE).maybeSingle();
  const v = (data as { valeur?: unknown } | null)?.valeur;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
};

let cache: Promise<string[]> | null = null;
/** Marques de départ + marques ajoutées (lues une fois par page). En cas d'erreur : les marques de départ. */
export function chargerMarques(): Promise<string[]> {
  cache ??= lireStockees().then((s) => fusion(FILTER_BRANDS, s)).catch(() => FILTER_BRANDS);
  return cache;
}

/** Ajoute une marque (si elle n'existe pas déjà, majuscules/minuscules ignorées) et renvoie la liste à jour. */
export async function ajouterMarque(nom: string): Promise<{ marques: string[]; marque?: string; erreur?: string }> {
  const propre = nom.trim().replace(/\s+/g, " ");
  if (propre.length < 2 || propre.length > 30) return { marques: await chargerMarques(), erreur: "Écris le nom de la marque (2 à 30 caractères)." };
  if (/^(oe|__new__)$/i.test(propre)) return { marques: await chargerMarques(), erreur: "Ce nom est réservé." };
  const stockees = await lireStockees().catch(() => [] as string[]);
  const toutes = fusion(FILTER_BRANDS, stockees);
  const deja = toutes.find((m) => m.toLowerCase() === propre.toLowerCase());
  if (deja) { cache = Promise.resolve(toutes); return { marques: toutes, marque: deja }; }
  const { error } = await supabase.from("reglages").upsert({ cle: CLE, valeur: [...stockees, propre] }, { onConflict: "cle" });
  if (error) return { marques: toutes, erreur: `Marque non enregistrée : ${error.message}` };
  const nouvelles = fusion(FILTER_BRANDS, [...stockees, propre]);
  cache = Promise.resolve(nouvelles);
  return { marques: nouvelles, marque: propre };
}
