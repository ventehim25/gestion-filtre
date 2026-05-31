"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { TrendingUp, Users, Package, AlertTriangle } from "lucide-react";

type Stats = {
  totalVentes: number;
  totalClients: number;
  totalProduits: number;
  stockFaible: number;
  benefice: number;
  duFournisseur: number;
};

export default function Dashboard() {
  const { t } = useLang();
  const [stats, setStats] = useState<Stats>({
    totalVentes: 0, totalClients: 0, totalProduits: 0,
    stockFaible: 0, benefice: 0, duFournisseur: 0,
  });

  useEffect(() => {
    async function load() {
      const [{ count: clients }, { count: produits }, { data: sales }, { data: stockFaible }, { data: saleItems }] =
        await Promise.all([
          supabase.from("clients").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("sales").select("total, montant_paye"),
          supabase.from("products").select("id").lte("stock", 2),
          supabase.from("sale_items").select("quantite, prix_unitaire, product:products(prix_achat)"),
        ]);

      const totalVentes = sales?.reduce((s, v) => s + v.total, 0) ?? 0;
      const duFournisseur = sales?.reduce((s, v) => s + (v.total - v.montant_paye), 0) ?? 0;
      const benefice = (saleItems ?? []).reduce((s: number, i: { quantite: number; prix_unitaire: number; product: { prix_achat: number } | null }) => {
        const achat = i.product?.prix_achat ?? 0;
        return s + (i.prix_unitaire - achat) * i.quantite;
      }, 0);

      setStats({
        totalVentes,
        totalClients: clients ?? 0,
        totalProduits: produits ?? 0,
        stockFaible: stockFaible?.length ?? 0,
        benefice,
        duFournisseur,
      });
    }
    load();
  }, []);

  const cards = [
    { label: t("totalSales"), value: `${stats.totalVentes.toFixed(0)} ${t("moroccanDirham")}`, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
    { label: t("totalClients"), value: stats.totalClients, icon: Users, color: "text-green-600 bg-green-50" },
    { label: t("totalProducts"), value: stats.totalProduits, icon: Package, color: "text-purple-600 bg-purple-50" },
    { label: t("lowStock"), value: stats.stockFaible, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div>
      <Header title="dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{c.label}</span>
              <span className={`p-2 rounded-lg ${c.color}`}>
                <c.icon size={18} />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-1">{t("toSupplier")}</h3>
          <p className="text-3xl font-bold text-orange-600">
            {stats.duFournisseur.toFixed(2)} {t("moroccanDirham")}
          </p>
          <p className="text-xs text-slate-400 mt-1">Montant dû à votre fournisseur</p>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-1">{t("profit")}</h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.benefice.toFixed(2)} {t("moroccanDirham")}
          </p>
          <p className="text-xs text-slate-400 mt-1">Bénéfice net estimé</p>
        </div>
      </div>
    </div>
  );
}
