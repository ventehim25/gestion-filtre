"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";

type MonthlyStat = { mois: string; total: number; count: number };
type CityStat = { ville: string; total: number };
type ProductStat = { nom: string; qty: number };
type PnlRow = { key: string; ca: number; cost: number; benef: number };

// Lundi de la semaine d'une date "YYYY-MM-DD"
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export default function StatsPage() {
  const { t } = useLang();
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [cities, setCities] = useState<CityStat[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
  // Coûts & bénéfices par période
  const [daily, setDaily] = useState<PnlRow[]>([]);
  const [weekly, setWeekly] = useState<PnlRow[]>([]);
  const [monthlyPnl, setMonthlyPnl] = useState<PnlRow[]>([]);
  const [gran, setGran] = useState<"jour" | "semaine" | "mois">("jour");

  useEffect(() => {
    async function load() {
      const [{ data: sales }, { data: items }] = await Promise.all([
        supabase.from("sales").select("date, total, client:clients(ville)"),
        supabase.from("sale_items").select("quantite, product:products(reference)"),
      ]);

      if (sales) {
        const byMonth: Record<string, { total: number; count: number }> = {};
        const byCity: Record<string, number> = {};

        for (const s of sales) {
          const mois = s.date?.slice(0, 7) ?? "";
          if (!byMonth[mois]) byMonth[mois] = { total: 0, count: 0 };
          byMonth[mois].total += s.total;
          byMonth[mois].count += 1;
          const ville = (s.client as { ville: string } | null)?.ville ?? "?";
          byCity[ville] = (byCity[ville] ?? 0) + s.total;
        }

        setMonthly(
          Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([mois, v]) => ({ mois, ...v }))
        );
        setCities(
          Object.entries(byCity)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([ville, total]) => ({ ville, total }))
        );
      }

      if (items) {
        const byProduct: Record<string, number> = {};
        for (const i of items) {
          const ref = (i.product as { reference: string } | null)?.reference ?? "?";
          byProduct[ref] = (byProduct[ref] ?? 0) + i.quantite;
        }
        setTopProducts(
          Object.entries(byProduct)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([nom, qty]) => ({ nom, qty }))
        );
      }

      // ----- Coûts & bénéfices par jour / semaine / mois -----
      const withItems: { date: string; total: number; items: { quantite: number; product: { prix_achat: number } | null }[] }[] = [];
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.from("sales")
          .select("date, total, items:sale_items(quantite, product:products(prix_achat))")
          .range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        withItems.push(...(data as unknown as typeof withItems));
        if (data.length < 1000) break;
      }
      const agg = (keyFn: (d: string) => string): Record<string, PnlRow> => {
        const m: Record<string, PnlRow> = {};
        for (const s of withItems) {
          if (!s.date) continue;
          const k = keyFn(s.date);
          const cost = (s.items ?? []).reduce((a, it) => a + it.quantite * (it.product?.prix_achat ?? 0), 0);
          if (!m[k]) m[k] = { key: k, ca: 0, cost: 0, benef: 0 };
          m[k].ca += s.total; m[k].cost += cost; m[k].benef += s.total - cost;
        }
        return m;
      };
      const toRows = (m: Record<string, PnlRow>, n: number) =>
        Object.values(m).sort((a, b) => b.key.localeCompare(a.key)).slice(0, n);
      setDaily(toRows(agg(d => d), 14));
      setWeekly(toRows(agg(d => weekStart(d)), 10));
      setMonthlyPnl(toRows(agg(d => d.slice(0, 7)), 12));
    }
    load();
  }, []);

  function pnlLabel(key: string): string {
    if (gran === "jour") return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
    if (gran === "semaine") return `Sem. du ${key.slice(8, 10)}/${key.slice(5, 7)}`;
    return `${key.slice(5, 7)}/${key.slice(0, 4)}`;
  }
  const pnlRows = gran === "jour" ? daily : gran === "semaine" ? weekly : monthlyPnl;

  const maxMonthly = Math.max(...monthly.map(m => m.total), 1);
  const maxCity = Math.max(...cities.map(c => c.total), 1);
  const maxProduct = Math.max(...topProducts.map(p => p.qty), 1);

  return (
    <div>
      <Header title="stats" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-4">{t("monthlySales")}</h3>
          {monthly.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">{t("noData")}</p>
          ) : (
            <div className="space-y-3">
              {monthly.map(m => (
                <div key={m.mois}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{m.mois}</span>
                    <span className="font-semibold text-slate-700">{m.total.toFixed(0)} MAD ({m.count} ventes)</span>
                  </div>
                  <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(m.total / maxMonthly) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-4">{t("salesByCity")}</h3>
          {cities.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">{t("noData")}</p>
          ) : (
            <div className="space-y-3">
              {cities.map(c => (
                <div key={c.ville}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{c.ville}</span>
                    <span className="font-semibold text-slate-700">{c.total.toFixed(0)} MAD</span>
                  </div>
                  <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(c.total / maxCity) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coûts & Bénéfices par période */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold text-slate-700">Coûts &amp; Bénéfices</h3>
          <div className="flex gap-1 bg-[var(--surface-2)] rounded-lg p-1">
            {(["jour", "semaine", "mois"] as const).map(g => (
              <button key={g} onClick={() => setGran(g)}
                className={`text-xs px-3 py-1.5 rounded-md capitalize transition-colors ${gran === g ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
        {pnlRows.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">{t("noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Période</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Ventes</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Coût</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Bénéfice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pnlRows.map(r => (
                  <tr key={r.key}>
                    <td className="px-3 py-2 text-slate-300">{pnlLabel(r.key)}</td>
                    <td className="px-3 py-2 text-right font-medium text-sky-400">{r.ca.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-orange-400">{r.cost.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-400">+{r.benef.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold">
                  <td className="px-3 py-2 text-slate-200">Total ({pnlRows.length})</td>
                  <td className="px-3 py-2 text-right text-sky-400">{pnlRows.reduce((a, r) => a + r.ca, 0).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right text-orange-400">{pnlRows.reduce((a, r) => a + r.cost, 0).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right text-emerald-400">+{pnlRows.reduce((a, r) => a + r.benef, 0).toFixed(0)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-[11px] text-slate-500 mt-2">Montants en MAD. Coût = prix d&apos;achat des articles vendus · Bénéfice = ventes − coût.</p>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4">{t("topProducts")}</h3>
        {topProducts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">{t("noData")}</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.nom} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="truncate max-w-xs font-mono">{p.nom}</span>
                    <span className="font-semibold text-slate-700 ms-2">{p.qty} pcs</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${(p.qty / maxProduct) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
