// File d'attente des modifications de stock faites hors-ligne (localStorage),
// synchronisée vers Supabase au retour du réseau. Fusion par produit (dernière valeur).
import type { SupabaseClient } from "@supabase/supabase-js";

export type StockEdit = { stock?: number; stock_min?: number };
const KEY = "filtropro_pending_stock";

export function getPendingStock(): Record<string, StockEdit> {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function setPendingStock(map: Record<string, StockEdit>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}
export function pendingStockCount(): number {
  return Object.keys(getPendingStock()).length;
}
// Ajoute/fusionne des modifications (par product_id)
export function queueStock(edits: Record<string, StockEdit>) {
  const cur = getPendingStock();
  for (const [id, e] of Object.entries(edits)) {
    cur[id] = { ...cur[id], ...e };
  }
  setPendingStock(cur);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncStock(supabase: SupabaseClient<any>): Promise<{ done: number; left: number }> {
  const map = getPendingStock();
  let done = 0;
  for (const id of Object.keys(map)) {
    try {
      const { error } = await supabase.from("products").update(map[id]).eq("id", id);
      if (error) throw error;
      delete map[id];
      setPendingStock(map);
      done++;
    } catch {
      break; // on garde le reste pour un prochain essai
    }
  }
  return { done, left: Object.keys(getPendingStock()).length };
}
