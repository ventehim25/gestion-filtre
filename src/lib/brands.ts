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
export const FREINAGE_BRANDS = ["Bosch", "TRW", "Metelli", "Brembo", "Ferodo", "ATE", "Textar", "Jurid", "Valeo", "Delphi", "Mintex", "Bendix", "ICER", ...ORIGINE];
export const EMBRAYAGE_BRANDS = ["Valeo", "LuK", "Sachs", "Exedy", "Aisin", "SKF", "INA", "Febi", ...ORIGINE];
export const TRAIN_BRANDS = ["Monroe", "Sachs", "KYB", "Bilstein", "TRW", "Lemförder", "Moog", "Delphi", "SKF", "FAG", "NTN-SNR", "Febi", "Meyle", "GSP", "Optimal", "Ruville", ...ORIGINE];
export const ELECTRIQUE_BRANDS = ["Varta", "Bosch", "Exide", "Fulmen", "Tudor", "Electra", "Valeo", "Denso", "Magneti Marelli", "Hella", ...ORIGINE];
export const ESSUYAGE_BRANDS = ["Bosch", "Valeo", "Champion", "Denso", "Hella", ...ORIGINE];
export const HABITACLE_BRANDS = ["Valeo", "Bosch", "Febi", "Magneti Marelli", "Hella", "Stabilus", "Topran", ...ORIGINE];

// « Métier » d'une pièce = sa famille, sauf l'huile moteur qui a ses propres marques (Castrol, Total…)
export type Metier = Famille | "huile";
export const metierDe = (categorie?: string | null): Metier => (categorie === "huile_moteur" ? "huile" : familleDe(categorie));

const PAR_METIER: Record<Metier, string[]> = {
  filtres_huile: FILTER_BRANDS, huile: OIL_BRANDS, distribution: DISTRIBUTION_BRANDS, freinage: FREINAGE_BRANDS, embrayage: EMBRAYAGE_BRANDS,
  train: TRAIN_BRANDS, electrique: ELECTRIQUE_BRANDS, essuyage: ESSUYAGE_BRANDS, habitacle: HABITACLE_BRANDS, autre: FILTER_BRANDS,
};
/** Marques de départ du métier d'une catégorie (huile moteur : marques d'huile). */
export const marquesBase = (categorie?: string | null): string[] => PAR_METIER[metierDe(categorie)];

// Toutes les marques de départ (sans doublon) : toutes reconnues comme « variantes de marque »
export const DEPART = [FILTER_BRANDS, OIL_BRANDS, DISTRIBUTION_BRANDS, FREINAGE_BRANDS, EMBRAYAGE_BRANDS, TRAIN_BRANDS, ELECTRIQUE_BRANDS, ESSUYAGE_BRANDS, HABITACLE_BRANDS]
  .flat().filter((m, i, a) => a.indexOf(m) === i);

// Marques ajoutées par l'utilisateur lui-même (« ➕ Nouvelle marque… » en Réception et en Produits) : gardées dans la
// base, réglage « marques_filtres » (table reglages), donc partout et sur tous les appareils. Depuis le 16/11/2026 (BIBLE
// §8.31), chaque marque ajoutée est RATTACHÉE au métier de la pièce où elle a été ajoutée ({ nom, metiers }) : Valvoline
// (huile) n'apparaît plus dans Freinage. Ancien format (simple texte) = sans métier = proposée partout.
type Ajoutee = { nom: string; metiers: Metier[] };
const CLE = "marques_filtres";
const egal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const lireStockees = async (): Promise<Ajoutee[]> => {
  const { data } = await supabase.from("reglages").select("valeur").eq("cle", CLE).maybeSingle();
  const v = (data as { valeur?: unknown } | null)?.valeur;
  if (!Array.isArray(v)) return [];
  return v.flatMap((x): Ajoutee[] => {
    if (typeof x === "string") return x.trim() ? [{ nom: x.trim(), metiers: [] }] : [];
    const o = x as { nom?: unknown; metiers?: unknown } | null;
    if (!o || typeof o.nom !== "string" || !o.nom.trim()) return [];
    return [{ nom: o.nom.trim(), metiers: Array.isArray(o.metiers) ? o.metiers.filter((m): m is Metier => typeof m === "string") : [] }];
  });
};
// Métiers des marques ajoutées (rempli au chargement) : utilisé par marquesPour pour ne proposer que les bonnes
let ajoutees: Ajoutee[] = [];
const noms = (liste: Ajoutee[]) => liste.reduce((out, a) => (out.some((m) => egal(m, a.nom)) ? out : [...out, a.nom]), [...DEPART]);

/** Liste de marques à proposer pour une pièce : celles de son métier + celles que l'utilisateur a ajoutées POUR ce
 *  métier (ou sans métier, ancien format), et toujours la marque déjà choisie (sinon le menu l'afficherait vide).
 *  `toutes` (liste chargée par la page) garde les marques ajoutées sur un autre appareil depuis le chargement. */
