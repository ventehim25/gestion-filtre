"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";

type MonthlyStat = { mois: string; total: number; count: number };
type CityStat = { ville: string; total: number };
type ProductStat = { nom: string; qty: number };

export default function StatsPage() {
  const { t } = useLang();
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [cities, setCities] = useState<CityStat[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: sales }, { data: items }] = await Promise.all([
        supabase.from("sales").select("date, total, client:clients(ville)"),
        supabase.from("sale_items").select("quantite, product:products(nom_fr)"),
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
          const nom = (i.product as { nom_fr: string } | null)?.nom_fr ?? "?";
          const shortName = nom.replace("Filtre ", "").replace("Filtron — ", "");
          byProduct[shortName] = (byProduct[shortName] ?? 0) + i.quantite;
        }
        setTopProducts(
          Object.entries(byProduct)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([nom, qty]) => ({ nom, qty }))
        );
      }
    }
    load();
  }, []);

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
                    <span className="truncate max-w-xs">{p.nom}</span>
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
