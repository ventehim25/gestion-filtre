"use client";
export const dynamic = "force-dynamic";
import { Fragment, useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product, ProductCategory, Equivalence } from "@/types/database";
import { Plus, Search, Pencil, Trash2, X, Repeat, Eye, EyeOff, Car, Truck, Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { sendWhatsApp } from "@/lib/whatsapp";
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import CategoryIcon from "@/components/CategoryIcon";
import { classifyKind } from "@/lib/vehicleType";
import VoiceButton from "@/components/VoiceButton";

const CATEGORIES: ProductCategory[] = [
  "filtre_huile", "filtre_air", "filtre_carburant",
  "filtre_habitacle", "filtre_refroidissement", "autre",
];

const categoryKeys: Record<ProductCategory, keyof ReturnType<typeof useLang>["t"] extends (k: infer K) => string ? K : never> = {
  filtre_huile: "filterOil",
  filtre_air: "filterAir",
  filtre_carburant: "filterFuel",
  filtre_habitacle: "filterCabin",
  filtre_refroidissement: "filterCooling",
  autre: "other",
};

const empty = { nom_fr: "", nom_ar: "", reference: "", marque: "Filtron", categorie: "filtre_huile" as ProductCategory, prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 2, notes: "", prix_promo: 0 };

// Tri naturel par référence : préfixe (lettres) puis numéro puis variante /n puis suffixe
function refCompare(a: string, b: string) {
  const parse = (r: string): [string, number, number, string] => {
    const m = r.toUpperCase().match(/^([A-Z]+)\s*(\d+)(?:\/(\d+))?(.*)$/);
    return m ? [m[1], parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : 0, m[4] || ""] : [r.toUpperCase(), 0, 0, ""];
  };
  const ka = parse(a), kb = parse(b);
  return ka[0].localeCompare(kb[0]) || ka[1] - kb[1] || ka[2] - kb[2] || ka[3].localeCompare(kb[3]);
}

export default function ProduitsPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [equivs, setEquivs] = useState<{ id?: string; marque: string; reference: string; prix?: number; prix_achat?: number; stock?: number }[]>([]);
  const [newEquiv, setNewEquiv] = useState({ marque: "Flag", reference: "", prix: 0, prix_achat: 0, stock: 0 });
  const [showAutoEquivs, setShowAutoEquivs] = useState(false);
  const [vehMap, setVehMap] = useState<Record<string, { makes: string[]; nb: number }>>({});
  const [equivMap, setEquivMap] = useState<Record<string, { id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number }[]>>({});

  async function load() {
    // Pagination : récupère toutes les lignes (Supabase limite à 1000/requête)
    const all: Product[] = [];
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("products").select("*").order("nom_fr").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
    }
    setProducts(all);

    // Variantes de marque (équivalences) par produit
    const eqMap: Record<string, { id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number }[]> = {};
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("equivalences").select("id, product_id, marque, reference, prix, prix_achat, stock").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      data.forEach((e: { id: string; product_id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number | null }) => {
        (eqMap[e.product_id] ??= []).push({ id: e.id, marque: e.marque, reference: e.reference, prix: e.prix, prix_achat: e.prix_achat, stock: e.stock ?? 0 });
      });
      if (data.length < 1000) break;
    }
    setEquivMap(eqMap);

    // Résumé véhicules (marques compatibles) par produit
    const map: Record<string, { makes: string[]; nb: number }> = {};
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("product_vehicles").select("*").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      data.forEach((r: { product_id: string; makes: string[] | null; nb: number | null }) => {
        map[r.product_id] = { makes: r.makes ?? [], nb: r.nb ?? 0 };
      });
      if (data.length < 1000) break;
    }
    setVehMap(map);
  }

  function vehSummary(p: Product) {
    const v = vehMap[p.id];
    if (v && v.makes.length) return v.makes.join(", ") + (v.nb > v.makes.length ? ` +${v.nb - v.makes.length}` : "");
    const dash = p.nom_fr.split("—")[1];
    return dash ? dash.trim() : "";
  }

  useEffect(() => { load(); }, []);

  async function save() {
    let productId = editing?.id;
    const payload = { ...form, prix_promo: form.prix_promo > 0 ? form.prix_promo : null };
    if (editing) {
      await supabase.from("products").update(payload).eq("id", editing.id);
    } else {
      const { data: inserted } = await supabase.from("products").insert(payload).select().single();
      productId = (inserted as Product | null)?.id;
    }
    // Synchronise les équivalences (supprime puis réinsère)
    if (productId) {
      await supabase.from("equivalences").delete().eq("product_id", productId);
      const rows = equivs.filter(e => e.marque.trim() && e.reference.trim())
        .map(e => ({ product_id: productId!, marque: e.marque.trim(), reference: e.reference.trim(), prix: e.prix && e.prix > 0 ? e.prix : null, prix_achat: e.prix_achat && e.prix_achat > 0 ? e.prix_achat : null, stock: e.stock ?? 0 }));
      if (rows.length) await supabase.from("equivalences").insert(rows);
    }
    setShowForm(false); setEditing(null); setForm(empty); setEquivs([]); setNewEquiv({ marque: "Flag", reference: "", prix: 0, prix_achat: 0, stock: 0 });
    load();
  }

  async function remove(id: string) {
    if (confirm(t("confirm") + " " + t("delete") + "?")) {
      await supabase.from("products").delete().eq("id", id);
      load();
    }
  }

  async function removeVariant(equivId: string, label: string) {
    if (confirm(`Supprimer la variante « ${label} » ?`)) {
      await supabase.from("equivalences").delete().eq("id", equivId);
      load();
    }
  }

  async function startEdit(p: Product) {
    setEditing(p);
    setForm({ nom_fr: p.nom_fr, nom_ar: p.nom_ar, reference: p.reference, marque: p.marque ?? "Filtron", categorie: p.categorie, prix_achat: p.prix_achat, prix_vente: p.prix_vente, stock: p.stock, stock_min: p.stock_min, notes: p.notes ?? "", prix_promo: p.prix_promo ?? 0 });
    const { data } = await supabase.from("equivalences").select("*").eq("product_id", p.id);
    setEquivs((data as Equivalence[] | null)?.map(e => ({ id: e.id, marque: e.marque, reference: e.reference, prix: e.prix ?? undefined, prix_achat: e.prix_achat ?? undefined, stock: e.stock ?? 0 })) ?? []);
    setNewEquiv({ marque: "Flag", reference: "", prix: 0, prix_achat: 0, stock: 0 });
    setShowAutoEquivs(false);
    setShowForm(true);
  }

  function openNew() {
    setShowForm(true); setEditing(null); setForm(empty); setEquivs([]); setNewEquiv({ marque: "Flag", reference: "", prix: 0, prix_achat: 0, stock: 0 }); setShowAutoEquivs(false);
  }

  // Diffuse les produits en promo (prix_promo > 0) par WhatsApp
  function promoWhatsApp() {
    const promos = products.filter(p => (p.prix_promo ?? 0) > 0);
    if (promos.length === 0) { alert("Aucun produit en promo. Mets un « prix promo » sur des produits d'abord (Modifier)."); return; }
    const lignes = promos.map(p => `• ${p.reference} — ${p.nom_fr}\n   ${p.prix_vente} ➜ *${p.prix_promo} MAD*`).join("\n");
    const text = ["🔥 *PROMOS FiltroPro* 🔥", "", lignes, "", "Dispo jusqu'à épuisement du stock.", "📞 06 02 35 02 90"].join("\n");
    sendWhatsApp(null, text);
  }

  function addEquivRow() {
    if (!newEquiv.reference.trim()) return;
    setEquivs([...equivs, { marque: newEquiv.marque, reference: newEquiv.reference.trim(), prix: newEquiv.prix || undefined, prix_achat: newEquiv.prix_achat || undefined, stock: newEquiv.stock || 0 }]);
    setNewEquiv({ marque: newEquiv.marque, reference: "", prix: 0, prix_achat: 0, stock: 0 });
  }

  const BRANDS = ["Filtron", "Flag", "Filtrex", "Mann", "Wix", "Bosch", "Champion", "Purflux", "Mahle", "Hengst", "UFI", "Fram"];
  const [brandFilter, setBrandFilter] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showCost, setShowCost] = useState(false);
  const [kindFilter, setKindFilter] = useState<"" | "voiture" | "camion">("voiture"); // défaut : voitures

  // Normalise une référence : sans espaces, en majuscules (wl 7510 ↔ wl7510)
  const norm = (s: string) => s.toUpperCase().replace(/\s+/g, "");
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const qn = norm(search);
    const eqs = equivMap[p.id] ?? [];
    const matchSearch = !q || p.nom_fr.toLowerCase().includes(q) || norm(p.reference).includes(qn) || p.nom_ar.includes(search)
      || eqs.some(e => norm(e.reference).includes(qn) || e.marque.toLowerCase().includes(q));
    const refN = norm(refSearch);
    const matchRef = !refSearch || norm(p.reference).startsWith(refN) || eqs.some(e => norm(e.reference).startsWith(refN));
    const matchBrand = !brandFilter || p.nom_fr.includes(brandFilter);
    const matchCat = !catFilter || p.categorie === catFilter;
    const matchKind = !kindFilter || classifyKind(p.reference, vehMap[p.id]?.makes) === kindFilter;
    return matchSearch && matchRef && matchBrand && matchCat && matchKind;
  }).sort((a, b) => refCompare(a.reference, b.reference));

  return (
    <div>
      <Header title="products" action={
        <div className="flex items-center gap-2">
          <button onClick={promoWhatsApp} className="btn-secondary flex items-center gap-2" title="Diffuser les promos sur WhatsApp">
            <Megaphone size={15} /> <span className="hidden sm:inline">Promo WhatsApp</span>
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">{t("addProduct")}</span>
          </button>
        </div>
      } />

      {/* Sélecteur type véhicule : sépare voitures et bus/camions */}
      <div className="flex gap-1.5 mb-4">
        {([
          { v: "voiture", label: t("vehCar"), icon: Car },
          { v: "camion", label: t("vehTruck"), icon: Truck },
          { v: "", label: t("vehAll"), icon: null },
        ] as const).map(({ v, label, icon: Icon }) => (
          <button key={v} onClick={() => setKindFilter(v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              kindFilter === v ? "bg-red-600 text-white shadow-lg shadow-red-950/40" : "btn-secondary"}`}>
            {Icon && <Icon size={16} />} {label}
          </button>
        ))}
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9" placeholder={t("searchByCar")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <VoiceButton onResult={(txt) => setSearch(txt)} />
        <div className="relative min-w-40">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9 font-mono uppercase" placeholder={t("searchByRef")} value={refSearch} onChange={e => setRefSearch(e.target.value.toUpperCase())} />
        </div>
        <select className="input w-40" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="">{t("allBrands")}</option>
          {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="input w-44" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">{t("category")} — tous</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{t(categoryKeys[c])}</option>)}
        </select>
        <button onClick={() => setShowCost(v => !v)} title={t("buyPrice")}
          className="btn-secondary flex items-center gap-2 shrink-0">
          {showCost ? <EyeOff size={15} /> : <Eye size={15} />}
          <span className="hidden sm:inline">{showCost ? t("buyPrice") : t("buyPrice") + " 🔒"}</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-4">{editing ? t("edit") : t("addProduct")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500 mb-1 block">{t("reference")}</label><input className="input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Marque</label>
                <select className="input" value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })}>
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("category")}</label>
                <select className="input" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value as ProductCategory })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(categoryKeys[c])}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("buyPrice")} (MAD)</label><input type="number" className="input" value={form.prix_achat} onChange={e => setForm({ ...form, prix_achat: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("sellPrice")} (MAD)</label><input type="number" className="input" value={form.prix_vente} onChange={e => setForm({ ...form, prix_vente: +e.target.value })} /></div>
              <div><label className="text-xs text-rose-400 mb-1 block">Prix promo (MAD) — 0 = pas de promo</label><input type="number" className="input" value={form.prix_promo} onChange={e => setForm({ ...form, prix_promo: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("stock")}</label><input type="number" className="input" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Stock min</label><input type="number" className="input" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: +e.target.value })} /></div>
            </div>

            {/* Variantes de marque — Filtron + équivalents sur une seule grille */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Repeat size={15} /> Variantes de marque</label>
              <p className="text-xs text-slate-400 mb-2">La ligne Filtron reprend les infos du produit ci-dessus. Ajoute les marques équivalentes avec leur référence, prix et quantité.</p>

              <div className="rounded-lg border border-slate-200 overflow-x-auto">
                {/* En-tête */}
                <div className="grid grid-cols-[76px_1fr_50px_50px_44px_24px] gap-1.5 items-center px-2.5 py-1.5 bg-slate-100 text-[10px] font-semibold uppercase text-slate-500 min-w-[330px]">
                  <span>Marque</span>
                  <span>Référence</span>
                  <span className="text-center">Achat</span>
                  <span className="text-center">Vente</span>
                  <span className="text-center">Qté</span>
                  <span></span>
                </div>

                {/* Ligne Filtron (le produit lui-même, lecture seule) */}
                <div className="grid grid-cols-[76px_1fr_50px_50px_44px_24px] gap-1.5 items-center px-2.5 py-2 bg-amber-50 border-t border-slate-200 min-w-[330px]">
                  <span className="text-xs font-bold text-amber-700">Filtron</span>
                  <span className="text-sm font-mono truncate text-slate-700">{form.reference || <span className="text-slate-300">— réf. —</span>}</span>
                  <span className="text-xs text-center text-slate-600">{form.prix_achat || "—"}</span>
                  <span className="text-xs text-center text-slate-600">{form.prix_vente || "—"}</span>
                  <span className="text-xs text-center text-slate-600">{form.stock || "—"}</span>
                  <span></span>
                </div>

                {/* Marques équivalentes éditables — les OE auto (sans prix) sont masquées par défaut.
                    Liste plafonnée + défilement interne pour garder la ligne d'ajout visible. */}
                <div className="max-h-[34vh] overflow-y-auto">
                {equivs.map((e, i) => {
                  const isAuto = (e.prix == null && e.prix_achat == null);
                  if (isAuto && !showAutoEquivs) return null;
                  return (
                  <div key={i} className="grid grid-cols-[76px_1fr_50px_50px_44px_24px] gap-1.5 items-center px-2.5 py-1.5 border-t border-slate-100 min-w-[330px]">
                    <span className="text-xs font-semibold text-indigo-700 truncate" title={e.marque}>{e.marque}</span>
                    <input className="input font-mono py-1 text-xs" value={e.reference} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, reference: ev.target.value } : x))} />
                    <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={e.prix_achat ?? ""} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, prix_achat: ev.target.value === "" ? undefined : +ev.target.value } : x))} />
                    <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={e.prix ?? ""} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, prix: ev.target.value === "" ? undefined : +ev.target.value } : x))} />
                    <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={e.stock ?? 0} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, stock: +ev.target.value } : x))} />
                    <button onClick={() => setEquivs(equivs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 flex justify-center" title="Retirer"><X size={14} /></button>
                  </div>
                  );
                })}

                {/* Bascule pour les références OE automatiques (sans prix) */}
                {equivs.filter(e => e.prix == null && e.prix_achat == null).length > 0 && (
                  <button type="button" onClick={() => setShowAutoEquivs(v => !v)}
                    className="w-full text-xs font-medium text-blue-500 hover:text-blue-400 flex items-center justify-center gap-1 py-1.5 border-t border-slate-100 bg-slate-50/40">
                    {showAutoEquivs
                      ? <>Masquer les références OE <ChevronUp size={13} /></>
                      : <>Voir {equivs.filter(e => e.prix == null && e.prix_achat == null).length} références OE (origine) <ChevronDown size={13} /></>}
                  </button>
                )}
                </div>

                {/* Ligne d'ajout — toujours visible sous la liste */}
                <div className="grid grid-cols-[76px_1fr_50px_50px_44px_24px] gap-1.5 items-center px-2.5 py-2 border-t border-slate-200 bg-slate-50/70 min-w-[330px]">
                  <select className="input py-1 text-xs px-1" value={newEquiv.marque} onChange={e => setNewEquiv({ ...newEquiv, marque: e.target.value })}>
                    {BRANDS.filter(b => b !== "Filtron").map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="OE">OE</option>
                  </select>
                  <input className="input font-mono py-1 text-xs" placeholder="réf (ex Z555)" value={newEquiv.reference}
                    onChange={e => setNewEquiv({ ...newEquiv, reference: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEquivRow(); } }} />
                  <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={newEquiv.prix_achat || ""} onChange={e => setNewEquiv({ ...newEquiv, prix_achat: +e.target.value })} />
                  <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={newEquiv.prix || ""} onChange={e => setNewEquiv({ ...newEquiv, prix: +e.target.value })} />
                  <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={newEquiv.stock || ""} onChange={e => setNewEquiv({ ...newEquiv, stock: +e.target.value })} />
                  <button onClick={addEquivRow} className="text-emerald-500 hover:text-emerald-600 flex justify-center" title="Ajouter cette marque"><Plus size={16} /></button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={save} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t("reference"), t("vehicleType"), t("category"), ...(showCost ? [t("buyPrice")] : []), t("sellPrice"), t("stock"), t("actions")].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => {
              const variants = (equivMap[p.id] ?? []).filter(e => e.prix != null);
              return (
              <Fragment key={p.id}>
              <tr className={p.stock <= p.stock_min ? "bg-red-50" : "hover:bg-slate-50"}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <FilterImage reference={p.reference} categorie={p.categorie} imageUrl={p.image_url} wid={80} className="h-9 w-9 rounded object-contain bg-white shrink-0 border border-slate-700/50 p-0.5" />
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-slate-300">{p.reference}</span>
                      <span className="ms-2 text-[10px] font-semibold text-amber-400">{p.marque || "Filtron"}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 max-w-xs">
                  {vehSummary(p) || <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><CategoryIcon categorie={p.categorie} size={15} className="text-red-400" /> {t(categoryKeys[p.categorie])}</span>
                </td>
                {showCost && <td className="px-4 py-3 text-slate-400">{p.prix_achat} MAD</td>}
                <td className="px-4 py-3 font-medium text-blue-600">
                  {(p.prix_promo ?? 0) > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-slate-500 text-xs">{p.prix_vente}</span>
                      <span className="text-rose-400 font-bold">{p.prix_promo} MAD</span>
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full font-semibold">PROMO</span>
                    </span>
                  ) : `${p.prix_vente} MAD`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StockBadge stock={p.stock} stockMin={p.stock_min} />
                    <span className="text-xs text-slate-400">{p.stock}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                    <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
              {variants.map((e, i) => (
                <tr key={p.id + "-eq-" + i} className="bg-slate-900/20">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 ps-11">
                      <span className="text-indigo-300">↳</span>
                      <span className="font-mono text-xs text-slate-300">{e.reference}</span>
                      <span className="text-xs font-semibold text-indigo-300">{e.marque}</span>
                    </div>
                  </td>
                  <td></td>
                  <td></td>
                  {showCost && <td className="px-4 py-2 text-xs text-slate-400">{e.prix_achat != null ? `${e.prix_achat} MAD` : "—"}</td>}
                  <td className="px-4 py-2 font-medium text-blue-600">{e.prix} MAD</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <StockBadge stock={e.stock} stockMin={0} />
                      <span className="text-xs text-slate-400">{e.stock}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} title="Modifier la variante (dans la fiche)" className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                      <button onClick={() => removeVariant(e.id, `${e.reference} ${e.marque}`)} title="Supprimer la variante" className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-400 py-10">{t("noData")}</p>}
      </div>
    </div>
  );
}
