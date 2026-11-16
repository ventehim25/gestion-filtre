// Marques gérées comme « variantes de marque » (prix/stock propres) : filtres, huile, distribution, freinage…
// Les autres équivalences (~23 000) sont des codes OE constructeur : utiles à la recherche seulement.
import { supabase } from "./supabase";
import { familleDe, estFiltre, type Famille } from "./categories";

// Marques de départ. 16/11/2026 : + SIMI, Meat & Doria, Gold Filter, Tech Filter, Fuji, Kraftstofffilter
// (demande de l'utilisateur, marques vues en magasin ; « Kraftstofffilter » est le nom écrit sur ses boîtes).
export const FILTER_BRANDS = ["Filtron", "Flag", "Filtrex", "Mann", "Wix", "Bosch", "Champion", "Purflux", "Mecafilter", "Mahle", "Hengst", "UFI", "Fram", "Misfat", "Wunder", "SIMI", "Meat & Doria", "Gold Filter", "Tech Filter", "Fuji", "Kraftstofffilter"];

// Marques de DISTRIBUTION (chaîne, courroie, pompe à eau, kit) — 16/11/2026, demande de l'utilisateur
// (« Gates, Dolz, Continental, Dayco, Eurorepar, Renault maison, PSA… ») + grandes marques connues du métier.
// « Renault Origine » / « PSA Origine » = pièce d'origine constructeur : PAS « Renault » / « Peugeot » tout court,
// ces noms-là sont déjà pris par ≈ 1 700 codes constructeur (OE) importés de Filtron (BIBLE §8.30).
export const DISTRIBUTION_BRANDS = ["Gates", "Dayco", "Continental", "Dolz", "SKF", "INA", "Febi", "Valeo", "Bosch", "Aisin", "NTN-SNR", "Metelli", "Graf", "Hepu", "Saleri SIL", "Airtex", "Optibelt", "Iwis", "Ruville", "Eurorepar", "Motrio", "Renault Origine", "PSA Origine"];

// Marques par famille de pièces (BIBLE §8.31) — noms de marques seulement, aucune référence créée.
// Vérifié le 16/11 : aucun de ces noms n'est déjà porté par des codes constructeur (OE) de la base
// (« Boge » volontairement absent : 27 codes OE portent ce nom).
const ORIGINE = ["Eurorepar", "Motrio", "Renault Origine", "PSA Origine"];
export const OIL_BRANDS = ["Castrol", "Total", "Motul", "Mannol", "Liqui Moly", "Shell", "Mobil", "Elf", "Petronas", "Fanfaro", "Pemko", "Kansler"];
export const FREINAGE_BRANDS = ["Bosch", "TRW", "Brembo", "Ferodo", "ATE", "Textar", "Jurid", "Valeo", "Delphi", "Mintex", "Bendix", "ICER", ...ORIGINE];
export const EMBRAYAGE_BRANDS = ["Valeo", "LuK", "Sachs", "Exedy", "Aisin", "SKF", "INA", "Febi", ...ORIGINE];
export const TRAIN_BRANDS = ["Monroe", "Sachs", "KYB", "Bilstein", "TRW", "Lemförder", "Moog", "Delphi", "SKF", "FAG", "NTN-SNR", "Febi", "Meyle", "GSP", "Optimal", "Ruville", ...ORIGINE];
export const ELECTRIQUE_BRANDS = ["Varta", "Bosch", "Exide", "Fulmen", "Tudor", "Electra", "Valeo", "Denso", "Magneti Marelli", "Hella", ...ORIGINE];
export const ESSUYAGE_BRANDS = ["Bosch", "Valeo", "Champion", "Denso", "Hella", ...ORIGINE];
export const HABITACLE_BRANDS = ["Valeo", "Bosch", "Febi", "Magneti Marelli", "Hella", "Stabilus", "Topran", ...ORIGINE];

