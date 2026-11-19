// Voitures et leurs filtres à partir des applications Filtron (114 000 lignes, docs/VIN_ANALYSE.md).
// Partagé par « VIN ou code moteur » (RechercheVin) et le « Catalogue par marque » (CatalogueMarques).
import type { Application, Product } from "@/types/database";
import { libelleCategorie } from "@/lib/categories";

export type ProdLite = Pick<Product, "id" | "reference" | "marque" | "categorie" | "stock" | "stock_min" | "prix_vente" | "image_url" | "vehicule"> & { nom_fr?: string | null };
export type Ligne = Application & { products: ProdLite | null };
export type Voiture = {
  cle: string; marque: string; modele: string; moteur: string | null; code_moteur: string | null;
  annee_debut: string | null; annee_fin: string | null; puissance: string | null; filtres: ProdLite[];
  /** Remarque de montage par pièce (catalogues de distribution, ex. Gates : « à partir de 09/2010 », « avec climatisation ») */
  remarques?: Record<string, string>;
};

export const COLS = "marque, modele, moteur, code_moteur, annee_debut, annee_fin, puissance, remarque, product_id, products(id, reference, marque, categorie, stock, stock_min, prix_vente, image_url, vehicule, nom_fr)";
export const ORDRE = ["filtre_huile", "filtre_air", "filtre_habitacle", "filtre_carburant", "filtre_refroidissement", "huile_moteur",
  "kit_distribution_pompe", "kit_distribution", "courroie_distribution", "galet_distribution", "chaine_distribution", "pompe_eau",
  "kit_courroie_accessoire", "courroie_accessoire", "poulie", "plaquette_frein", "disque_frein", "autre"];
/** Libellé d'une catégorie (les filtres en abrégé, les autres pièces avec le nom de la liste unique categories.ts) */
export const libelle = (c: string) => LIBELLE[c] ?? libelleCategorie(c);
export const LIBELLE: Record<string, string> = {
  filtre_huile: "Filtre à huile", filtre_air: "Filtre à air", filtre_habitacle: "Filtre d'habitacle",
  filtre_carburant: "Filtre à carburant", filtre_refroidissement: "Refroidissement", huile_moteur: "Huile moteur",
  chaine_distribution: "Chaîne de distribution", courroie_distribution: "Courroie de distribution", pompe_eau: "Pompe à eau", kit_distribution: "Kit de distribution", autre: "Autre",
};

/** Regroupe les lignes par voiture (marque + modèle + motorisation + code moteur), filtres triés huile → air → habitacle → carburant. */
export function grouper(rows: Ligne[]): Voiture[] {
  const map = new Map<string, Voiture>();
  for (const r of rows) {
    const cle = [r.marque, r.modele, r.moteur ?? "", r.code_moteur ?? ""].join("|");
    let v = map.get(cle);
    if (!v) {
      v = { cle, marque: r.marque, modele: r.modele, moteur: r.moteur, code_moteur: r.code_moteur, annee_debut: r.annee_debut, annee_fin: r.annee_fin, puissance: r.puissance, filtres: [], remarques: {} };
      map.set(cle, v);
    }
    const p = r.products;
    if (p && !v.filtres.some((f) => f.id === p.id)) v.filtres.push(p);
    const rem = r.remarque?.trim();
    if (p && rem && v.remarques) {
      const deja = v.remarques[p.id];
      if (!deja) v.remarques[p.id] = rem;
      else if (!deja.split(" — ou — ").includes(rem)) v.remarques[p.id] = `${deja} — ou — ${rem}`;
    }
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

// Types de filtres qui composent un kit d'entretien (pas l'huile : elle a sa propre ligne)
const TYPES_KIT = ["filtre_huile", "filtre_air", "filtre_habitacle", "filtre_carburant"];

/** Kit d'entretien d'une voiture : un filtre par type (huile, air, habitacle, carburant). S'il y a
 *  plusieurs choix pour un type, on garde celui en stock, puis celui qui a un prix, puis le premier. */
export function kitDeVoiture(v: Pick<Voiture, "filtres">): ProdLite[] {
  const kit: ProdLite[] = [];
  for (const type of TYPES_KIT) {
    const choix = v.filtres.filter((f) => f.categorie === type);
    if (!choix.length) continue;
    choix.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || Number(b.prix_vente > 0) - Number(a.prix_vente > 0));
    kit.push(choix[0]);
  }
  return kit;
}

export type LigneHuileKit = { reference: string; qte: number; prix_vente: number };

/** Message WhatsApp du kit (français, prix seulement s'ils sont connus), avec l'huile si elle est choisie */
export function messageKit(v: Pick<Voiture, "marque" | "modele" | "moteur" | "code_moteur">, kit: ProdLite[], huile?: { texte: string; lignes: LigneHuileKit[] }): string {
  const lignesHuile = huile?.lignes ?? [];
  const total = kit.reduce((s, f) => s + (f.prix_vente > 0 ? f.prix_vente : 0), 0) + lignesHuile.reduce((s, l) => s + (l.prix_vente > 0 ? l.prix_vente * l.qte : 0), 0);
  const toutPrix = kit.every((f) => f.prix_vente > 0) && lignesHuile.every((l) => l.prix_vente > 0);
  return [
    `🚗 *Kit filtres* — ${decouperModele(v.modele).nom} (${v.marque})`,
    [v.moteur, v.code_moteur && `code ${v.code_moteur}`].filter(Boolean).join(" · "),
    "————————————",
    ...kit.map((f) => `• ${libelle(f.categorie)} : *${f.reference}*${f.prix_vente > 0 ? ` — ${f.prix_vente} MAD` : ""}`),
    huile ? `• Huile moteur ${huile.texte}` : "",
    ...lignesHuile.map((l) => `   ${l.qte} × *${l.reference}*${l.prix_vente > 0 ? ` — ${l.prix_vente * l.qte} MAD` : ""}`),
    "————————————",
    total > 0 ? `🧮 *Total${toutPrix ? "" : " (articles avec prix)"} : ${total} MAD*` : "",
    "📲 FiltroPro · 06 02 35 02 90",
  ].filter(Boolean).join("\n");
}
