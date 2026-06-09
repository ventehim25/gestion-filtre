"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/database";
import { Search, Printer, CheckSquare, Square } from "lucide-react";
import JsBarcode from "jsbarcode";

function barcodeSvg(value: string): string {
  try {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(el, value, { format: "CODE128", width: 1.5, height: 38, displayValue: false, margin: 2 });
    return (el as unknown as SVGElement).outerHTML;
  } catch { return ""; }
}

export default function EtiquettesPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const all: Product[] = [];
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.from("products").select("id, reference, nom_fr, code_barre").order("reference").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        all.push(...(data as Product[]));
        if (data.length < 1000) break;
      }
      setProducts(all);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return products.slice(0, 60);
    return products.filter(p => p.reference.toUpperCase().includes(s) || p.nom_fr.toUpperCase().includes(s)).slice(0, 300);
  }, [products, q]);

  const selected = products.filter(p => sel[p.id]);

  function toggleAll() {
    const allOn = filtered.every(p => sel[p.id]);
    const next = { ...sel };
    filtered.forEach(p => { next[p.id] = !allOn; });
    setSel(next);
  }

  function printLabels() {
    if (!selected.length) return;
    const labels = selected.map(p => {
      // Le code-barres encode la RÉFÉRENCE (le scan la retrouve), ou le code_barre si défini
      const value = p.code_barre || p.reference;
      return `<div class="lbl">${barcodeSvg(value)}<div class="ref">${p.reference}</div><div class="nm">${(p.nom_fr || "").slice(0, 38)}</div></div>`;
    }).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Étiquettes</title>
    <style>
      @page{size:A4;margin:8mm}
      *{box-sizing:border-box} body{font-family:Arial,sans-serif;margin:0}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
      .lbl{border:1px solid #e5e7eb;border-radius:5px;padding:5px 6px;text-align:center;
        page-break-inside:avoid;height:30mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
      .lbl svg{max-width:100%;height:38px}
      .lbl .ref{font-family:'Courier New',monospace;font-weight:bold;font-size:13px;margin-top:3px}
      .lbl .nm{font-size:8px;color:#666;line-height:1.1;margin-top:1px;max-height:18px;overflow:hidden}
      @media print{button{display:none}}
    </style></head><body>
    <button onclick="window.print()" style="margin:8px;padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer">Imprimer</button>
    <div class="grid">${labels}</div>
    </body></html>`);
    w.document.close();
  }

  return (
    <div>
      <Header title="labels" action={
        <button onClick={printLabels} disabled={!selected.length}
          className="btn-primary flex items-center gap-2 disabled:opacity-40">
          <Printer size={16} /> Imprimer ({selected.length})
        </button>
      } />

      <div className="card p-4 mb-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input ps-9 font-mono uppercase" placeholder="Chercher une référence ou un nom…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button onClick={toggleAll} className="btn-secondary flex items-center gap-2 shrink-0 text-sm">
            <CheckSquare size={15} /> Tout cocher
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Coche les produits puis clique « Imprimer ». Le code-barres encode la référence → scannable ensuite à la douchette. {q.trim() ? "" : "(Tape une recherche pour voir plus de produits.)"}</p>
      </div>

      <div className="card overflow-x-auto">
        <div className="divide-y divide-slate-100">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSel({ ...sel, [p.id]: !sel[p.id] })}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${sel[p.id] ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              {sel[p.id] ? <CheckSquare size={18} className="text-red-500 shrink-0" /> : <Square size={18} className="text-slate-500 shrink-0" />}
              <span className="font-mono text-sm text-slate-200 w-28 shrink-0">{p.reference}</span>
              <span className="text-sm text-slate-400 truncate">{p.nom_fr}</span>
              {p.code_barre && <span className="ms-auto text-[10px] text-green-400 shrink-0">code ✓</span>}
            </button>
          ))}
        </div>
        {!loading && filtered.length === 0 && <p className="text-center text-slate-400 py-10">{t("noData")}</p>}
        {loading && <p className="text-center text-slate-400 py-10">{t("loading")}</p>}
      </div>
    </div>
  );
}
