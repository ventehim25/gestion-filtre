"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types/database";

// Sélecteur de produit par saisie de référence (autocomplétion) — plus rapide
// qu'un menu déroulant de milliers de produits.
export default function ProductPicker({
  products, value, onSelect,
}: { products: Product[]; value: string; onSelect: (p: Product) => void }) {
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

  const matches = useMemo(() => {
    const s = q.trim().toUpperCase();
    const base = s
      ? products.filter((p) => p.reference.toUpperCase().includes(s))
      : products;
    return base.slice(0, 30);
  }, [q, products]);

  const label = selected ? selected.reference : "";

  function pick(p: Product) {
    onSelect(p);
    setQ("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className="input font-mono"
        placeholder="Réf. (ex : AK218/1)"
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
          {matches.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setHi(idx)}
              onClick={() => pick(p)}
              className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 ${idx === hi ? "bg-slate-700/50" : "hover:bg-slate-800/60"}`}
            >
              <span className="font-mono text-xs text-slate-100 shrink-0">{p.reference}</span>
              {p.marque && p.marque !== "Filtron" && <span className="text-xs text-indigo-300 truncate">{p.marque}</span>}
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
