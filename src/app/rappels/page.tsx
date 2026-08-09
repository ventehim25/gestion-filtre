"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Client, Sale } from "@/types/database";
import { Phone, MessageCircle, AlertCircle } from "lucide-react";

type UnpaidClient = Client & { ventes: Sale[] };

export default function RappelsPage() {
  const { t } = useLang();
  const [data, setData] = useState<UnpaidClient[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function load() {
      // Paginé : sans .range(), la liste des impayés serait tronquée à 1000 ventes.
      const sales: (Sale & { client: Client | null })[] = [];
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase
          .from("sales")
          .select("*, client:clients(*)")
          .in("statut", ["en_attente", "partiel"])
          .order("date", { ascending: false })
          .range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        sales.push(...(data as unknown as (Sale & { client: Client | null })[]));
        if (data.length < 1000) break;
      }
      if (sales.length === 0) return;

      const map = new Map<string, UnpaidClient>();
      for (const s of sales) {
        const c = s.client as Client;
        if (!c) continue;
        if (!map.has(c.id)) map.set(c.id, { ...c, ventes: [] });
        map.get(c.id)!.ventes.push(s);
      }

      const list = Array.from(map.values());
      setData(list);
      setTotal(list.reduce((sum, c) => sum + c.ventes.reduce((s, v) => s + (v.total - v.montant_paye), 0), 0));
    }
    load();
  }, []);

  const unpaid = (client: UnpaidClient) =>
    client.ventes.reduce((s, v) => s + (v.total - v.montant_paye), 0);

  return (
    <div>
      <Header title="reminders" />

      <div className="card p-5 mb-6 flex items-center justify-between bg-red-50 border-red-200">
        <div className="flex items-center gap-3">
          <AlertCircle size={24} className="text-red-500" />
          <div>
            <p className="text-sm text-red-600 font-medium">{t("totalUnpaid")}</p>
            <p className="text-2xl font-bold text-red-700">{total.toFixed(2)} MAD</p>
          </div>
        </div>
        <p className="text-sm text-red-500">{data.length} {t("unpaidClients")}</p>
      </div>

      {data.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
          <p>Aucun impayé — tout est à jour !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map(c => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{c.nom}</p>
                  <p className="text-sm text-slate-500">{c.ville}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{unpaid(c).toFixed(2)} MAD</p>
                  <p className="text-xs text-slate-400">{c.ventes.length} vente(s)</p>
                </div>
              </div>

              {c.telephone && (
                <div className="flex gap-2 mb-3">
                  <a href={`tel:${c.telephone}`}
                    className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                    <Phone size={14} /> {c.telephone}
                  </a>
                  <a href={`https://wa.me/212${c.telephone.replace(/^0/, "")}?text=Bonjour%20${encodeURIComponent(c.nom)}%2C%20vous%20avez%20un%20solde%20de%20${unpaid(c).toFixed(2)}%20MAD%20%C3%A0%20r%C3%A9gler.`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                    <MessageCircle size={14} /> Rappel WhatsApp
                  </a>
                </div>
              )}

              <div className="space-y-1">
                {c.ventes.map(v => (
                  <div key={v.id} className="flex justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-600">{v.date}</span>
                    <span>Total: {v.total} MAD</span>
                    <span className="text-orange-600 font-medium">Reste: {(v.total - v.montant_paye).toFixed(2)} MAD</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
