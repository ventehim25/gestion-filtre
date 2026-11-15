// Huile moteur par voiture (BIBLE §8.19) : viscosités et quantité relevées dans le guide des huiles
// Liqui Moly (table huiles_moteurs), rattachées aux voitures Filtron par le code moteur.
// On ne devine jamais : pas de ligne pour ce moteur = rien d'affiché.
import { supabase } from "./supabase";
import type { HuileMoteur } from "@/types/database";

export type BidonHuile = { id: string; reference: string; marque?: string | null; stock: number; prix_vente: number; viscosite: string; litres: number };

// « K9K 790/792 », « 9HZ (DV6TED4) », « OM 651.911 », « 2KD-FTV » → morceaux comparables
function morceaux(code: string | null | undefined): string[] {
  const brut = (code ?? "").toUpperCase();
  if (!brut.trim()) return [];
  const parts = brut.split(/[\s/,()]+/).map((p) => p.replace(/[^A-Z0-9]/g, "")).filter(Boolean);
  return [...new Set([brut.replace(/[^A-Z0-9]/g, ""), ...parts])];
}
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Ressemblance entre un code du guide (c) et un morceau du code Filtron (x) : 0 = rien
//   identique (« K9K » = « K9K ») > Filtron plus précis (« K9K608 » commence par « K9K » ; pour un code de 3 signes,
//   il faut un chiffre après : « D4F740 » oui, « D4FB » (Hyundai) non — sauf si la marque est vérifiée : « B47 » BMW → « B47D20B »)
//   > guide plus précis (« DV6TED4B » / « DV6TED4 »).
function ressemblance(c: string, x: string, marqueVerifiee = false): number {
  if (x === c) return 100 + c.length;
  if (c.length >= 3 && x.startsWith(c) && (c.length >= 4 || /\d/.test(x[c.length] ?? ""))) return 50 + c.length;
  if (marqueVerifiee && c.length === 3 && x.startsWith(c)) return 40 + c.length;
  if (x.length >= 6 && c.length > x.length && c.startsWith(x)) return 10 + x.length; // « TU5JP » (8V) ≠ « TU5JP4 » (16V)
  return 0;
}