export function marquesPour(toutes: string[], categorie?: string | null, actuelle?: string | null): string[] {
  const metier = metierDe(categorie);
  const out = [...marquesBase(categorie)];
  const ajouter = (m: string) => { if (!out.some((x) => egal(x, m))) out.push(m); };
  for (const a of ajoutees) if (a.metiers.length === 0 || a.metiers.includes(metier)) ajouter(a.nom);
  // Marque connue de la page mais absente de la liste du module (ne devrait pas arriver) : proposée par prudence
  for (const m of toutes) if (!DEPART.some((d) => egal(d, m)) && !ajoutees.some((a) => egal(a.nom, m))) ajouter(m);
  if (actuelle && actuelle !== "__new__" && actuelle !== "__ajout__") ajouter(actuelle);
  return out;
}

/** Marque proposée pour une nouvelle variante : Flag pour un filtre, sinon la 1re marque du métier ≠ marque de la fiche. */
export const marqueVarianteDefaut = (categorie?: string | null, marque?: string | null) =>
  estFiltre(categorie) ? "Flag" : (marquesBase(categorie).find((m) => m !== marque) ?? "Bosch");

let cache: Promise<string[]> | null = null;
/** Toutes les marques (départ + ajoutées), lues une fois par page — toutes reconnues comme variantes de marque.
 *  En cas d'erreur : les marques de départ. */
export function chargerMarques(): Promise<string[]> {
  cache ??= lireStockees().then((s) => { ajoutees = s; return noms(s); }).catch(() => DEPART);
  return cache;
}

/** Ajoute une marque pour le métier de `categorie` (si elle existe déjà ailleurs, elle est seulement rattachée à ce
 *  métier en plus) et renvoie la liste à jour. Majuscules/minuscules ignorées ; « valvoline » → « Valvoline ». */
export async function ajouterMarque(nom: string, categorie?: string | null): Promise<{ marques: string[]; marque?: string; erreur?: string }> {
  let propre = nom.trim().replace(/\s+/g, " ");
  if (propre === propre.toLowerCase()) propre = propre.charAt(0).toUpperCase() + propre.slice(1);
  if (propre.length < 2 || propre.length > 30) return { marques: await chargerMarques(), erreur: "Écris le nom de la marque (2 à 30 caractères)." };
  if (/^(oe|__new__|__ajout__)$/i.test(propre)) return { marques: await chargerMarques(), erreur: "Ce nom est réservé." };
  const metier = metierDe(categorie);
  const stockees = await lireStockees().catch(() => [] as Ajoutee[]);
  const enregistrer = async (liste: Ajoutee[], marque: string) => {
    const { error } = await supabase.from("reglages").upsert({ cle: CLE, valeur: liste }, { onConflict: "cle" });
    if (error) return { marques: noms(stockees), erreur: `Marque non enregistrée : ${error.message}` };
    ajoutees = liste; const toutes = noms(liste); cache = Promise.resolve(toutes);
    return { marques: toutes, marque };
  };
  // Déjà une marque de départ de ce métier, ou déjà ajoutée pour ce métier : rien à enregistrer
  const base = marquesBase(categorie).find((m) => egal(m, propre));
  const entree = stockees.find((a) => egal(a.nom, propre));
  if (base) { ajoutees = stockees; const toutes = noms(stockees); cache = Promise.resolve(toutes); return { marques: toutes, marque: base }; }
  if (entree) {
    if (entree.metiers.length === 0 || entree.metiers.includes(metier)) { ajoutees = stockees; const toutes = noms(stockees); cache = Promise.resolve(toutes); return { marques: toutes, marque: entree.nom }; }
    return enregistrer(stockees.map((a) => (a === entree ? { ...a, metiers: [...a.metiers, metier] } : a)), entree.nom);
  }
  // Marque de départ d'un AUTRE métier (ex. Valeo ajoutée en huile) : on garde son nom et on la rattache à ce métier
  const autreMetier = DEPART.find((m) => egal(m, propre));
  if (autreMetier) return enregistrer([...stockees, { nom: autreMetier, metiers: [metier] }], autreMetier);
  // « Renault », « Peugeot »… sont déjà les noms des codes constructeur (OE) importés : en faire une marque
  // mélangerait des centaines de codes OE avec les vraies variantes (Produits, Vente). → « Renault Origine ».
  const { count: nbOe } = await supabase.from("equivalences").select("id", { count: "exact", head: true }).ilike("marque", propre);
  if ((nbOe ?? 0) > 30) return { marques: noms(stockees), erreur: `« ${propre} » est déjà le nom de ${nbOe} codes constructeur (OE). Écris par exemple « ${propre} Origine ».` };
  return enregistrer([...stockees, { nom: propre, metiers: [metier] }], propre);
}
