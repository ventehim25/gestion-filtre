// Bilan hebdomadaire WhatsApp (Bible §4.4) : bénéfice réel, encaissé/vendu,
// impayés, top 3, stock dormant, comparaison avec la semaine précédente.
import { supabase } from "./supabase";

function monday(d: Date): string {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

type Item = {
  product_id: string; equivalence_id: string | null; quantite: number;
  prix_unitaire: number; cout_unitaire: number | null;
  product: { reference: string; prix_achat: number } | null;
  sales: { date: string } | null;
};

export async function buildBilanHebdo(): Promise<string> {
  const today = new Date();
  const thisMon = monday(today);
  const prevMon = monday(new Date(today.getTime() - 7 * 86400000));
  const since90 = new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10);

  // Ventes (toutes — sert aussi aux impayés)
  const sales: { date: string; total: number; montant_paye: number; statut: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase.from("sales").select("date, total, montant_paye, statut").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    sales.push(...(data as typeof sales));
    if (data.length < 1000) break;
  }

  // Articles vendus sur 90 j (dormant + bénéfices des 2 dernières semaines)
  const items: Item[] = [];
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase.from("sale_items")
      .select("product_id, equivalence_id, quantite, prix_unitaire, cout_unitaire, product:products(reference, prix_achat), sales!inner(date)")
      .gte("sales.date", since90).range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    items.push(...(data as unknown as Item[]));
    if (data.length < 1000) break;
  }

  const benef = (list: Item[]) =>
    list.reduce((s, it) => s + it.quantite * (it.prix_unitaire - (it.cout_unitaire ?? it.product?.prix_achat ?? 0)), 0);
  const inWeek = (d: string | undefined, from: string, to: string) => !!d && d >= from && d < to;

  const itemsThis = items.filter(it => (it.sales?.date ?? "") >= thisMon);
  const itemsPrev = items.filter(it => inWeek(it.sales?.date, prevMon, thisMon));
  const benefThis = benef(itemsThis);
  const benefPrev = benef(itemsPrev);

  const salesThis = sales.filter(s => s.date >= thisMon);
  const vendu = salesThis.reduce((s, v) => s + v.total, 0);
  const encaisse = salesThis.reduce((s, v) => s + v.montant_paye, 0);

  const unpaid = sales.filter(s => s.statut !== "paye");
  const impayes = unpaid.reduce((s, v) => s + (v.total - v.montant_paye), 0);
  const oldest = unpaid.length ? unpaid.reduce((m, v) => (v.date < m ? v.date : m), unpaid[0].date) : null;
  const oldestDays = oldest ? Math.round((today.getTime() - new Date(oldest).getTime()) / 86400000) : 0;

  // Top 3 de la semaine
  const byRef = new Map<string, number>();
  for (const it of itemsThis) {
    const ref = it.product?.reference ?? "?";
    byRef.set(ref, (byRef.get(ref) ?? 0) + it.quantite);
  }
  const top3 = [...byRef.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Valeur dormante (rien vendu en 90 j, en stock, créé > 60 j)
  let valeurDormante = 0;
  {
    const soldP = new Set(items.map(i => i.product_id));
    const soldE = new Set(items.map(i => i.equivalence_id).filter(Boolean) as string[]);
    const cutoff60 = new Date(today.getTime() - 60 * 86400000).toISOString();
    const prods: { id: string; stock: number; prix_achat: number; created_at: string }[] = [];
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("products").select("id, stock, prix_achat, created_at").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      prods.push(...(data as typeof prods));
      if (data.length < 1000) break;
    }
    const prodById = new Map(prods.map(p => [p.id, p]));
    for (const p of prods) if (p.stock > 0 && !soldP.has(p.id) && p.created_at < cutoff60) valeurDormante += p.stock * p.prix_achat;
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("equivalences").select("id, product_id, stock, prix_achat").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      for (const e of data as { id: string; product_id: string; stock: number; prix_achat: number | null }[]) {
        const parent = prodById.get(e.product_id);
        if (parent && e.stock > 0 && !soldE.has(e.id) && parent.created_at < cutoff60)
          valeurDormante += e.stock * (e.prix_achat ?? parent.prix_achat);
      }
      if (data.length < 1000) break;
    }
  }

  const delta = benefPrev > 0 ? Math.round(((benefThis - benefPrev) / benefPrev) * 100) : null;
  const fleche = delta == null ? "" : delta >= 0 ? ` (▲ +${delta} % vs sem. passée)` : ` (▼ ${delta} % vs sem. passée)`;

  const lignes = [
    "📊 *FiltroPro — bilan de la semaine*",
    `📅 Semaine du ${thisMon.slice(8, 10)}/${thisMon.slice(5, 7)}`,
    "————————————",
    `💰 Bénéfice : *${benefThis.toFixed(0)} MAD*${fleche}`,
    `🏦 Encaissé / vendu : ${encaisse.toFixed(0)} / ${vendu.toFixed(0)} MAD${vendu > 0 ? ` (${Math.round((encaisse / vendu) * 100)} %)` : ""}`,
    `🔴 Impayés : ${impayes.toFixed(0)} MAD${oldestDays > 0 ? ` · le plus vieux : ${oldestDays} j` : ""}`,
    `💤 Stock dormant : ${valeurDormante.toFixed(0)} MAD (prix d'achat)`,
  ];
  if (top3.length) {
    lignes.push("🏆 Top de la semaine :");
    for (const [ref, q] of top3) lignes.push(`   • ${ref} ×${q}`);
  }
  lignes.push("————————————", "Les 5 chiffres du vendredi — Bible §7 🎯");
  return lignes.join("\n");
}
