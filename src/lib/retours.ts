// Retours (nouveauté n° 2, inspirée du logiciel « GMP » de dinoun — BIBLE §8.41).
// • Retour CLIENT : le garage rend des pièces d'un bon → le stock revient, et l'argent est réglé de 3 façons :
//     avoir     = crédit sur sa prochaine vente (clients.avoir, déjà utilisé par « Déduire » dans Ventes)
//     rembourse = argent rendu en espèces (paiement négatif → sort de la caisse du jour)
//     deduit    = enlevé de ce qu'il doit encore sur ce bon (sales.montant_paye augmente, rien ne sort de la caisse)
//   Le bon d'origine n'est jamais modifié (on garde l'historique) : le retour est une ligne à part (retours_clients),
//   que Statistiques enlève des ventes et du coût le jour du retour.
// • Retour FOURNISSEUR : je rends des pièces à dinoun / filtropro → une « réception » en négatif (type « retour »,
//   montant et quantités négatifs) : le stock baisse, la dette (ou le capital) se corrige toute seule, et l'annulation
//   ✕ de l'historique remet tout comme avant (elle refait le stock à l'envers grâce aux quantités négatives).
import { supabase } from "./supabase";
import { noterPaiement } from "./caisse";
import type { LigneRetour, ReceptionLigne, RetourClient } from "@/types/database";

const arrondi = (n: number) => Math.round(n * 100) / 100;
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Lignes d'un bon avec ce qui a déjà été rendu (pour proposer au plus ce qui reste). */
export type LigneVenteRetour = LigneRetour & { vendu: number; dejaRendu: number };

export async function lignesPourRetour(saleId: string): Promise<{ lignes: LigneVenteRetour[]; retours: RetourClient[] }> {
  const [{ data: items, error }, { data: rets }] = await Promise.all([
    supabase.from("sale_items")
      .select("product_id, equivalence_id, quantite, prix_unitaire, cout_unitaire, product:products(reference, prix_achat), equivalence:equivalences(marque, reference, prix_achat)")
      .eq("sale_id", saleId).order("id"),
    supabase.from("retours_clients").select("*").eq("sale_id", saleId).order("created_at"),
  ]);
  if (error) throw error;
  const retours = (rets ?? []) as RetourClient[];
  const rendu = new Map<string, number>();
  for (const r of retours) for (const l of r.lignes ?? []) {
    const k = `${l.product_id}|${l.equivalence_id ?? ""}|${l.prix_unitaire}`;
    rendu.set(k, (rendu.get(k) ?? 0) + l.quantite);
  }
  type Item = {
    product_id: string; equivalence_id: string | null; quantite: number; prix_unitaire: number; cout_unitaire: number | null;
    product: { reference: string; prix_achat: number } | null; equivalence: { marque: string; reference: string; prix_achat: number | null } | null;
  };
  // Deux lignes identiques (même pièce, même prix) sont regroupées : on rend « 3 sur 5 », pas ligne par ligne
  const groupes = new Map<string, LigneVenteRetour>();
  for (const it of (items ?? []) as unknown as Item[]) {
    const k = `${it.product_id}|${it.equivalence_id ?? ""}|${it.prix_unitaire}`;
    const ref = it.equivalence ? `${it.equivalence.reference} (${it.equivalence.marque})` : it.product?.reference ?? "?";
    const cout = it.cout_unitaire ?? it.equivalence?.prix_achat ?? it.product?.prix_achat ?? 0;
    const g = groupes.get(k);
    if (g) { g.vendu += it.quantite; continue; }
    groupes.set(k, { product_id: it.product_id, equivalence_id: it.equivalence_id, ref, quantite: 0, prix_unitaire: Number(it.prix_unitaire), cout_unitaire: Number(cout), vendu: it.quantite, dejaRendu: 0 });
  }
  for (const [k, g] of groupes) g.dejaRendu = Math.min(g.vendu, rendu.get(k) ?? 0);
  return { lignes: [...groupes.values()], retours };
}

