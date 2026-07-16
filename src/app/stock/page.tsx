"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product, ProductCategory } from "@/types/database";
import { Search, Minus, Plus, Save, RotateCcw, Check, PackageX, ScanLine, Camera, X, Link2, CloudOff, RefreshCw } from "lucide-react";
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import CategoryIcon from "@/components/CategoryIcon";
import BarcodeScanner from "@/components/BarcodeScanner";
import { queueStock, pendingStockCount, syncStock } from "@/lib/offlineStock";

const CATEGORIES: ProductCategory[] = [
  "filtre_huile", "filtre_air", "filtre_carburant",
  "filtre_habitacle", "filtre_refroidissement", "huile_moteur", "autre",
];

const categoryKeys: Record<ProductCategory, "filterOil" | "filterAir" | "filterFuel" | "filterCabin" | "filterCooling" | "motorOil" | "other"> = {
  filtre_huile: "filterOil",
  filtre_air: "filterAir",
  filtre_carburant: "filterFuel",
  filtre_habitacle: "filterCabin",
  filtre_refroidissement: "filterCooling",
  huile_moteur: "motorOil",
  autre: "other",
};

const BRANDS = ["Filtron", "Mann", "Bosch", "Champion", "Purflux", "Mahle", "Hengst", "UFI", "Flag", "Filtrex", "Fram"];
const PAGE_SIZE = 60;

// Tri naturel par référence : préfixe (lettres) puis numéro puis variante /n puis suffixe
function refCompare(a: string, b: string) {
  const parse = (r: string): [string, number, number, string] => {
    const m = r.toUpperCase().match(/^([A-Z]+)\s*(\d+)(?:\/(\d+))?(.*)$/);
    return m ? [m[1], parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : 0, m[4] || ""] : [r.toUpperCase(), 0, 0, ""];
  };
  const ka = parse(a), kb = parse(b);
  return ka[0].localeCompare(kb[0]) || ka[1] - kb[1] || ka[2] - kb[2] || ka[3].localeCompare(kb[3]);
}

type Edit = { stock?: number; stock_min?: number };

