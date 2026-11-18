// Factures numérotées + avoirs (nouveauté n° 5, inspirée du logiciel « GMP » de dinoun — BIBLE §8.41).
// • Une facture se fait À PARTIR D'UN BON de vente (bouton « Facture » dans Ventes) : numéro suivant sans trou
//   (F2026-0001, fonction SQL prochain_numero), lignes du bon moins les pièces rendues, prix de vente = TTC,
//   HT et TVA calculés (taux des réglages, 20 % par défaut). Un bon = une seule facture (redemander = la même).
// • Un avoir annule une facture (A2026-0001 « sur facture F2026-0003 ») : on ne supprime jamais une facture.
// • Infos de la société (nom, ICE, RC, IF, patente…) dans reglages « societe », modifiables sur la page Factures.
import { supabase } from "./supabase";
import { libelleCategorie } from "./categories";
import type { Facture, LigneFacture, LigneRetour } from "@/types/database";

export type Societe = {
  nom: string; activite: string; adresse: string; ville: string; telephone: string; email: string;
  ice: string; rc: string; if_fiscal: string; patente: string; cnss: string; rib: string;
  taux_tva: number; pied: string;
};
export const SOCIETE_VIDE: Societe = {
  nom: "FiltroPro", activite: "Filtres et pièces auto — vente en gros", adresse: "", ville: "", telephone: "", email: "",
  ice: "", rc: "", if_fiscal: "", patente: "", cnss: "", rib: "", taux_tva: 20, pied: "",
};

export async function chargerSociete(): Promise<Societe> {
  const { data } = await supabase.from("reglages").select("valeur").eq("cle", "societe").maybeSingle();
  return { ...SOCIETE_VIDE, ...((data?.valeur as Partial<Societe> | undefined) ?? {}) };
}
export async function enregistrerSociete(s: Societe): Promise<string | null> {
  const { error } = await supabase.from("reglages").upsert({ cle: "societe", valeur: s, modifie_le: new Date().toISOString() }, { onConflict: "cle" });
  return error?.message ?? null;
}
/** Ce qui manque pour une facture valable au Maroc (affiché en alerte, n'empêche rien). */
export const manquesSociete = (s: Societe) =>
  ([["nom", "raison sociale"], ["adresse", "adresse"], ["ice", "ICE"], ["rc", "RC"], ["if_fiscal", "IF"]] as const)
    .filter(([k]) => !String(s[k] ?? "").trim()).map(([, l]) => l);

const r2 = (n: number) => Math.round(n * 100) / 100;
export function totaux(lignes: LigneFacture[], taux: number) {
  const ttc = r2(lignes.reduce((s, l) => s + l.quantite * l.prix_ttc, 0));
  const ht = r2(ttc / (1 + taux / 100));
  return { total_ttc: ttc, total_ht: ht, tva: r2(ttc - ht) };
}

/** Facture d'un bon de vente (la même si elle existe déjà). */
export async function factureDeVente(saleId: string): Promise<Facture> {
  const { data: deja } = await supabase.from("factures").select("*").eq("sale_id", saleId).eq("type", "facture").limit(1);
  if (deja?.length) return deja[0] as Facture;

  const [{ data: sale, error: e1 }, { data: items, error: e2 }, { data: rets }, soc] = await Promise.all([
    supabase.from("sales").select("id, client_id, date, client:clients(nom, adresse, ville, ice)").eq("id", saleId).single(),
    supabase.from("sale_items").select("product_id, equivalence_id, quantite, prix_unitaire, product:products(reference, nom_fr, categorie, marque), equivalence:equivalences(reference, marque)").eq("sale_id", saleId).order("id"),
    supabase.from("retours_clients").select("lignes").eq("sale_id", saleId),
    chargerSociete(),
  ]);
  if (e1 || !sale) throw new Error("Bon introuvable : " + (e1?.message ?? ""));
  if (e2) throw e2;
  type It = {
    product_id: string; equivalence_id: string | null; quantite: number; prix_unitaire: number;
    product: { reference: string; nom_fr: string | null; categorie: string | null; marque: string | null } | null;
    equivalence: { reference: string; marque: string } | null;
  };
  // Lignes regroupées (même pièce, même prix), moins les pièces rendues
  const rendu = new Map<string, number>();
  for (const r of (rets ?? []) as { lignes: LigneRetour[] }[]) for (const l of r.lignes ?? []) {
    const k = `${l.product_id}|${l.equivalence_id ?? ""}|${l.prix_unitaire}`;
    rendu.set(k, (rendu.get(k) ?? 0) + l.quantite);
  }
  const groupes = new Map<string, LigneFacture>();
  for (const it of (items ?? []) as unknown as It[]) {
    const k = `${it.product_id}|${it.equivalence_id ?? ""}|${it.prix_unitaire}`;
    const g = groupes.get(k);
    if (g) { g.quantite += it.quantite; continue; }
    const marque = it.equivalence?.marque ?? it.product?.marque ?? "";
    const reference = it.equivalence?.reference ?? it.product?.reference ?? "?";
    // « Filtre air — Wix » : le nom de la fiche contient la marque Filtron, faux pour une variante Wix vendue
    const nom = it.product?.categorie && it.product.categorie !== "autre" ? libelleCategorie(it.product.categorie) : it.product?.nom_fr?.trim() || "Pièce auto";
    groupes.set(k, { reference, designation: [nom, marque].filter(Boolean).join(" — "), quantite: it.quantite, prix_ttc: Number(it.prix_unitaire) });
  }
  for (const [k, g] of groupes) g.quantite -= Math.min(g.quantite, rendu.get(k) ?? 0);
  const lignes = [...groupes.values()].filter((l) => l.quantite > 0);
  if (!lignes.length) throw new Error("Ce bon n'a pas d'articles à facturer (bon sans détail, ou tout a été rendu).");

  const { data: numero, error: e3 } = await supabase.rpc("prochain_numero", { p_type: "facture" });
  if (e3 || !numero) throw new Error("Numéro de facture impossible : " + (e3?.message ?? ""));
  const c = (sale as unknown as { client: { nom: string; adresse: string | null; ville: string | null; ice: string | null } | null }).client;
  const s = sale as unknown as { id: string; client_id: string | null; date: string };
  const { data, error } = await supabase.from("factures").insert({
    numero: numero as string, type: "facture", sale_id: s.id, facture_origine: null, client_id: s.client_id, date: new Date().toISOString().slice(0, 10),
    client_nom: c?.nom ?? null, client_ice: c?.ice ?? null, client_adresse: [c?.adresse, c?.ville].filter(Boolean).join(", ") || null,
    lignes, taux_tva: soc.taux_tva, ...totaux(lignes, soc.taux_tva), note: `Bon du ${s.date.slice(8, 10)}/${s.date.slice(5, 7)}/${s.date.slice(0, 4)}`,
  }).select("*").single();
  if (error) throw error;
  return data as Facture;
}