export type ModeRetour = "avoir" | "rembourse" | "deduit";

/** Enregistre un retour client. Le retour est écrit d'abord (trace), puis le stock revient ligne par ligne,
 *  puis l'argent est réglé selon le mode. En ligne seulement. */
export async function enregistrerRetourClient(p: {
  sale: { id: string; client_id: string; total: number; montant_paye: number };
  lignes: LigneRetour[]; mode: ModeRetour; note?: string;
}): Promise<RetourClient> {
  const lignes = p.lignes.filter((l) => l.quantite > 0);
  if (!lignes.length) throw new Error("Aucune pièce à rendre.");
  const montant = arrondi(lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0));
  const cout = arrondi(lignes.reduce((s, l) => s + l.quantite * l.cout_unitaire, 0));
  const reste = arrondi(p.sale.total - p.sale.montant_paye);
  if (p.mode === "deduit" && montant > reste + 0.01) throw new Error(`Le client ne doit plus que ${reste.toFixed(0)} MAD sur ce bon : choisis « Avoir » ou « Rembourser ».`);

  const { data, error } = await supabase.from("retours_clients").insert({
    sale_id: p.sale.id, client_id: p.sale.client_id, date: aujourdhui(), lignes, montant, cout, mode: p.mode, note: p.note || null,
  }).select("*").single();
  if (error) throw error;
  const retour = data as RetourClient;

  // 1) Le stock revient (qty négative = le stock augmente)
  for (const l of lignes) {
    const { error: e } = l.equivalence_id
      ? await supabase.rpc("decrement_equiv_stock", { e_id: l.equivalence_id, qty: -l.quantite })
      : await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: -l.quantite });
    if (e) throw new Error(`Stock de ${l.ref} pas remis : ${e.message}`);
  }

  // 2) L'argent
  if (p.mode === "avoir") {
    const { data: c } = await supabase.from("clients").select("avoir").eq("id", p.sale.client_id).single();
    await supabase.from("clients").update({ avoir: arrondi(Number(c?.avoir ?? 0) + montant) }).eq("id", p.sale.client_id);
  } else if (p.mode === "rembourse") {
    await noterPaiement(supabase, {
      sale_id: p.sale.id, client_id: p.sale.client_id, date: aujourdhui(), montant: -montant, mode: "especes",
      cle: `retour-${retour.id}`, note: "argent rendu (retour de pièces)",
    });
  } else {
    const paye = arrondi(p.sale.montant_paye + montant);
    await supabase.from("sales").update({ montant_paye: paye, statut: paye >= p.sale.total - 0.01 ? "paye" : "partiel" }).eq("id", p.sale.id);
  }
  return retour;
}

/** Retours de tous les bons (badge « ↩ » dans la liste des ventes). Petite table : lue d'un coup, par paquets triés. */
export async function retoursParVente(): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.from("retours_clients").select("id, sale_id, montant").order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    for (const r of data as { sale_id: string | null; montant: number }[]) if (r.sale_id) m.set(r.sale_id, (m.get(r.sale_id) ?? 0) + Number(r.montant));
    if (data.length < 1000) break;
  }
  return m;
}

/** Ce que j'ai pris chez un fournisseur (réceptions − retours déjà faits), pour choisir quoi lui rendre. */
export type PieceARendre = { product_id: string; equivalence_id: string | null; ref: string; pris: number; stock: number; prix_achat: number };

