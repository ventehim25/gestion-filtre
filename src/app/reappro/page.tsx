"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/database";
import { MessageCircle, Printer, AlertTriangle, Check, Plus } from "lucide-react";
import { sendWhatsApp } from "@/lib/whatsapp";
import StockBadge from "@/components/StockBadge";

// Demandes « j'ai pas » agrégées par référence (Bible §4.12)
type Demande = { reference: string; count: number; last: string; ids: string[] };

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
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"seuil" | "demande">("seuil");
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [demandesOk, setDemandesOk] = useState(true);

  async function loadDemandes() {
    try {
      const rows: { id: string; reference: string; created_at: string }[] = [];
      for (let i = 0; i < 10; i++) {
        const { data, error } = await supabase.from("demandes_manquees")
          .select("id, reference, created_at").eq("traite", false)
          .order("created_at", { ascending: false }).range(i * 1000, i * 1000 + 999);
        if (error) { setDemandesOk(false); return; }
        if (!data || data.length === 0) break;
        rows.push(...(data as typeof rows));
        if (data.length < 1000) break;
      }
      const map = new Map<string, Demande>();
      for (const r of rows) {
        const cur = map.get(r.reference) ?? { reference: r.reference, count: 0, last: r.created_at, ids: [] };
        cur.count += 1;
        cur.ids.push(r.id);
        if (r.created_at > cur.last) cur.last = r.created_at;
        map.set(r.reference, cur);
      }
      setDemandes([...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)));
      setDemandesOk(true);
    } catch { setDemandesOk(false); }
  }

  async function marquerTraite(d: Demande) {
    await supabase.from("demandes_manquees").update({ traite: true }).in("id", d.ids);
    setDemandes(prev => prev.filter(x => x.reference !== d.reference));
  }

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
    loadDemandes();
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

      {/* Onglets : sous seuil (existant) / demandé « j'ai pas » (Bible §4.12) */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("seuil")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "seuil" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          Sous seuil ({low.length})
        </button>
        <button onClick={() => setTab("demande")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "demande" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          🔎 Demandé ({demandes.length})
          {demandes.some(d => d.count >= 3) && <span className="ms-1.5 inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />}
        </button>
      </div>

      {tab === "demande" && (
        <div className="card overflow-x-auto">
          {!demandesOk && (
            <p className="text-center text-slate-400 py-10 px-4">
              Table absente — colle le SQL <span className="font-mono text-slate-300">supabase/idees_bible_19_24.sql</span> dans l&apos;éditeur Supabase (Bible §4.12).
            </p>
          )}
          {demandesOk && demandes.length === 0 && (
            <p className="text-center text-slate-400 py-10 px-4">
              Aucune demande notée. Quand un client demande une référence que tu n&apos;as pas :
              Recherche → « ❌ J&apos;ai pas » — à la 3ᵉ demande, elle s&apos;allume ici.
            </p>
          )}
          {demandesOk && demandes.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Référence", "Demandé", "Dernière fois", ""].map((h, i) => (
                    <th key={i} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demandes.map(d => (
                  <tr key={d.reference} className={d.count >= 3 ? "bg-red-500/5" : "hover:bg-slate-50"}>
                    <td className="px-3 py-2.5 font-mono text-slate-200">{d.reference}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-semibold ${d.count >= 3 ? "text-red-400" : "text-slate-300"}`}>{d.count}×</span>
                      {d.count >= 3 && <span className="ms-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">à stocker</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{new Date(d.last).toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => router.push(`/recherche?q=${encodeURIComponent(d.reference)}`)}
                          className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/25" title="Créer / rechercher la référence">
                          <Plus size={12} /> Créer
                        </button>
                        <button onClick={() => marquerTraite(d)}
                          className="flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-2 py-1 rounded-lg hover:bg-green-500/25" title="Marquer traité">
                          <Check size={12} /> Traité
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "seuil" && (<>
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
      </>)}
    </div>
  );
}
