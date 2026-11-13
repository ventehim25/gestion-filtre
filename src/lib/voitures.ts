// Voitures et leurs filtres à partir des applications Filtron (114 000 lignes, docs/VIN_ANALYSE.md).
// Partagé par « VIN ou code moteur » (RechercheVin) et le « Catalogue par marque » (CatalogueMarques).
import type { Application, Product } from "@/types/database";

export type ProdLite = Pick<Product, "id" | "reference" | "marque" | "categorie" | "stock" | "stock_min" | "prix_vente" | "image_url">;
export type Ligne = Application & { products: ProdLite | null };
export type Voiture = {
  cle: string; marque: string; modele: string; moteur: string | null; code_moteur: string | null;
  annee_debut: string | null; annee_fin: string | null; puissance: string | null; filtres: ProdLite[];
};

export const COLS = "marque, modele, moteur, code_moteur, annee_debut, annee_fin, puissance, product_id, products(id, reference, marque, categorie, stock, stock_min, prix_vente, image_url)";
export const ORDRE = ["filtre_huile", "filtre_air", "filtre_habitacle", "filtre_carburant", "filtre_refroidissement", "huile_moteur", "autre"];
export const LIBELLE: Record<string, string> = {
  filtre_huile: "Filtre à huile", filtre_air: "Filtre à air", filtre_habitacle: "Filtre d'habitacle",
  filtre_carburant: "Filtre à carburant", filtre_refroidissement: "Refroidissement", huile_moteur: "Huile moteur", autre: "Autre",
};

/** Regroupe les lignes par voiture (marque + modèle + motorisation + code moteur), filtres triés huile → air → habitacle → carburant. */
export function grouper(rows: Ligne[]): Voiture[] {
  const map = new Map<string, Voiture>();
  for (const r of rows) {
    const cle = [r.marque, r.modele, r.moteur ?? "", r.code_moteur ?? ""].join("|");
    let v = map.get(cle);
    if (!v) {
      v = { cle, marque: r.marque, modele: r.modele, moteur: r.moteur, code_moteur: r.code_moteur, annee_debut: r.annee_debut, annee_fin: r.annee_fin, puissance: r.puissance, filtres: [] };
      map.set(cle, v);
    }
    const p = r.products;
    if (p && !v.filtres.some((f) => f.id === p.id)) v.filtres.push(p);
  }
  const out = [...map.values()];
  out.forEach((v) => v.filtres.sort((a, b) => ORDRE.indexOf(a.categorie) - ORDRE.indexOf(b.categorie)));
  out.sort((a, b) => `${a.marque} ${a.modele} ${a.moteur ?? ""}`.localeCompare(`${b.marque} ${b.modele} ${b.moteur ?? ""}`, undefined, { numeric: true }));
  return out;
}

export function annees(v: Pick<Voiture, "annee_debut" | "annee_fin">): string {
  // Filtron laisse souvent la fin vide ("") quand la voiture est encore fabriquée
  if (!v.annee_debut && !v.annee_fin) return "";
  return `${v.annee_debut || "?"} → ${v.annee_fin || "…"}`;
}

/** Date Filtron → nombre triable : « 05/2013 » → 201305, « 2013 » → 201300, vide → null. */
export function dateTri(s: string | null): number | null {
  if (!s) return null;
  const mois = s.match(/(\d{1,2})\s*[/.-]\s*(\d{4})/);
  if (mois) return Number(mois[2]) * 100 + Number(mois[1]);
  const an = s.match(/(\d{4})/);
  return an ? Number(an[1]) * 100 : null;
}

/** Type de moteur : cylindrée (« 1.2 » au début de la motorisation) + famille du code moteur (« D4F732 » → « D4F »). */
export function typeMoteur(v: Pick<Voiture, "moteur" | "code_moteur">): { cyl: string; base: string } {
  const cyl = (v.moteur ?? "").trim().match(/^(\d+[.,]\d+)/)?.[1].replace(",", ".") ?? "";
  const c = (v.code_moteur ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  const base = c.length === 3 && /[A-Z]/.test(c) && /\d/.test(c) ? c : "";
  return { cyl, base };
}

export type TypeMoteur = { cle: string; cyl: string; base: string; voitures: Voiture[] };

/** Moteurs rangés par type (cylindrée, puis famille du code moteur, ex. « 1.2 · D4F ») ; dans un même type,
 *  de la plus ancienne version à la plus récente (demande de l'utilisateur, 13/11/2026). */
export function rangerParType(vs: Voiture[]): TypeMoteur[] {
  const map = new Map<string, TypeMoteur>();
  for (const v of vs) {
    const { cyl, base } = typeMoteur(v);
    const cle = `${cyl}|${base}`;
    let t = map.get(cle);
    if (!t) { t = { cle, cyl, base, voitures: [] }; map.set(cle, t); }
    t.voitures.push(v);
  }
  const debut = (v: Voiture) => dateTri(v.annee_debut) ?? Infinity;
  const cylindree = (t: TypeMoteur) => (t.cyl ? parseFloat(t.cyl) : Infinity);
  const types = [...map.values()];
  types.forEach((t) => t.voitures.sort((a, b) =>
    debut(a) - debut(b) || (a.moteur ?? "").localeCompare(b.moteur ?? "", "fr", { numeric: true })));
  // Infinity − Infinity = NaN (faux) → on passe au critère suivant
  types.sort((a, b) => cylindree(a) - cylindree(b) || debut(a.voitures[0]) - debut(b.voitures[0]) || a.base.localeCompare(b.base));
  return types;
}

/** Filtron écrit « Logan II / MCV II | 13- » : nom du modèle + période de fabrication. */
export function decouperModele(modele: string): { nom: string; periode: string } {
  const i = modele.lastIndexOf(" | ");
  return i > 0 ? { nom: modele.slice(0, i), periode: modele.slice(i + 3) } : { nom: modele, periode: "" };
}
