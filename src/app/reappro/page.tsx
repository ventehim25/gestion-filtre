"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/database";
import { MessageCircle, Printer, AlertTriangle } from "lucide-react";
import { sendWhatsApp } from "@/lib/whatsapp";
import StockBadge from "@/components/StockBadge";

function refCompare(a: string, b: string) {
  const parse = (r: string): [string, number, number, string] => {
    const m = r.toUpperCase().match(/^([A-Z]+)\s*(\d+)(?:\/(\d+))?(.*)$/);
    return m ? [m[1], parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : 0, m[4] || ""] : [r.toUpperCase(), 0, 0, ""];
  };
  const ka = parse(a), kb = parse(b);
  return ka[0].localeCompare(kb[0]) || ka[1] - kb[1] || ka[2] - kb[2] || ka[3].localeCompare(kb[3]);
}

export default function ReapproPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const all: Product[] = [];
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.from("products").select("*").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < 1000) break;
      }
      setProducts(all);
      setLoading(false);
    })();
  }, []);

  // Produits à recommander : stock <= seuil
  const low = useMemo(() =>
    products.filter(p => p.stock <= p.stock_min).sort((a, b) => refCompare(a.reference, b.reference)),
    [products]);

  // Sélection + quantité suggérée par défaut (remettre ~2x le seuil)
  useEffect(() => {
    if (!low.length) return;
    const s: Record<string, boolean> = {}, q: Record<string, number> = {};
    for (const p of low) { s[p.id] = true; q[p.id] = Math.max(1, p.stock_min * 2 - p.stock); }
    setSel(s); setQty(q);
  }, [low]);

  const selected = low.filter(p => sel[p.id]);

  function orderText() {
    const date = new Date().toLocaleDateString("fr-FR");
    const lignes = selected.map(p => `• ${p.reference} — ${p.nom_fr}  ×${qty[p.id] || 1}`).join("\n");
    return [
      "🧾 *Bon de commande — FiltroPro*",
      `📅 ${date}`,
      "————————————",
      lignes,
      "————————————",
      `📦 ${selected.length} référence(s) à commander`,
    ].join("\n");
  }

  function printOrder() {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = selected.map(p => `<tr><td>${p.reference}</td><td>${p.nom_fr}</td><td style="text-align:center">${p.stock}</td><td style="text-align:center;font-weight:bold">${qty[p.id] || 1}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon de commande</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;max-width:680px;margin:0 auto}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:7px;font-size:13px}th{background:#f3f4f6}.f{margin-top:18px;text-align:center;font-size:12px;color:#888}@media print{button{display:none}}</style>
    </head><body><h2>Bon de Commande — FiltroPro</h2><p>Date : ${new Date().toLocaleDateString("fr-FR")}</p>
    <table><thead><tr><th>Référence</th><th>Désignation</th><th>Stock actuel</th><th>À commander</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="f">FiltroPro — Pièces & Filtres Auto · Maroc</p>
    <button onclick="window.print()" style="margin-top:12px;padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer">Imprimer</button>
    </body></html>`);
    w.document.close();
  }

  return (
    <div>
      <Header title="reorder" action={
        <div className="flex gap-2">
          <button onClick={printOrder} disabled={!selected.length} className="btn-secondary flex items-center gap-2 disabled:opacity-40">
            <Printer size={16} /> <span className="hidden sm:inline">Imprimer</span>
          </button>
          <button onClick={() => sendWhatsApp(null, orderText())} disabled={!selected.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-40">
            <MessageCircle size={16} /> Commande WhatsApp
          </button>
        </div>
      } />

      <div className="card p-4 mb-4 flex items-center gap-3">
        <AlertTriangle size={22} className="text-yellow-400 shrink-0" />
        <div>
          <p className="font-semibold text-slate-100">{low.length} produit(s) à recommander</p>
          <p className="text-xs text-slate-400">Stock au niveau ou sous le seuil minimum. Coche/ajuste les quantités puis envoie la commande au fournisseur.</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["", "Référence", "Désignation", "Stock", "Seuil", "À commander"].map((h, i) => (
                <th key={i} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {low.map(p => (
              <tr key={p.id} className={sel[p.id] ? "bg-blue-50" : "hover:bg-slate-50"}>
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={!!sel[p.id]} onChange={e => setSel({ ...sel, [p.id]: e.target.checked })} className="h-4 w-4 accent-red-600" />
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{p.reference}</td>
                <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{p.nom_fr}</td>
                <td className="px-3 py-2.5"><StockBadge stock={p.stock} stockMin={p.stock_min} /></td>
                <td className="px-3 py-2.5 text-slate-400">{p.stock_min}</td>
                <td className="px-3 py-2.5">
                  <input type="number" min={1} className="input w-20 text-center font-mono py-1"
                    value={qty[p.id] ?? 1} onChange={e => setQty({ ...qty, [p.id]: Math.max(1, +e.target.value) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && low.length === 0 && <p className="text-center text-slate-400 py-10">✅ Aucun produit sous le seuil — stock OK.</p>}
        {loading && <p className="text-center text-slate-400 py-10">{t("loading")}</p>}
      </div>
    </div>
  );
}
