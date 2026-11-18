// Banque (nouveauté n° 8, BIBLE §8.41) : le compte en banque, mouvement par mouvement (banque_mouvements, + entrée / − sortie).
// Notés tout seuls : chèque client encaissé (Échéancier), chèque fournisseur débité, virement d'un client, dépense
// payée par banque / chèque. À la main : dépôt d'espèces (sort de la caisse), retrait (entre dans la caisse), frais…
// `lien` (ex. « paiement:<id> ») évite de noter deux fois le même mouvement.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { BanqueMouvement } from "@/types/database";

export const TYPES_BANQUE: { cle: BanqueMouvement["type"]; libelle: string; sens: 1 | -1 }[] = [
  { cle: "depot", libelle: "💵 Dépôt d'espèces (sort de la caisse)", sens: 1 },
  { cle: "retrait", libelle: "🏧 Retrait d'espèces (entre dans la caisse)", sens: -1 },
  { cle: "virement_recu", libelle: "⬇ Virement reçu", sens: 1 },
  { cle: "virement_emis", libelle: "⬆ Virement envoyé", sens: -1 },
  { cle: "cheque", libelle: "🧾 Chèque", sens: 1 },
  { cle: "frais", libelle: "🏦 Frais bancaires", sens: -1 },
  { cle: "autre", libelle: "Autre", sens: 1 },
];
export const libelleBanque = (t: string) => TYPES_BANQUE.find((x) => x.cle === t)?.libelle ?? t;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

/** Note un mouvement (jamais deux fois le même `lien`). Ne bloque jamais : table absente = rien. */
export async function noterBanque(m: { date?: string; montant: number; type: BanqueMouvement["type"]; note?: string | null; lien?: string | null }, db: Db = supabase): Promise<void> {
  if (!m.montant) return;
  if (m.lien) {
    const { data } = await db.from("banque_mouvements").select("id").eq("lien", m.lien).limit(1);
    if (data?.length) return;
  }
  const { error } = await db.from("banque_mouvements").insert({
    date: m.date ?? new Date().toISOString().slice(0, 10), montant: Math.round(m.montant * 100) / 100, type: m.type, note: m.note ?? null, lien: m.lien ?? null,
  });
  if (error && !/schema cache|does not exist|PGRST205/i.test(error.message + (error.code ?? ""))) console.warn("banque non notée :", error.message);
}

/** Enlève le mouvement lié (ex. chèque remis « pas encaissé »). */
export async function enleverBanque(lien: string): Promise<void> {
  await supabase.from("banque_mouvements").delete().eq("lien", lien);
}

export async function mouvementsBanque(): Promise<BanqueMouvement[]> {
  const out: BanqueMouvement[] = [];
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.from("banque_mouvements").select("*").order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    out.push(...(data as BanqueMouvement[]));
    if (data.length < 1000) break;
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}
