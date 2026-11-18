// Échéancier (nouveauté n° 3, inspirée du logiciel « GMP » de dinoun — BIBLE §8.41).
// Trois listes, la plus urgente en haut :
//   • chèques REÇUS des clients pas encore encaissés (paiements_clients, mode chèque, noté à l'encaissement d'un bon)
//   • chèques DONNÉS aux fournisseurs pas encore débités (avances, mode chèque) → argent à avoir à la banque
//   • crédits clients (bons pas payés), du plus ancien au plus récent
// Le cron du matin (/api/cron/relances) envoie un rappel quand un chèque arrive à échéance.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Avance, PaiementClient } from "@/types/database";

export type ChequeClient = PaiementClient & { client_nom: string; client_tel: string | null };
export type ChequeFournisseur = Avance & { fournisseur_nom: string };
export type CreditClient = { client_id: string; nom: string; telephone: string | null; ville: string | null; solde: number; bons: number; plusAncien: string; derniere_relance: string | null };

export const aujourdhui = () => new Date().toISOString().slice(0, 10);
export const joursEntre = (de: string, a: string) => Math.round((Date.parse(a) - Date.parse(de)) / 864e5);

/** « en retard de 3 j » / « aujourd'hui » / « dans 5 j » / « sans date » + couleur. */
export function etatEcheance(date: string | null | undefined, today = aujourdhui()): { texte: string; urgence: 0 | 1 | 2 | 3 } {
  if (!date) return { texte: "sans date", urgence: 1 };
  const j = joursEntre(today, date);
  if (j < 0) return { texte: `en retard de ${-j} j`, urgence: 3 };
  if (j === 0) return { texte: "aujourd'hui", urgence: 3 };
  if (j <= 7) return { texte: `dans ${j} j`, urgence: 2 };
  return { texte: `le ${date.slice(8, 10)}/${date.slice(5, 7)}`, urgence: 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

async function toutLire<T>(db: Db, table: string, select: string, filtre: (q: any) => any): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: T[] = [];
  for (let i = 0; i < 50; i++) {
    const { data, error } = await filtre(db.from(table).select(select)).order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    out.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

export async function chequesClients(db: Db = supabase): Promise<ChequeClient[]> {
  type L = PaiementClient & { clients: { nom: string; telephone: string | null } | null };
  const l = await toutLire<L>(db, "paiements_clients", "*, clients(nom, telephone)", (q) => q.eq("mode", "cheque").eq("encaisse", false));
  return l.filter((p) => Number(p.montant) > 0)
    .map(({ clients, ...p }) => ({ ...p, client_nom: clients?.nom ?? "?", client_tel: clients?.telephone ?? null }))
    .sort((a, b) => (a.date_echeance ?? "9999").localeCompare(b.date_echeance ?? "9999"));
}

export async function chequesFournisseurs(db: Db = supabase): Promise<ChequeFournisseur[]> {
  type L = Avance & { fournisseurs: { nom: string } | null };
  const l = await toutLire<L>(db, "avances", "*, fournisseurs(nom)", (q) => q.eq("mode", "cheque").or("cheque_encaisse.is.null,cheque_encaisse.eq.false"));
  return l.map(({ fournisseurs, ...a }) => ({ ...a, fournisseur_nom: fournisseurs?.nom ?? "?" }))
    .sort((a, b) => (a.date_cheque ?? "9999").localeCompare(b.date_cheque ?? "9999"));
}

export async function creditsClients(db: Db = supabase): Promise<CreditClient[]> {
  type S = { client_id: string | null; date: string; total: number; montant_paye: number; statut: string };
  const ventes = await toutLire<S>(db, "sales", "id, client_id, date, total, montant_paye, statut", (q) => q.neq("statut", "paye"));
  const par = new Map<string, { solde: number; bons: number; plusAncien: string }>();
  for (const s of ventes) {
    const du = Number(s.total) - Number(s.montant_paye);
    if (!s.client_id || du <= 0.5) continue;
    const g = par.get(s.client_id) ?? { solde: 0, bons: 0, plusAncien: s.date };
    g.solde += du; g.bons++; if (s.date < g.plusAncien) g.plusAncien = s.date;
    par.set(s.client_id, g);
  }
  const ids = [...par.keys()];
  type C = { id: string; nom: string; telephone: string | null; ville: string | null; derniere_relance?: string | null };
  const infos = new Map<string, C>();
  for (let i = 0; i < ids.length; i += 200) {
    let r = await db.from("clients").select("id, nom, telephone, ville, derniere_relance").in("id", ids.slice(i, i + 200));
    if (r.error) r = await db.from("clients").select("id, nom, telephone, ville").in("id", ids.slice(i, i + 200)) as typeof r;
    for (const c of (r.data ?? []) as C[]) infos.set(c.id, c);
  }
  return ids.map((id) => {
    const c = infos.get(id); const g = par.get(id)!;
    return { client_id: id, nom: c?.nom ?? "?", telephone: c?.telephone ?? null, ville: c?.ville ?? null, solde: Math.round(g.solde), bons: g.bons, plusAncien: g.plusAncien, derniere_relance: c?.derniere_relance ?? null };
  }).sort((a, b) => a.plusAncien.localeCompare(b.plusAncien));
}

/** Chèque client encaissé à la banque. */
export async function encaisserCheque(id: string): Promise<string | null> {
  const { error } = await supabase.from("paiements_clients").update({ encaisse: true }).eq("id", id);
  return error?.message ?? null;
}

/** Chèque client REJETÉ (sans provision) : le client redoit l'argent. Le chèque est fermé (note ❌), une ligne
 *  négative annule le paiement, et le bon redevient à payer. Rien n'est effacé (historique gardé). */
export async function rejeterCheque(p: ChequeClient): Promise<string | null> {
  const today = aujourdhui();
  const { error } = await supabase.from("paiements_clients")
    .update({ encaisse: true, note: `❌ chèque rejeté le ${today.slice(8, 10)}/${today.slice(5, 7)}${p.note ? ` · ${p.note}` : ""}` }).eq("id", p.id);
  if (error) return error.message;
  await supabase.from("paiements_clients").upsert({
    sale_id: p.sale_id, client_id: p.client_id, date: today, montant: -Number(p.montant), mode: "cheque", cle: `rejet-${p.id}`,
    numero_cheque: p.numero_cheque, banque: p.banque, date_echeance: null, encaisse: true, note: "chèque rejeté : le client redoit",
  }, { onConflict: "sale_id,cle", ignoreDuplicates: true });
  if (p.sale_id) {
    const { data: s } = await supabase.from("sales").select("montant_paye").eq("id", p.sale_id).single();
    const paye = Math.max(0, Math.round((Number(s?.montant_paye ?? 0) - Number(p.montant)) * 100) / 100);
    await supabase.from("sales").update({ montant_paye: paye, statut: paye <= 0 ? "en_attente" : "partiel" }).eq("id", p.sale_id);
  }
  return null;
}

/** Résumé pour la notification du matin (cron) : chèques à encaisser aujourd'hui / en retard, chèques fournisseurs
 *  à couvrir dans les 3 jours. */
export async function resumeEcheancier(db: Db, today = aujourdhui()) {
  const [cc, cf] = await Promise.all([chequesClients(db).catch(() => []), chequesFournisseurs(db).catch(() => [])]);
  const aEncaisser = cc.filter((p) => p.date_echeance && p.date_echeance <= today);
  const aCouvrir = cf.filter((a) => a.date_cheque && joursEntre(today, a.date_cheque) <= 3);
  return {
    aEncaisser: aEncaisser.length, montantEncaisser: aEncaisser.reduce((s, p) => s + Number(p.montant), 0),
    aCouvrir: aCouvrir.length, montantCouvrir: aCouvrir.reduce((s, a) => s + Number(a.montant), 0),
  };
}
