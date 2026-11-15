// File d'attente des ventes enregistrées hors-ligne (stockée dans localStorage),
// synchronisée vers Supabase dès que le réseau revient.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaleStatus } from "@/types/database";

export type PendingLine = { product_id: string; quantite: number; prix_unitaire: number; nom: string; fournisseur_id?: string | null; equivalence_id?: string | null; cout_unitaire?: number | null };
export type PendingSale = {
  localId: string;
  client_id: string;
  clientNom: string;
  clientTel: string | null;
  date: string;
  lines: PendingLine[];
  total: number;
  statut: SaleStatus;
  montant_paye: number;
  notes: string | null;
  createdAt: number;
  // Avancement de l'envoi (reprise sans doublon si le réseau coupe au milieu)
  saleId?: string;
  venteFaite?: boolean;
  articlesFaits?: boolean;
  stockFait?: number[];
};

const KEY = "filtropro_pending_sales";

export function getPending(): PendingSale[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function setPending(list: PendingSale[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
export function addPending(s: PendingSale) {
  setPending([...getPending(), s]);
}
export function removePending(localId: string) {
  setPending(getPending().filter((s) => s.localId !== localId));
}

// Note l'avancement d'une vente en attente (pour reprendre là où le réseau a coupé)
function avancer(localId: string, patch: Partial<PendingSale>) {
  setPending(getPending().map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pousse les ventes en attente vers Supabase. S'arrête au 1er échec (réessaiera plus tard).
// SANS DOUBLON (15/11/2026) : si le réseau coupe au milieu, le prochain essai reprend à l'étape suivante :
//   1) la vente a pour identifiant le localId créé sur le téléphone → on la retrouve au lieu d'en créer une 2e ;
//   2) les articles (une seule insertion, tout ou rien) ne sont envoyés que s'il n'y en a pas encore ;
//   3) le stock est décompté ligne par ligne, chaque ligne faite est notée → jamais décomptée deux fois.
// La vente reste sur le téléphone tant que tout n'est pas confirmé par le serveur.
// Un seul envoi à la fois par vente (le retour du réseau, le chargement de la page et la vente elle-même
// peuvent le lancer ensemble) et une seule synchronisation complète à la fois.
let enCours: Promise<{ done: number; left: number }> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function syncPending(supabase: SupabaseClient<any>): Promise<{ done: number; left: number }> {
  if (!enCours) enCours = (async () => {
    let done = 0;
    for (const s of getPending()) {
      if (await envoyerVente(supabase, s.localId)) done++;
      else break; // réseau/erreur : on garde le reste pour un prochain essai
    }
    return { done, left: getPending().length };
  })().finally(() => { enCours = null; });
  return enCours;
}

const envois = new Map<string, Promise<boolean>>();
/** Envoie UNE vente gardée sur le téléphone (true = enregistrée sur le serveur et retirée de l'attente). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function envoyerVente(supabase: SupabaseClient<any>, localId: string): Promise<boolean> {
  let p = envois.get(localId);
  if (!p) {
    p = envoyerUne(supabase, localId).finally(() => envois.delete(localId));
    envois.set(localId, p);
  }
  return p;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function envoyerUne(supabase: SupabaseClient<any>, localId: string): Promise<boolean> {
  const s = getPending().find((x) => x.localId === localId);
  if (!s) return true; // déjà envoyée
  {
    try {
      const champs = { client_id: s.client_id, date: s.date, total: s.total, montant_paye: s.montant_paye, statut: s.statut, notes: s.notes };
      let saleId = s.saleId ?? (UUID.test(s.localId) ? s.localId : null);

      // 1) La vente
      if (!s.venteFaite) {
        if (saleId) {
          const deja = await supabase.from("sales").select("id").eq("id", saleId).maybeSingle();
          if (deja.error) throw deja.error;
          if (!deja.data) {
            const { error } = await supabase.from("sales").insert({ id: saleId, ...champs });
            if (error && error.code !== "23505") throw error; // 23505 = déjà là (envoi précédent arrivé) : on continue
          }
        } else {
          const { data, error } = await supabase.from("sales").insert(champs).select("id").single();
          if (error || !data) throw error || new Error("insert sale");
          saleId = (data as { id: string }).id;
        }
        avancer(s.localId, { saleId: saleId!, venteFaite: true });
      }

      // 2) Les articles
      if (!s.articlesFaits) {
        const deja = await supabase.from("sale_items").select("id", { count: "exact", head: true }).eq("sale_id", saleId!);
        if (deja.error) throw deja.error;
        if (!deja.count) {
          const { error: e2 } = await supabase.from("sale_items").insert(
            s.lines.map((l) => ({ sale_id: saleId!, product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire, fournisseur_id: l.fournisseur_id ?? null, equivalence_id: l.equivalence_id ?? null, cout_unitaire: l.cout_unitaire ?? null }))
          );
          if (e2) throw e2;
        }
        avancer(s.localId, { articlesFaits: true });
      }

      // 3) Le stock, ligne par ligne
      const faits = new Set(s.stockFait ?? []);
      for (let i = 0; i < s.lines.length; i++) {
        if (faits.has(i)) continue;
        const l = s.lines[i];
        // decompter_stock_vente (supabase/protection.sql) note (vente, ligne) avec le décompte : un 2e envoi ne décompte
        // plus rien, même si la réponse du 1er s'est perdue. Pas encore créée (PGRST202) : ancienne méthode.
        let r = await supabase.rpc("decompter_stock_vente", { p_sale: saleId!, p_ligne: i, p_product: l.equivalence_id ? null : l.product_id, p_equiv: l.equivalence_id ?? null, p_qty: l.quantite });
        if (r.error?.code === "PGRST202") r = l.equivalence_id
          ? await supabase.rpc("decrement_equiv_stock", { e_id: l.equivalence_id, qty: l.quantite })
          : await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
        // Réseau coupé ou serveur en panne : on réessaiera. Refus du serveur (produit supprimé…) : on ne bloque pas les ventes suivantes.
        if (r.error && (!r.status || r.status >= 500)) throw r.error;
        faits.add(i);
        avancer(s.localId, { stockFait: [...faits] });
      }

      removePending(s.localId);
      return true;
    } catch {
      return false; // réseau/erreur : la vente reste sur le téléphone, avec son avancement
    }
  }
}