/** Avoir qui annule toute une facture (le même s'il existe déjà). */
export async function avoirDeFacture(f: Facture, motif: string): Promise<Facture> {
  const { data: deja } = await supabase.from("factures").select("*").eq("facture_origine", f.id).eq("type", "avoir").limit(1);
  if (deja?.length) return deja[0] as Facture;
  const { data: numero, error: e } = await supabase.rpc("prochain_numero", { p_type: "avoir" });
  if (e || !numero) throw new Error("Numéro d'avoir impossible : " + (e?.message ?? ""));
  const { data, error } = await supabase.from("factures").insert({
    numero: numero as string, type: "avoir", sale_id: f.sale_id, facture_origine: f.id, client_id: f.client_id, date: new Date().toISOString().slice(0, 10),
    client_nom: f.client_nom, client_ice: f.client_ice, client_adresse: f.client_adresse, lignes: f.lignes, taux_tva: f.taux_tva,
    total_ht: f.total_ht, tva: f.tva, total_ttc: f.total_ttc, note: `Avoir sur facture ${f.numero}${motif ? ` — ${motif}` : ""}`,
  }).select("*").single();
  if (error) throw error;
  return data as Facture;
}

// ───────────── Montant en lettres (« Arrêtée la présente facture à la somme de … ») ─────────────
const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function moinsDeCent(n: number): string {
  if (n <= 16) return UNITES[n];
  if (n < 20) return "dix-" + UNITES[n - 10];
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) { // soixante-dix, quatre-vingt-dix
    const reste = 10 + u;
    return DIZAINES[d] + (d === 7 && u === 1 ? " et " : "-") + (reste <= 16 ? UNITES[reste] : "dix-" + UNITES[u]);
  }
  if (u === 0) return d === 8 ? "quatre-vingts" : DIZAINES[d];
  if (u === 1 && d !== 8) return DIZAINES[d] + " et un";
  return DIZAINES[d] + "-" + UNITES[u];
}
function moinsDeMille(n: number): string {
  const c = Math.floor(n / 100), r = n % 100;
  const cent = c === 0 ? "" : c === 1 ? "cent" : UNITES[c] + (r === 0 ? " cents" : " cent");
  return [cent, r ? moinsDeCent(r) : ""].filter(Boolean).join(" ") || "zéro";
}
export function enLettres(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const milliards = Math.floor(n / 1e9), millions = Math.floor((n % 1e9) / 1e6), milliers = Math.floor((n % 1e6) / 1000), reste = n % 1000;
  if (milliards) parts.push(moinsDeMille(milliards) + (milliards > 1 ? " milliards" : " milliard"));
  if (millions) parts.push(moinsDeMille(millions) + (millions > 1 ? " millions" : " million"));
  if (milliers) parts.push(milliers === 1 ? "mille" : moinsDeMille(milliers).replace(/cents$/, "cent") + " mille");
  if (reste) parts.push(moinsDeMille(reste));
  return parts.join(" ");
}
/** 1 234,50 → « mille deux cent trente-quatre dirhams et cinquante centimes » */
export function montantEnLettres(m: number): string {
  const dh = Math.floor(Math.abs(m) + 1e-9), cts = Math.round((Math.abs(m) - dh) * 100);
  const t = `${enLettres(dh)}${dh >= 1e6 && dh % 1e6 === 0 ? " de" : ""} dirham${dh > 1 ? "s" : ""}`;
  return cts ? `${t} et ${enLettres(cts)} centime${cts > 1 ? "s" : ""}` : t;
}
