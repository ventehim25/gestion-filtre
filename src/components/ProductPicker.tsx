"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types/database";
import { avecDents } from "@/lib/categories";
import { chercherParOrigine, type ParOrigine } from "@/lib/origine";

export type PickerVariant = { id: string; product_id: string; marque: string; reference: string; stock?: number | null };

// Sélecteur de produit par saisie de référence (autocomplétion) — plus rapide
// qu'un menu déroulant de milliers de produits.
// Avec `variants` : on trouve aussi un filtre par la référence d'une variante de marque
// (ex. « WL7009 » Wix → OE640/2) ; onSelect reçoit alors la variante en 2e argument.
// Avec `onCreate` : la réf. tapée peut devenir une NOUVELLE pièce (Réception de distribution, BIBLE §8.30).
// Numéro d'origine (IVECO 5801 317097…) : cherché dans la base, espaces ignorés, voitures ET camions → onSelect reçoit
// alors { code, marqueCode } en 3e argument (BIBLE §8.39).
export default function ProductPicker({
  products, value, onSelect, variants, placeholder, onCreate, preferStock,
}: {
  products: Product[]; value: string; onSelect: (p: Product, v?: PickerVariant, origine?: { code: string; marqueCode: string; tape: string; marqueApp?: string | null }) => void; variants?: PickerVariant[];
  placeholder?: string; onCreate?: (reference: string) => void;
  // Vente (BIBLE §8.57) : ce qui est EN STOCK d'abord, quantité affichée ; une réf. à 0 touchée alors qu'UNE SEULE
  // réf. de la liste est en stock → « Tu voulais … ? » (le 22/11, AP149/10 vendu au lieu de fa943 Flag = AP149/1)
  preferStock?: boolean;
}) {
  const [externe, setExterne] = useState<Product | null>(null); // fiche choisie par numéro d'origine (peut être hors liste)
  const selected = products.find((p) => p.id === value) || (externe?.id === value ? externe : null);
  const [q, setQ] = useState("");
  const [origines, setOrigines] = useState<ParOrigine[]>([]);
  // Numéros d'origine : demandé à la base 350 ms après la frappe (5 caractères au moins)
  useEffect(() => {
    const t = q.trim();
    if (t.replace(/[^A-Za-z0-9]/g, "").length < 4) { setOrigines([]); return; }
    let actif = true;
    const id = setTimeout(() => { chercherParOrigine(t).then((r) => { if (actif) setOrigines(r); }).catch(() => {}); }, 350);
    return () => { actif = false; clearTimeout(id); };
  }, [q]);
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
    // Kit / courroie de distribution : retrouvé aussi par son nombre de dents (« 141/25 », BIBLE §8.33)
    const dents = (p: Product) => (avecDents(p.categorie) && p.dimensions ? norm(p.dimensions) : "");
    const prods = (s ? products.filter((p) => norm(p.reference).includes(s) || (!!dents(p) && dents(p).includes(s))) : products)
      .slice(0, 30).map((p) => ({ p, v: undefined as PickerVariant | undefined }));
    const vars = s && variants
      ? variants.filter((v) => norm(v.reference).includes(s) && byId.has(v.product_id))
          .slice(0, 30).map((v) => ({ p: byId.get(v.product_id)!, v }))
      : [];
    // Référence exacte en premier (Filtron ou marque), puis le reste — en vente : ce qui est en stock avant tout
    const all = [...prods, ...vars];
    const enStock = (m: { p: Product; v?: PickerVariant }) => Number((m.v ? m.v.stock ?? 0 : m.p.stock) > 0);
    return all.sort((a, b) => (preferStock ? enStock(b) - enStock(a) : 0)
      || Number(norm((b.v ?? b.p).reference) === s) - Number(norm((a.v ?? a.p).reference) === s)).slice(0, 30);
  }, [q, products, variants, byId, preferStock]);
  const stockDe = (m: { p: Product; v?: PickerVariant }) => (m.v ? m.v.stock ?? null : m.p.stock);

  const originesAffichees = origines.filter((o) => !matches.some((m) => m.p.id === o.produit.id && !m.v));
  const label = selected ? selected.reference : "";

  function pick(m: { p: Product; v?: PickerVariant }) {
    if (preferStock && (stockDe(m) ?? 0) <= 0) {
      const dispo = matches.filter((x) => (stockDe(x) ?? 0) > 0);
      if (dispo.length === 1) {
        const d = dispo[0];
        const nom = d.v ? `${d.v.reference} (${d.v.marque}) = Filtron ${d.p.reference}` : d.p.reference;
        if (confirm(`« ${(m.v ?? m.p).reference} » n'est pas en stock.\n\nTu voulais ${nom} (${stockDe(d)} en stock) ?\n\nOK = prendre ${nom} · Annuler = garder « ${(m.v ?? m.p).reference} »`)) m = d;
      }
    }
    onSelect(m.p, m.v);
    setQ("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className="input font-mono"
        placeholder={placeholder ?? (variants ? "Réf. Filtron, Wix, Flag, Mann…" : "Réf. (ex : AK218/1)")}
        value={open ? q : label}
        onFocus={() => { setOpen(true); setQ(""); setHi(0); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (matches[hi]) pick(matches[hi]); else if (onCreate && q.trim()) { onCreate(q.trim()); setQ(""); setOpen(false); } }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (matches.length > 0 || originesAffichees.length > 0) && (
        <div className="absolute z-[60] mt-1 w-full max-h-60 overflow-y-auto card p-1 shadow-xl">
          {matches.map((m, idx) => (
            <button
              key={m.v ? `v-${m.v.id}` : m.p.id}
              type="button"
              onMouseEnter={() => setHi(idx)}
              onClick={() => pick(m)}
              className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 ${idx === hi ? "bg-slate-700/50" : "hover:bg-slate-800/60"}`}
            >
              {preferStock && (stockDe(m) != null) && (
                <span className={`order-last ms-auto shrink-0 text-[10px] rounded-full px-1.5 py-0.5 ${(stockDe(m) ?? 0) > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/60 text-slate-400"}`}>{(stockDe(m) ?? 0) > 0 ? `stock ${stockDe(m)}` : "stock 0"}</span>
              )}
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
                  {avecDents(m.p.categorie) && m.p.dimensions && <span className="text-[11px] text-amber-300 shrink-0">🦷 {m.p.dimensions}</span>}
                </>
              )}
            </button>
          ))}
          {originesAffichees.length > 0 && <p className="px-2 pt-1.5 text-[10px] uppercase text-slate-500">Équivalences (autre marque ou numéro d&apos;origine)</p>}
          {originesAffichees.map((o) => (
            <button key={`o-${o.produit.id}`} type="button"
              onClick={() => { setExterne(o.produit); onSelect(o.produit, undefined, { code: o.code, marqueCode: o.marqueCode, tape: q.trim(), marqueApp: o.marqueApp ?? null }); setQ(""); setOpen(false); }}
              className="w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 hover:bg-slate-800/60">
              <span className="font-mono text-xs text-slate-100 shrink-0">{o.code}</span>
              <span className="text-xs text-indigo-300 shrink-0">{o.marqueCode}</span>
              <span className="text-[11px] text-amber-300 truncate">= {o.produit.marque || "Filtron"} {o.produit.reference}{o.produit.vehicule === "camion" ? " · 🚛" : ""}{o.source === "filtron" ? " · catalogue Filtron" : ""}</span>
            </button>
          ))}
          {onCreate && originesAffichees.length > 0 && matches.length === 0 && (
            <button type="button" onClick={() => { onCreate(q.trim()); setQ(""); setOpen(false); }}
              className="w-full text-left px-2 py-1.5 rounded-md text-amber-300/80 hover:bg-amber-500/10 text-xs">
              ➕ Ce n&apos;est pas ça : nouvelle pièce « {q.trim().toUpperCase()} »
            </button>
          )}
        </div>
      )}
      {open && q.trim() && matches.length === 0 && originesAffichees.length === 0 && (
        <div className="absolute z-[60] mt-1 w-full card p-1 text-xs text-slate-400 shadow-xl">
          <p className="px-2 py-1.5">Aucune référence trouvée</p>
          {onCreate && (
            <button type="button" onClick={() => { onCreate(q.trim()); setQ(""); setOpen(false); }}
              className="w-full text-left px-2 py-2 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 font-medium">
              ➕ Nouvelle pièce « {q.trim().toUpperCase()} »
            </button>
          )}
        </div>
      )}
    </div>
  );
}