export async function piecesDuFournisseur(receptions: { fournisseur_id: string; lignes?: ReceptionLigne[] | null }[], fournisseurId: string): Promise<PieceARendre[]> {
  const net = new Map<string, { product_id: string; equivalence_id: string | null; ref: string; pris: number }>();
  for (const r of receptions) {
    if (r.fournisseur_id !== fournisseurId) continue;
    for (const l of r.lignes ?? []) {
      const k = `${l.product_id}|${l.equivalence_id ?? ""}`;
      const g = net.get(k) ?? { product_id: l.product_id, equivalence_id: l.equivalence_id, ref: l.ref, pris: 0 };
      g.pris += l.quantite; // une ligne de retour a une quantité négative
      if (l.quantite > 0) g.ref = l.ref;
      net.set(k, g);
    }
  }
  const liste = [...net.values()].filter((g) => g.pris > 0);
  // Stock et prix d'achat actuels (fiche ou variante de marque)
  const idsP = [...new Set(liste.filter((g) => !g.equivalence_id).map((g) => g.product_id))];
  const idsE = [...new Set(liste.filter((g) => g.equivalence_id).map((g) => g.equivalence_id as string))];
  const fiches = new Map<string, { stock: number; prix_achat: number }>();
  for (let i = 0; i < idsP.length; i += 200) {
    const { data } = await supabase.from("products").select("id, stock, prix_achat").in("id", idsP.slice(i, i + 200));
    for (const x of (data ?? []) as { id: string; stock: number; prix_achat: number }[]) fiches.set(x.id, x);
  }
  for (let i = 0; i < idsE.length; i += 200) {
    const { data } = await supabase.from("equivalences").select("id, stock, prix_achat").in("id", idsE.slice(i, i + 200));
    for (const x of (data ?? []) as { id: string; stock: number | null; prix_achat: number | null }[]) fiches.set(x.id, { stock: x.stock ?? 0, prix_achat: x.prix_achat ?? 0 });
  }
  return liste.map((g) => {
    const f = fiches.get(g.equivalence_id ?? g.product_id);
    return { ...g, stock: f?.stock ?? 0, prix_achat: Number(f?.prix_achat ?? 0) };
  }).sort((a, b) => a.ref.localeCompare(b.ref));
}

/** Retour au fournisseur = réception en négatif. La ligne est écrite d'abord (sans détail), le stock baisse ligne par
 *  ligne, et le détail ne garde que les lignes vraiment appliquées → l'annulation ✕ reste juste même après une coupure. */
export async function enregistrerRetourFournisseur(p: {
  fournisseur_id: string; date: string; lignes: { product_id: string; equivalence_id: string | null; ref: string; quantite: number; prix_achat: number }[]; note?: string;
}): Promise<void> {
  const lignes = p.lignes.filter((l) => l.quantite > 0);
  if (!lignes.length) throw new Error("Aucune pièce à rendre.");
  const montant = arrondi(lignes.reduce((s, l) => s + l.quantite * l.prix_achat, 0));
  const details = `↩ Retour : ${lignes.map((l) => `${l.ref}×${l.quantite}`).join(", ")}${p.note ? ` — ${p.note}` : ""}`;
  const { data, error } = await supabase.from("receptions").insert({
    fournisseur_id: p.fournisseur_id, date: p.date, montant: -montant, details, lignes: [], type: "retour",
  }).select("id").single();
  if (error) throw error;
  const fait: ReceptionLigne[] = [];
  try {
    for (const l of lignes) {
      const { error: e } = l.equivalence_id
        ? await supabase.rpc("decrement_equiv_stock", { e_id: l.equivalence_id, qty: l.quantite })
        : await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
      if (e) throw e;
      fait.push({ product_id: l.product_id, equivalence_id: l.equivalence_id, ref: l.ref, quantite: -l.quantite });
    }
  } finally {
    // Montant = seulement les lignes vraiment rendues (si le réseau a coupé au milieu)
    const prix = new Map(lignes.map((l) => [`${l.product_id}|${l.equivalence_id ?? ""}`, l.prix_achat]));
    const montantFait = arrondi(fait.reduce((s, l) => s - l.quantite * (prix.get(`${l.product_id}|${l.equivalence_id ?? ""}`) ?? 0), 0));
    await supabase.from("receptions").update({ lignes: fait, montant: -montantFait }).eq("id", (data as { id: string }).id);
  }
}
