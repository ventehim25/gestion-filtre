// File d'attente des ventes enregistrées hors-ligne (stockée dans localStorage),
// synchronisée vers Supabase dès que le réseau revient.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaleStatus } from "@/types/database";

export type PendingLine = { product_id: string; quantite: number; prix_unitaire: number; nom: string; fournisseur_id?: string | null };
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

// Pousse les ventes en attente vers Supabase. S'arrête au 1er échec (réessaiera plus tard).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncPending(supabase: SupabaseClient<any>): Promise<{ done: number; left: number }> {
  let done = 0;
  for (const s of getPending()) {
    try {
      const { data: sale, error } = await supabase.from("sales").insert({
        client_id: s.client_id, date: s.date, total: s.total,
        montant_paye: s.montant_paye, statut: s.statut, notes: s.notes,
      }).select().single();
      if (error || !sale) throw error || new Error("insert sale");
      const { error: e2 } = await supabase.from("sale_items").insert(
        s.lines.map((l) => ({ sale_id: sale.id, product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire, fournisseur_id: l.fournisseur_id ?? null }))
      );
      if (e2) throw e2;
      for (const l of s.lines) {
        await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
      }
      removePending(s.localId);
      done++;
    } catch {
      break; // réseau/erreur : on garde le reste pour un prochain essai
    }
  }
  return { done, left: getPending().length };
}