/** Famille de marques qui partagent leurs moteurs (« VW (VOLKSWAGEN) », « Skoda » → VAG ; « IVECO » → IVECO). */
export function familleMarque(marque: string | null | undefined): string {
  const u = (marque ?? "").toUpperCase();
  if (/MERCEDES|EVOBUS/.test(u)) return "MERCEDES";
  if (/VOLKSWAGEN|\bVW\b|SKODA|ŠKODA|\bSEAT\b|\bAUDI\b|CUPRA|\bMAN\b/.test(u)) return "VAG";
  if (/RENAULT|DACIA|NISSAN|ALPINE/.test(u)) return "RN";
  if (/PEUGEOT|CITRO|^DS\b/.test(u)) return "PSA";
  if (/HYUNDAI|\bKIA\b/.test(u)) return "HK";
  if (/FORD|MAZDA|VOLVO/.test(u)) return "FM";
  if (/OPEL|CHEVROLET|VAUXHALL|DAEWOO/.test(u)) return "GM";
  return u.split(/[\s(/-]+/)[0] ?? "";
}

// La ligne vaut-elle pour cette marque ? (marques vides = relevé ancien, valable partout)
function memeMarque(h: HuileMoteur, famille: string | null): boolean {
  return !famille || !h.marques?.length || h.marques.some((m) => familleMarque(m) === famille);
}

/** Lignes d'huile qui correspondent au code moteur Filtron (la ressemblance la plus forte gagne).
 *  Avec la marque : seulement les lignes relevées sur la même famille de marques (« F4A » Ford ≠ « F4A » Iveco). */
export function huilesDuMoteur(codeMoteur: string | null | undefined, toutes: HuileMoteur[], marque?: string | null): HuileMoteur[] {
  const m = morceaux(codeMoteur);
  if (!m.length) return [];
  const famille = marque ? familleMarque(marque) : null;
  const notes = toutes.filter((h) => !estCleVoiture(h) && memeMarque(h, famille))
    .map((h) => ({ h, n: Math.max(0, ...m.map((x) => ressemblance(normCode(h.code), x, !!famille && !!h.marques?.length))) })).filter((x) => x.n > 0);
  if (!notes.length) return [];
  const meilleure = Math.max(...notes.map((x) => x.n));
  const top = notes.filter((x) => x.n === meilleure);
  // Code Filtron plus court que ceux du guide (« D4204T » → « D4204T11 », « D4204T14 ») : seulement si toutes ces versions veulent la même huile
  if (meilleure < 40 && new Set(top.map((x) => [...x.h.viscosites].sort().join(","))).size > 1) return [];
  const codeGagnant = top[0].h.code; // un seul moteur, toutes ses variantes
  return top.filter((x) => x.h.code === codeGagnant).map((x) => x.h).sort((a, b) => a.variante.localeCompare(b.variante));
}

// ---- Sans vrai code moteur (Ford : Filtron écrit « Duratec », « Zetec », « Duratorq ») : modèle + cylindrée + carburant
// + puissance + années. Lignes « ~FORD|FOCUS|1.6|E|77 » (BIBLE §8.22), variante = période du guide (« 2004-2011 »).
export const estCleVoiture = (h: Pick<HuileMoteur, "code">) => h.code.startsWith("~");
const SECOND_MOT = /^(CONNECT|CUSTOM|COURIER)$/; // « Transit Connect » ≠ « Transit »
const familleModele = (m: string) => {
  const w = m.toUpperCase().replace(/[,/(|].*$/, "").split(/\s+/).map((x) => x.replace(/[^A-Z0-9-]/g, "")).filter(Boolean);
  return (w[0] ?? "") + (SECOND_MOT.test(w[1] ?? "") ? " " + w[1] : "");
};
type VoitureHuile = { marque: string; modele: string; moteur: string | null; code_moteur: string | null; annee_debut: string | null; puissance: string | null };
/** Clés possibles de la voiture (puissance exacte d'abord, puis ± 1 et ± 2 kW : Filtron donne des ch arrondis). */
export function clesVoiture(v: VoitureHuile): string[] {
  const cyl = (v.moteur ?? "").match(/(\d)[.,](\d)/);
  const ch = Number((String(v.puissance ?? "").match(/\d+(?:[.,]\d+)?/) ?? [""])[0].replace(",", "."));
  if (!cyl || !ch) return [];
  const diesel = /TDCI|TDDI|TDE|\bTDI?\b|\bDI\b|\bD\b|DIESEL|ECOBLUE|DURATORQ|ECOTORQ|CRDI|\bDCI\b|\bHDI\b/i.test(`${v.moteur} ${v.code_moteur ?? ""}`);
  const kw = Math.round(ch * 0.7355);
  const base = `~${v.marque.toUpperCase().split(/[\s(]+/)[0]}|${familleModele(v.modele)}|${cyl[1]}.${cyl[2]}|${diesel ? "D" : "E"}|`;
  return [0, -1, 1, -2, 2].map((d) => base + (kw + d));
}
const anneeDe = (s: string | null) => { const m = (s ?? "").match(/(\d{4})/); return m ? Number(m[1]) : null; };
// La voiture (année de début Filtron) est-elle dans la période de la ligne ? (1 an de marge)
function dansPeriode(variante: string, annee: number | null): boolean {
  const m = variante.match(/^(\d{4})-(\d{4})?/);
  if (!m || annee == null) return true;
  return annee >= Number(m[1]) - 1 && annee <= (m[2] ? Number(m[2]) : 9999) + 1;
}

/** Huile d'une voiture Filtron : par le code moteur, sinon par modèle + cylindrée + puissance + années. */
export function huilesDeLaVoiture(v: VoitureHuile, toutes: HuileMoteur[]): HuileMoteur[] {
  const parCode = huilesDuMoteur(v.code_moteur, toutes, v.marque);
  if (parCode.length) return parCode;
  const annee = anneeDe(v.annee_debut);
  for (const cle of clesVoiture(v)) {
    const l = toutes.filter((h) => h.code === cle && dansPeriode(h.variante, annee));
    if (l.length) return l.sort((a, b) => a.variante.localeCompare(b.variante));
  }
  return [];
}

/** Les versions proposées sont-elles « avec / sans FAP » (sinon : versions par modèle ou par année) ? */
export const versionsFap = (lignes: HuileMoteur[]) => lignes.some((l) => /FAP|DPF|AdBlue|Blue/i.test(l.variante));

/** Variante probable d'après le nom du moteur Filtron (« FAP », « DPF », « Blue ») ou le modèle (« TUCSON » → version
 *  « Sportage, i30, Tucson… ») ; null si on ne sait pas. */
export function variantePrevue(moteur: string | null | undefined, lignes: HuileMoteur[], modele?: string | null): string | null {
  if (lignes.length < 2) return lignes[0]?.variante ?? null;
  const m = moteur ?? "";
  if (/Blue/i.test(m)) { const b = lignes.find((l) => /Blue/i.test(l.variante)) ?? lignes.find((l) => /avec/i.test(l.variante)); if (b) return b.variante; }
  if (/\b(FAP|DPF)\b/i.test(m)) return lignes.find((l) => /avec/i.test(l.variante))?.variante ?? null;
  if (/DI-?D/i.test(m)) return lignes.find((l) => /DI-D/i.test(l.variante))?.variante ?? null; // Mitsubishi L200
  if (!versionsFap(lignes) && modele) {
    const mots = modele.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w.length >= 3 && /[A-Z]/.test(w));
    const ok = lignes.filter((l) => l.variante.toUpperCase().split(/[^A-Z0-9]+/).some((w) => mots.includes(w)));
    if (ok.length === 1) return ok[0].variante;
  }
  return null; // on ne sait pas (FAP ? quelle version ?) : le vendeur choisit
}

export const litresTexte = (h: Pick<HuileMoteur, "litres_min" | "litres_max">) =>
  h.litres_min && h.litres_max && h.litres_min !== h.litres_max ? `${String(h.litres_min).replace(".", ",")} à ${String(h.litres_max).replace(".", ",")} L`
    : h.litres_max || h.litres_min ? `${String(h.litres_max || h.litres_min).replace(".", ",")} L` : "";

// « MOTUL 5W30 5L » → 5W-30, 5 L
export function lireBidon(p: { id: string; reference: string; marque?: string | null; stock: number; prix_vente: number }): BidonHuile | null {
  const v = p.reference.toUpperCase().match(/\b(\d{1,2})W-?(\d{2})\b/);
  const l = p.reference.toUpperCase().match(/\b(\d+(?:[.,]\d+)?)\s*L\b/);
  if (!v || !l) return null;
  return { ...p, viscosite: `${v[1]}W-${v[2]}`, litres: Number(l[1].replace(",", ".")) };
}

/** Bidons en stock qui conviennent (viscosité citée par le guide), dans l'ordre du guide puis le plus de stock. */
export function bidonsConvenables(h: HuileMoteur, bidons: BidonHuile[]): BidonHuile[] {
  return bidons
    .filter((b) => b.stock > 0 && h.viscosites.includes(b.viscosite))
    .sort((a, b) => h.viscosites.indexOf(a.viscosite) - h.viscosites.indexOf(b.viscosite) || b.stock - a.stock);
}

/** Bidons à vendre pour une vidange : un 5 L (+ des 1 L de la même huile s'il faut plus de 5 L). */
export function bidonsPourVidange(h: HuileMoteur, bidons: BidonHuile[]): { bidon: BidonHuile; qte: number }[] {
  // Quantité qui change beaucoup selon la voiture (4,5 à 7 L) : on part du minimum, le vendeur complète à la jauge
  const variable = !!(h.litres_min && h.litres_max && h.litres_max > h.litres_min * 1.35);
  const besoin = (variable ? h.litres_min : h.litres_max || h.litres_min) || 0;
  const ok = bidonsConvenables(h, bidons);
  if (!besoin || !ok.length) return [];
  const grand = ok.find((b) => b.litres >= 4) ?? null;
  const petitDe = (g: BidonHuile | null) => ok.find((b) => b.litres === 1 && (!g || (b.marque === g.marque && b.viscosite === g.viscosite)));
  if (grand) {
    // 4,8 L → 1 × 5 L ; 6,5 L → 1 × 5 L + 2 × 1 L ; 9 L → 2 × 5 L
    const nbGrand = Math.max(1, Math.floor(besoin / grand.litres));
    const reste = besoin - nbGrand * grand.litres;
    const petit = petitDe(grand);
    if (reste <= 0) return [{ bidon: grand, qte: nbGrand }];
    if (petit && reste <= 3) return [{ bidon: grand, qte: nbGrand }, { bidon: petit, qte: Math.ceil(reste) }];
    return [{ bidon: grand, qte: nbGrand + 1 }];
  }
  const petit = petitDe(null);
  return petit ? [{ bidon: petit, qte: Math.ceil(besoin) }] : [];
}

// Toutes les lignes d'huile (environ 2 600 moteurs : par paquets de 1000, la limite Supabase)
async function toutesLesHuiles(): Promise<HuileMoteur[]> {
  const out: HuileMoteur[] = [];
  for (let a = 0; ; a += 1000) {
    const { data, error } = await supabase.from("huiles_moteurs").select("*").order("code").order("variante").range(a, a + 999);
    if (error) return out; // table absente = pas encore de données
    out.push(...((data ?? []) as HuileMoteur[]));
    if (!data || data.length < 1000) return out;
  }
}

// Chargé une fois par page
let cache: Promise<{ huiles: HuileMoteur[]; bidons: BidonHuile[] }> | null = null;
export function chargerHuiles(): Promise<{ huiles: HuileMoteur[]; bidons: BidonHuile[] }> {
  if (!cache) {
    cache = (async () => {
      const [huiles, p] = await Promise.all([
        toutesLesHuiles(),
        supabase.from("products").select("id, reference, marque, stock, prix_vente").eq("categorie", "huile_moteur"),
      ]);
      const bidons = ((p.data ?? []) as { id: string; reference: string; marque: string | null; stock: number; prix_vente: number }[])
        .map(lireBidon).filter((b): b is BidonHuile => b !== null);
      return { huiles, bidons };
    })().catch(() => ({ huiles: [], bidons: [] }));
  }
  return cache;
}
