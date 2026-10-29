// Cadence de relance par le catalogue (demandée par l'utilisateur) :
//  - un client qui A ACHETÉ        → à relancer 15 jours après la vente ;
//  - un client RELANCÉ SANS VENTE  → à relancer 5 jours après la relance.
// Sert à la fois à la page /relances-catalogue (affichage + envoi 1-tap) et au cron
// qui déclenche la notification push.
import { supabase } from "./supabase";

const addDays = (d: string, n: number) => {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
};

// Date à laquelle le client devient « à relancer » (null = pas de signal).
export function relanceDueDate(lastSale: string | null, lastRelance: string | null): string | null {
  // A acheté depuis la dernière relance (ou jamais relancé) → 15 j après la vente.
  if (lastSale && (!lastRelance || lastRelance <= lastSale)) return addDays(lastSale, 15);
  // Relancé mais pas d'achat depuis → 5 j après la relance.
  if (lastRelance) return addDays(lastRelance, 5);
  return null;
}

export type RelanceClient = {
  id: string; nom: string; telephone: string | null;
  lastSale: string | null; derniereRelance: string | null; due: string; jours: number;
};

// Charge tous les clients « à relancer aujourd'hui ». Paginé. Repli si la colonne
// derniere_relance_catalogue n'existe pas encore (SQL non collé) → traitée comme null.
export async function loadRelancesCatalogue(today = new Date().toISOString().slice(0, 10)): Promise<RelanceClient[]> {
  type Cl = { id: string; nom: string; telephone: string | null; derniere_relance_catalogue?: string | null };
  const clients: Cl[] = [];
  for (let i = 0; i < 10; i++) {
    let res = await supabase.from("clients").select("id, nom, telephone, derniere_relance_catalogue").range(i * 1000, i * 1000 + 999);
    if (res.error) res = await supabase.from("clients").select("id, nom, telephone").range(i * 1000, i * 1000 + 999); // colonne absente
    const data = res.data as Cl[] | null;
    if (!data || data.length === 0) break;
    clients.push(...data);
    if (data.length < 1000) break;
  }

  const lastSale = new Map<string, string>();
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase.from("sales").select("client_id, date").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    for (const s of data as { client_id: string | null; date: string | null }[]) {
      if (!s.client_id || !s.date) continue;
      const cur = lastSale.get(s.client_id);
      if (!cur || s.date > cur) lastSale.set(s.client_id, s.date);
    }
    if (data.length < 1000) break;
  }

  const out: RelanceClient[] = [];
  for (const c of clients) {
    const ls = lastSale.get(c.id) ?? null;
    const lr = c.derniere_relance_catalogue ?? null;
    const due = relanceDueDate(ls, lr);
    if (due && today >= due) {
      const jours = Math.round((new Date(today).getTime() - new Date(due).getTime()) / 86400000);
      out.push({ id: c.id, nom: c.nom, telephone: c.telephone, lastSale: ls, derniereRelance: lr, due, jours });
    }
  }
  out.sort((a, b) => a.due.localeCompare(b.due)); // le plus en retard d'abord
  return out;
}

// --- Relances IMPAYÉS (cadence 15 jours) ---
// Clients avec un solde dû > 0 qui n'ont pas été relancés (impayé) depuis >= `days` jours.
// Réutilise la colonne clients.derniere_relance (déjà posée par §4.1, clients_segments.sql),
// la même que la carte « À relancer » de l'accueil → relancer depuis l'accueil remet le compteur.
export type ImpayeRelance = { id: string; nom: string; telephone: string | null; solde: number };