const PAR_FAMILLE: Record<Famille, string[]> = {
  filtres_huile: FILTER_BRANDS, distribution: DISTRIBUTION_BRANDS, freinage: FREINAGE_BRANDS, embrayage: EMBRAYAGE_BRANDS,
  train: TRAIN_BRANDS, electrique: ELECTRIQUE_BRANDS, essuyage: ESSUYAGE_BRANDS, habitacle: HABITACLE_BRANDS, autre: FILTER_BRANDS,
};
/** Marques de départ du métier d'une catégorie (huile moteur : marques d'huile). */
export const marquesBase = (categorie?: string | null): string[] =>
  categorie === "huile_moteur" ? OIL_BRANDS : PAR_FAMILLE[familleDe(categorie)];

// Toutes les marques de départ (sans doublon) : toutes reconnues comme « variantes de marque »
export const DEPART = [FILTER_BRANDS, OIL_BRANDS, DISTRIBUTION_BRANDS, FREINAGE_BRANDS, EMBRAYAGE_BRANDS, TRAIN_BRANDS, ELECTRIQUE_BRANDS, ESSUYAGE_BRANDS, HABITACLE_BRANDS]
  .flat().filter((m, i, a) => a.indexOf(m) === i);

/** Liste de marques à proposer pour une pièce : celles de son métier + celles ajoutées par l'utilisateur,
 *  et toujours la marque déjà choisie (sinon le menu l'afficherait vide). */
export function marquesPour(toutes: string[], categorie?: string | null, actuelle?: string | null): string[] {
  const ajoutees = toutes.filter((m) => !DEPART.some((d) => d.toLowerCase() === m.toLowerCase()));
  const out = [...marquesBase(categorie), ...ajoutees];
  if (actuelle && actuelle !== "__new__" && actuelle !== "__ajout__" && !out.some((m) => m.toLowerCase() === actuelle.toLowerCase())) out.push(actuelle);
  return out;
}

/** Marque proposée pour une nouvelle variante : Flag pour un filtre, sinon la 1re marque du métier ≠ marque de la fiche. */
export const marqueVarianteDefaut = (categorie?: string | null, marque?: string | null) =>
  estFiltre(categorie) ? "Flag" : (marquesBase(categorie).find((m) => m !== marque) ?? "Bosch");

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
  cache ??= lireStockees().then((s) => fusion(DEPART, s)).catch(() => DEPART);
  return cache;
}

/** Ajoute une marque (si elle n'existe pas déjà, majuscules/minuscules ignorées) et renvoie la liste à jour. */
export async function ajouterMarque(nom: string): Promise<{ marques: string[]; marque?: string; erreur?: string }> {
  const propre = nom.trim().replace(/\s+/g, " ");
  if (propre.length < 2 || propre.length > 30) return { marques: await chargerMarques(), erreur: "Écris le nom de la marque (2 à 30 caractères)." };
  if (/^(oe|__new__)$/i.test(propre)) return { marques: await chargerMarques(), erreur: "Ce nom est réservé." };
  const stockees = await lireStockees().catch(() => [] as string[]);
  const toutes = fusion(DEPART, stockees);
  const deja = toutes.find((m) => m.toLowerCase() === propre.toLowerCase());
  if (deja) { cache = Promise.resolve(toutes); return { marques: toutes, marque: deja }; }
  // « Renault », « Peugeot »… sont déjà les noms des codes constructeur (OE) importés : en faire une marque
  // mélangerait des centaines de codes OE avec les vraies variantes (Produits, Vente). → « Renault Origine ».
  const { count: nbOe } = await supabase.from("equivalences").select("id", { count: "exact", head: true }).ilike("marque", propre);
  if ((nbOe ?? 0) > 30) return { marques: toutes, erreur: `« ${propre} » est déjà le nom de ${nbOe} codes constructeur (OE). Écris par exemple « ${propre} Origine ».` };
  const { error } = await supabase.from("reglages").upsert({ cle: CLE, valeur: [...stockees, propre] }, { onConflict: "cle" });
  if (error) return { marques: toutes, erreur: `Marque non enregistrée : ${error.message}` };
  const nouvelles = fusion(DEPART, [...stockees, propre]);
  cache = Promise.resolve(nouvelles);
  return { marques: nouvelles, marque: propre };
}
