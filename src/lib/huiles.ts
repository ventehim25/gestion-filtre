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
//   il faut un chiffre après : « D4F740 » oui, « D4FB » (Hyundai) non) > guide plus précis (« DV6TED4B » / « DV6TED4 »).
function ressemblance(c: string, x: string): number {
  if (x === c) return 100 + c.length;
  if (c.length >= 3 && x.startsWith(c) && (c.length >= 4 || /\d/.test(x[c.length] ?? ""))) return 50 + c.length;
  if (x.length >= 6 && c.length > x.length && c.startsWith(x)) return 10 + x.length; // « TU5JP » (8V) ≠ « TU5JP4 » (16V)
  return 0;
}

/** Lignes d'huile qui correspondent au code moteur Filtron (la ressemblance la plus forte gagne). */
export function huilesDuMoteur(codeMoteur: string | null | undefined, toutes: HuileMoteur[]): HuileMoteur[] {
  const m = morceaux(codeMoteur);
  if (!m.length) return [];
  const notes = toutes.map((h) => ({ h, n: Math.max(0, ...m.map((x) => ressemblance(normCode(h.code), x))) })).filter((x) => x.n > 0);
  if (!notes.length) return [];
  const meilleure = Math.max(...notes.map((x) => x.n));
  const codeGagnant = notes.find((x) => x.n === meilleure)!.h.code; // un seul moteur, toutes ses variantes
  return notes.filter((x) => x.n === meilleure && x.h.code === codeGagnant).map((x) => x.h).sort((a, b) => a.variante.localeCompare(b.variante));
}

/** Variante probable d'après le nom du moteur Filtron (« FAP », « DPF », « Blue ») ; null si on ne sait pas. */
export function variantePrevue(moteur: string | null | undefined, lignes: HuileMoteur[]): string | null {
  if (lignes.length < 2) return lignes[0]?.variante ?? null;
  const m = moteur ?? "";
  if (/Blue/i.test(m)) { const b = lignes.find((l) => /Blue/i.test(l.variante)) ?? lignes.find((l) => /avec/i.test(l.variante)); if (b) return b.variante; }
  if (/\b(FAP|DPF)\b/i.test(m)) return lignes.find((l) => /avec/i.test(l.variante))?.variante ?? null;
  if (/DI-?D/i.test(m)) return lignes.find((l) => /DI-D/i.test(l.variante))?.variante ?? null; // Mitsubishi L200
  return null; // le nom ne dit pas s'il y a un FAP : le vendeur choisit
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
  const besoin = h.litres_max || h.litres_min || 0;
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

// Chargé une fois par page (les deux listes sont petites)
let cache: Promise<{ huiles: HuileMoteur[]; bidons: BidonHuile[] }> | null = null;
export function chargerHuiles(): Promise<{ huiles: HuileMoteur[]; bidons: BidonHuile[] }> {
  if (!cache) {
    cache = (async () => {
      const [h, p] = await Promise.all([
        supabase.from("huiles_moteurs").select("*"),
        supabase.from("products").select("id, reference, marque, stock, prix_vente").eq("categorie", "huile_moteur"),
      ]);
      const huiles = h.error ? [] : ((h.data ?? []) as HuileMoteur[]); // table absente = pas encore de données
      const bidons = ((p.data ?? []) as { id: string; reference: string; marque: string | null; stock: number; prix_vente: number }[])
        .map(lireBidon).filter((b): b is BidonHuile => b !== null);
      return { huiles, bidons };
    })().catch(() => ({ huiles: [], bidons: [] }));
  }
  return cache;
}