export default function StockPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pendingSync, setPendingSync] = useState(0); // modifs stock hors-ligne en attente

  // Filtres
  const [refSearch, setRefSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [onlyOut, setOnlyOut] = useState(false);
  const [page, setPage] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // --- Scan code-barres ---
  const [scanMode, setScanMode] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null); // code inconnu à associer
  const [linkSearch, setLinkSearch] = useState("");
  const scanFieldRef = useRef<HTMLInputElement | null>(null);
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    const all: Product[] = [];
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("products").select("*").order("nom_fr").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
    }
    setProducts(all);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Synchronisation des modifs de stock faites hors-ligne (au montage + retour réseau)
  useEffect(() => {
    setPendingSync(pendingStockCount());
    (async () => {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const { left } = await syncStock(supabase);
        setPendingSync(left);
      }
    })();
    const onOnline = async () => { const { left } = await syncStock(supabase); setPendingSync(left); if (left === 0) load(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Valeur effective (modifiée ou d'origine)
  const effStock = (p: Product) => edits[p.id]?.stock ?? p.stock;
  const effMin = (p: Product) => edits[p.id]?.stock_min ?? p.stock_min;

  function setEdit(p: Product, field: keyof Edit, value: number) {
    const v = Math.max(0, Math.floor(value || 0));
    setEdits(prev => {
      const orig = field === "stock" ? p.stock : p.stock_min;
      const next = { ...prev };
      const cur = { ...next[p.id], [field]: v };
      // Si la valeur revient à l'origine, on nettoie le champ
      if (cur[field] === orig) delete cur[field];
      if (cur.stock === undefined && cur.stock_min === undefined) delete next[p.id];
      else next[p.id] = cur;
      return next;
    });
  }

  function flash(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 2800);
  }

  // +1 au stock sur un produit (via le système d'édition en attente)
  function bump(p: Product) {
    const nv = effStock(p) + 1;
    setEdit(p, "stock", nv);
    flash(true, `${p.reference} +1 → ${nv}`);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
  }

  // Traite un code scanné (douchette ou caméra)
  function handleScan(raw: string) {
    const code = raw.trim();
    if (!code || linkCode) return; // ignore si une association est déjà en cours
    const found = products.find(p =>
      (p.code_barre && p.code_barre === code) ||
      p.reference.toUpperCase() === code.toUpperCase());
    if (found) {
      bump(found);
    } else {
      setLinkCode(code);
      setLinkSearch("");
      flash(false, `Code inconnu : ${code} — associez-le à une référence`);
    }
  }

  // Associe un code-barres inconnu à une référence (persiste immédiatement) puis +1
  async function linkAndBump(p: Product) {
    if (!linkCode) return;
    await supabase.from("products").update({ code_barre: linkCode }).eq("id", p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, code_barre: linkCode } : x));
    setLinkCode(null);
    setLinkSearch("");
    bump({ ...p, code_barre: linkCode });
    setTimeout(() => scanFieldRef.current?.focus(), 50);
  }

  const linkMatches = useMemo(() => {
    if (!linkCode) return [];
    const q = linkSearch.trim().toUpperCase();
    if (!q) return [];
    return products
      .filter(p => p.reference.toUpperCase().includes(q) || p.nom_fr.toUpperCase().includes(q))
      .sort((a, b) => refCompare(a.reference, b.reference))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkCode, linkSearch, products]);

  const filtered = useMemo(() => products.filter(p => {
    const matchRef = !refSearch || p.reference.toUpperCase().includes(refSearch) || p.nom_fr.toLowerCase().includes(refSearch.toLowerCase());
    const matchBrand = !brandFilter || p.nom_fr.includes(brandFilter);
    const matchCat = !catFilter || p.categorie === catFilter;
    const matchOut = !onlyOut || effStock(p) <= 0;
    return matchRef && matchBrand && matchCat && matchOut;
  }).sort((a, b) => refCompare(a.reference, b.reference)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, refSearch, brandFilter, catFilter, onlyOut, edits]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // Revenir page 0 quand un filtre change
  useEffect(() => { setPage(0); }, [refSearch, brandFilter, catFilter, onlyOut]);

  const pendingCount = Object.keys(edits).length;
  const outCount = useMemo(() => products.filter(p => effStock(p) <= 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, edits]);

  async function saveAll() {
    const ids = Object.keys(edits);
    if (ids.length === 0) return;
    setSaving(true);
    const payloads: Record<string, Edit> = {};
    for (const id of ids) {
      payloads[id] = {};
      if (edits[id].stock !== undefined) payloads[id].stock = edits[id].stock;
      if (edits[id].stock_min !== undefined) payloads[id].stock_min = edits[id].stock_min;
    }
    let onlineOk = false;
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        for (const id of ids) {
          const { error } = await supabase.from("products").update(payloads[id]).eq("id", id);
          if (error) throw error;
        }
        onlineOk = true;
      } catch { onlineOk = false; }
    }
    if (!onlineOk) {
      queueStock(payloads);          // mise en file hors-ligne
      setPendingSync(pendingStockCount());
    }
    // Met à jour l'affichage local (optimiste) dans tous les cas
    setProducts(prev => prev.map(p => edits[p.id]
      ? { ...p, stock: effStock(p), stock_min: effMin(p) }
      : p));
    setEdits({});
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  async function doSyncStock() {
    setSaving(true);
    const { left } = await syncStock(supabase);
    setPendingSync(left);
    setSaving(false);
    if (left === 0) load();
  }

  function focusNext(idx: number) {
    const el = inputRefs.current[idx + 1];
    if (el) { el.focus(); el.select(); }
  }

  return (
    <div>
      <Header title="stockEntry" action={
        <div className="flex items-center gap-2">
          <button onClick={() => { setScanMode(v => !v); setTimeout(() => scanFieldRef.current?.focus(), 50); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              scanMode ? "bg-red-600 text-white" : "btn-secondary"}`}>
            <ScanLine size={16} /> <span className="hidden sm:inline">Scan</span>
          </button>
          {pendingCount > 0 && (
            <button onClick={() => setEdits({})} className="btn-secondary flex items-center gap-2">
              <RotateCcw size={15} /> <span className="hidden sm:inline">{t("cancel")}</span>
            </button>
          )}
          <button onClick={saveAll} disabled={pendingCount === 0 || saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            {savedFlash ? <Check size={16} /> : <Save size={16} />}
            {savedFlash ? t("saved") : `${t("saveAll")}${pendingCount ? ` (${pendingCount})` : ""}`}
          </button>
        </div>
      } />

      {pendingSync > 0 && (
        <div className="card p-3 mb-4 flex items-center justify-between" style={{ borderColor: "rgba(234,179,8,0.4)" }}>
          <span className="text-sm text-yellow-400 flex items-center gap-2">
            <CloudOff size={16} /> {pendingSync} modification(s) de stock hors-ligne — en attente de synchronisation
          </span>
          <button onClick={doSyncStock} disabled={saving} className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50">
            <RefreshCw size={14} className={saving ? "animate-spin" : ""} /> Synchroniser
          </button>
        </div>
      )}

      {/* Bandeau d'info */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-3">
          <p className="text-xs text-slate-500">{t("totalProducts")}</p>
          <p className="text-xl font-bold text-slate-100">{products.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-slate-500">{t("outOfStock")}</p>
          <p className="text-xl font-bold text-red-400">{outCount}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-slate-500">{t("pendingChanges")}</p>
          <p className="text-xl font-bold text-blue-400">{pendingCount}</p>
        </div>
      </div>

      {/* Barre de scan */}
      {scanMode && (
        <div className="card p-4 mb-4 border-red-500/40">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
              <input
                ref={scanFieldRef}
                autoFocus
                className="input ps-9 font-mono"
                placeholder="Scannez ici (douchette) ou tapez le code + Entrée"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); handleScan(scanInput); setScanInput(""); }
                }} />
            </div>
            <button onClick={() => setCamOpen(true)} className="btn-primary flex items-center gap-2 shrink-0">
              <Camera size={16} /> Caméra
            </button>
          </div>
          {feedback && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              feedback.ok ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
              {feedback.ok ? <Check size={15} /> : <Link2 size={15} />} {feedback.msg}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Chaque scan ajoute <b>+1</b> au stock. Un code inconnu vous demande de l&apos;associer une seule fois, puis devient automatique.
            N&apos;oubliez pas <b>« Tout enregistrer »</b> à la fin.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9" placeholder={t("searchByRef")} value={refSearch}
            onChange={e => setRefSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="">{t("allBrands")}</option>
          {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="input w-44" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">{t("category")} — tous</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{t(categoryKeys[c])}</option>)}
        </select>
        <button onClick={() => setOnlyOut(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
            onlyOut ? "bg-red-600 text-white" : "btn-secondary"}`}>
          <PackageX size={15} /> {t("onlyOutOfStock")}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t("reference"), t("category"), t("stock"), "Stock min", t("status")].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((p, idx) => {
              const modified = !!edits[p.id];
              return (
                <tr key={p.id} className={modified ? "bg-blue-50" : "hover:bg-slate-50"}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <FilterImage reference={p.reference} categorie={p.categorie} imageUrl={p.image_url} wid={80} className="h-9 w-9 rounded object-contain bg-white shrink-0 border border-slate-700/50 p-0.5" />
                      <span className="font-mono text-xs text-slate-300">{p.reference}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><CategoryIcon categorie={p.categorie} size={15} className="text-red-400" /> {t(categoryKeys[p.categorie])}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEdit(p, "stock", effStock(p) - 1)}
                        className="h-7 w-7 rounded-md bg-slate-700/40 hover:bg-slate-600 text-slate-200 flex items-center justify-center shrink-0"><Minus size={14} /></button>
                      <input
                        ref={el => { inputRefs.current[idx] = el; }}
                        type="number" min={0}
                        className="input w-16 text-center font-mono py-1"
                        value={effStock(p)}
                        onFocus={e => e.target.select()}
                        onChange={e => setEdit(p, "stock", +e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); focusNext(idx); } }} />
                      <button onClick={() => setEdit(p, "stock", effStock(p) + 1)}
                        className="h-7 w-7 rounded-md bg-slate-700/40 hover:bg-slate-600 text-slate-200 flex items-center justify-center shrink-0"><Plus size={14} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={0}
                      className="input w-16 text-center font-mono py-1"
                      value={effMin(p)}
                      onFocus={e => e.target.select()}
                      onChange={e => setEdit(p, "stock_min", +e.target.value)} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StockBadge stock={effStock(p)} stockMin={effMin(p)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <p className="text-center text-slate-400 py-10">{t("noData")}</p>}
        {loading && <p className="text-center text-slate-400 py-10">{t("loading")}</p>}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
            className="btn-secondary disabled:opacity-40">‹</button>
          <span className="text-sm text-slate-400">
            {safePage + 1} / {pageCount} · {filtered.length} réf.
          </span>
          <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}
            className="btn-secondary disabled:opacity-40">›</button>
        </div>
      )}

      {/* Scanner caméra */}
      {camOpen && <BarcodeScanner onScan={handleScan} onClose={() => setCamOpen(false)} />}

      {/* Association d'un code inconnu */}
      {linkCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Link2 size={18} className="text-red-400" /> Associer un code-barres</h3>
              <button onClick={() => { setLinkCode(null); setTimeout(() => scanFieldRef.current?.focus(), 50); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-1">Code scanné :</p>
            <p className="font-mono text-lg text-slate-100 bg-slate-800/60 rounded-lg px-3 py-2 mb-4">{linkCode}</p>
            <p className="text-sm text-slate-400 mb-2">Choisissez la référence à laquelle l&apos;associer :</p>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus className="input ps-9 font-mono" placeholder="Tapez une référence (ex: OP540)"
                value={linkSearch} onChange={e => setLinkSearch(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
              {linkMatches.map(p => (
                <button key={p.id} onClick={() => linkAndBump(p)}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-slate-800/60 text-left rounded-lg transition-colors">
                  <FilterImage reference={p.reference} categorie={p.categorie} imageUrl={p.image_url} wid={80} className="h-9 w-9 rounded object-contain bg-white shrink-0 border border-slate-700/50 p-0.5" />
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-slate-200">{p.reference}</p>
                    <p className="text-xs text-slate-500 truncate">{p.nom_fr}</p>
                  </div>
                  <span className="ms-auto text-xs text-slate-400">stock {effStock(p)}</span>
                </button>
              ))}
              {linkSearch.trim() && linkMatches.length === 0 && (
                <p className="text-center text-slate-500 py-6 text-sm">{t("noRefFound")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