export async function loadImpayesRelance(days = 15, today = new Date().toISOString().slice(0, 10)): Promise<{ clients: ImpayeRelance[]; total: number }> {
  type Cl = { id: string; nom: string; telephone: string | null; derniere_relance?: string | null };
  const clients: Cl[] = [];
  for (let i = 0; i < 10; i++) {
    let res = await supabase.from("clients").select("id, nom, telephone, derniere_relance").range(i * 1000, i * 1000 + 999);
    if (res.error) res = await supabase.from("clients").select("id, nom, telephone").range(i * 1000, i * 1000 + 999);
    const data = res.data as Cl[] | null;
    if (!data || data.length === 0) break;
    clients.push(...data);
    if (data.length < 1000) break;
  }
  const info = new Map(clients.map(c => [c.id, c]));

  const debt = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase.from("sales").select("client_id, total, montant_paye, statut").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    for (const s of data as { client_id: string | null; total: number; montant_paye: number; statut: string }[]) {
      if (!s.client_id || s.statut === "paye") continue;
      debt.set(s.client_id, (debt.get(s.client_id) ?? 0) + (s.total - s.montant_paye));
    }
    if (data.length < 1000) break;
  }

  const cutoff = addDays(today, -days); // relancé avant cette date = dû
  const out: ImpayeRelance[] = [];
  let total = 0;
  for (const [cid, solde] of debt) {
    if (solde <= 0) continue;
    const c = info.get(cid);
    if (!c) continue;
    if (c.derniere_relance && c.derniere_relance > cutoff) continue; // relancé il y a < 15 j → on laisse
    out.push({ id: cid, nom: c.nom, telephone: c.telephone, solde });
    total += solde;
  }
  out.sort((a, b) => b.solde - a.solde); // plus gros solde d'abord
  return { clients: out, total };
}

// --- Produits à recommander (stock <= seuil) — pour la notif réappro du matin ---
export async function countReapproDue(): Promise<number> {
  let n = 0;
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from("products").select("stock, stock_min").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    for (const p of data as { stock: number; stock_min: number }[]) if (p.stock <= p.stock_min) n++;
    if (data.length < 1000) break;
  }
  return n;
}

// --- Clients endormis (Bible §4.14) — pour la notif « à réveiller » du matin ---
// Même logique que la carte accueil : >=2 achats, écart dépassant leur rythme habituel,
// pas réveillé depuis 30 j (clients.derniere_relance_com).
export async function loadEndormis(today = new Date().toISOString().slice(0, 10)): Promise<{ id: string; nom: string }[]> {
  type Cl = { id: string; nom: string; derniere_relance_com?: string | null };
  const clients: Cl[] = [];
  for (let i = 0; i < 10; i++) {
    let res = await supabase.from("clients").select("id, nom, derniere_relance_com").range(i * 1000, i * 1000 + 999);
    if (res.error) res = await supabase.from("clients").select("id, nom").range(i * 1000, i * 1000 + 999);
    const data = res.data as Cl[] | null;
    if (!data || data.length === 0) break;
    clients.push(...data);
    if (data.length < 1000) break;
  }
  const info = new Map(clients.map(c => [c.id, c]));

  const byClient = new Map<string, string[]>();
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase.from("sales").select("client_id, date").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    for (const s of data as { client_id: string | null; date: string | null }[]) {
      if (!s.client_id || !s.date) continue;
      const a = byClient.get(s.client_id) ?? []; a.push(s.date); byClient.set(s.client_id, a);
    }
    if (data.length < 1000) break;
  }

  const todayMs = new Date(today).getTime();
  const snooze = addDays(today, -30);
  const out: { id: string; nom: string }[] = [];
  for (const [cid, dates] of byClient) {
    if (dates.length < 2) continue;
    const c = info.get(cid); if (!c) continue;
    if (c.derniere_relance_com && c.derniere_relance_com >= snooze) continue;
    const sorted = [...dates].sort();
    const first = new Date(sorted[0]).getTime();
    const last = new Date(sorted[sorted.length - 1]).getTime();
    const freq = (last - first) / (86400000 * (sorted.length - 1));
    if (!(freq > 0)) continue;
    const daysSince = Math.round((todayMs - last) / 86400000);
    if (daysSince > freq * 1.2 && daysSince >= 7) out.push({ id: cid, nom: c.nom });
  }
  return out;
}
