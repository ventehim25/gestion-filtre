"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types/database";

export type PickerVariant = { id: string; product_id: string; marque: string; reference: string };

// Sélecteur de produit par saisie de référence (autocomplétion) — plus rapide
// qu'un menu déroulant de milliers de produits.
// Avec `variants` : on trouve aussi un filtre par la référence d'une variante de marque
// (ex. « WL7009 » Wix → OE640/2) ; onSelect reçoit alors la variante en 2e argument.
export default function ProductPicker({
  products, value, onSelect, variants,
}: { products: Product[]; value: string; onSelect: (p: Product, v?: PickerVariant) => void; variants?: PickerVariant[] }) {
  const selected = products.find((p) => p.id === value) || null;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const matches = useMemo(() => {
    const norm = (r: string) => r.toUpperCase().replace(/\s+/g, "");
    const s = norm(q.trim());
    const prods = (s ? products.filter((p) => norm(p.reference).includes(s)) : products)
      .slice(0, 30).map((p) => ({ p, v: undefined as PickerVariant | undefined }));
    const vars = s && variants
      ? variants.filter((v) => norm(v.reference).includes(s) && byId.has(v.product_id))
          .slice(0, 30).map((v) => ({ p: byId.get(v.product_id)!, v }))
      : [];
    // Référence exacte en premier (Filtron ou marque), puis le reste
    const all = [...prods, ...vars];
    return all.sort((a, b) => Number(norm((b.v ?? b.p).reference) === s) - Number(norm((a.v ?? a.p).reference) === s)).slice(0, 30);
  }, [q, products, variants, byId]);

  const label = selected ? selected.reference : "";

  function pick(m: { p: Product; v?: PickerVariant }) {
    onSelect(m.p, m.v);
    setQ("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className="input font-mono"
        placeholder={variants ? "Réf. Filtron, Wix, Flag, Mann…" : "Réf. (ex : AK218/1)"}
        value={open ? q : label}
        onFocus={() => { setOpen(true); setQ(""); setHi(0); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (matches[hi]) pick(matches[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-[60] mt-1 w-full max-h-60 overflow-y-auto card p-1 shadow-xl">
          {matches.map((m, idx) => (
            <button
              key={m.v ? `v-${m.v.id}` : m.p.id}
              type="button"
              onMouseEnter={() => setHi(idx)}
              onClick={() => pick(m)}
              className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 ${idx === hi ? "bg-slate-700/50" : "hover:bg-slate-800/60"}`}
            >
              {m.v ? (
                <>
                  <span className="font-mono text-xs text-slate-100 shrink-0">{m.v.reference}</span>
                  <span className="text-xs text-indigo-300 shrink-0">{m.v.marque}</span>
                  <span className="text-[11px] text-slate-500 truncate">= {m.p.reference}</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-xs text-slate-100 shrink-0">{m.p.reference}</span>
                  {m.p.marque && m.p.marque !== "Filtron" && <span className="text-xs text-indigo-300 truncate">{m.p.marque}</span>}
                </>
              )}
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && matches.length === 0 && (
        <div className="absolute z-[60] mt-1 w-full card p-3 text-xs text-slate-400 shadow-xl">Aucune référence trouvée</div>
      )}
    </div>
  );
}
