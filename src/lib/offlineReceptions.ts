// File d'attente des réceptions (« Marchandise prise »), stockée dans localStorage :
// toute réception y passe, puis est envoyée ligne par ligne. La progression (`faites`) est
// mémorisée après chaque ligne -> une coupure réseau en plein envoi reprend là où elle s'est
// arrêtée, sans compter deux fois le stock. Hors-ligne : la réception attend le retour du réseau.
import { supabase } from "./supabase";
import type { ReceptionLigne } from "@/types/database";

export type RecLigneAttente = {
  product_id: string; equivalence_id: string | null; quantite: number; prix_achat: number; prix_vente: number;
  code_barre: string; nouvelleMarque: string | null; nouvelleRef: string; libelle: string;
};
export type ReceptionAttente = {
  id: string;               // id de la réception (créée une seule fois, même après coupure)
  fournisseur_id: string; date: string; montant: number; details: string;
  lignes: RecLigneAttente[];
  faites: number;           // lignes déjà appliquées (stock + prix)
  enregistree: boolean;     // ligne `receptions` créée
  detail: ReceptionLigne[]; // pour pouvoir annuler la réception plus tard
};

const KEY = "filtropro_receptions_attente";

export function getReceptionsAttente(): ReceptionAttente[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(list: ReceptionAttente[]) { localStorage.setItem(KEY, JSON.stringify(list)); }
function maj(r: ReceptionAttente) { save(getReceptionsAttente().map((x) => (x.id === r.id ? r : x))); }
export function ajouterReception(r: ReceptionAttente) { save([...getReceptionsAttente(), r]); }

async function ok<T extends { error: unknown }>(p: PromiseLike<T>): Promise<T> {
  const res = await p;
  if (res.error) throw res.error;
  return res;
}

// Applique une réception : ligne `receptions`, puis stock + prix + code-barres de chaque ligne.
async function appliquer(r: ReceptionAttente) {
  if (!r.enregistree) {
    const { error } = await supabase.from("receptions").insert({ id: r.id, fournisseur_id: r.fournisseur_id, date: r.date, montant: r.montant, details: r.details });
    if (error && !/duplicate|unique/i.test(error.message)) throw error; // déjà créée lors d'un essai coupé
    r.enregistree = true; maj(r);
  }
  while (r.faites < r.lignes.length) {
    const l = r.lignes[r.faites];
    const code = l.code_barre.trim() ? { code_barre: l.code_barre.trim() } : {};
    let eqId = l.equivalence_id;
    if (l.nouvelleMarque) {
      // Nouvelle variante de marque (réutilisée si elle existe déjà)
      const ref = l.nouvelleRef.trim();
      const { data: ex } = await ok(supabase.from("equivalences").select("id").eq("product_id", l.product_id).eq("marque", l.nouvelleMarque).ilike("reference", ref).limit(1));
      eqId = ex?.[0]?.id ?? null;
      if (!eqId) {
        const { data: created } = await ok(supabase.from("equivalences")
          .insert({ product_id: l.product_id, marque: l.nouvelleMarque, reference: ref, prix: null, prix_achat: null, stock: 0 }).select("id").single());
        eqId = created!.id;
      }
    }
    if (eqId) {
      await ok(supabase.rpc("decrement_equiv_stock", { e_id: eqId, qty: -l.quantite }));
      const upd = { ...(l.prix_achat > 0 && { prix_achat: l.prix_achat }), ...(l.prix_vente > 0 && { prix: l.prix_vente }), ...code };
      if (Object.keys(upd).length) await ok(supabase.from("equivalences").update(upd).eq("id", eqId));
    } else {
      await ok(supabase.rpc("decrement_stock", { p_id: l.product_id, qty: -l.quantite }));
      const upd = { ...(l.prix_achat > 0 && { prix_achat: l.prix_achat }), ...(l.prix_vente > 0 && { prix_vente: l.prix_vente }), ...code };
      if (Object.keys(upd).length) await ok(supabase.from("products").update(upd).eq("id", l.product_id));
    }
    r.detail.push({ product_id: l.product_id, equivalence_id: eqId, quantite: l.quantite, ref: l.libelle });
    r.faites++;
    maj(r); // progression sauvée APRÈS chaque ligne appliquée
  }
  // Détail pour l'annulation (colonne absente = SQL pas encore collé : la réception reste valable)
  await supabase.from("receptions").update({ lignes: r.detail }).eq("id", r.id);
}

// Envoie les réceptions en attente. S'arrête au 1er échec réseau (réessaiera plus tard).
export async function syncReceptions(): Promise<{ left: number; erreur?: string }> {
  for (const r of getReceptionsAttente()) {
    try {
      await appliquer(r);
      save(getReceptionsAttente().filter((x) => x.id !== r.id));
    } catch (e) {
      return { left: getReceptionsAttente().length, erreur: (e as { message?: string })?.message ?? String(e) };
    }
  }
  return { left: 0 };
}
