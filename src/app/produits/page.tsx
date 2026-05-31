"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product, ProductCategory } from "@/types/database";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

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

const empty = { nom_fr: "", nom_ar: "", reference: "", categorie: "filtre_huile" as ProductCategory, prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 2, notes: "" };

export default function ProduitsPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("nom_fr");
    setProducts(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (editing) {
      await supabase.from("products").update(form).eq("id", editing.id);
    } else {
      await supabase.from("products").insert(form);
    }
    setShowForm(false); setEditing(null); setForm(empty);
    load();
  }

  async function remove(id: string) {
    if (confirm(t("confirm") + " " + t("delete") + "?")) {
      await supabase.from("products").delete().eq("id", id);
      load();
    }
  }

  function startEdit(p: Product) {
    setEditing(p);
    setForm({ nom_fr: p.nom_fr, nom_ar: p.nom_ar, reference: p.reference, categorie: p.categorie, prix_achat: p.prix_achat, prix_vente: p.prix_vente, stock: p.stock, stock_min: p.stock_min, notes: p.notes ?? "" });
    setShowForm(true);
  }

  const filtered = products.filter(p =>
    p.nom_fr.toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="products" action={
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(empty); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t("addProduct")}
        </button>
      } />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9" placeholder={t("search")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
            <h3 className="font-semibold text-slate-800 mb-4">{editing ? t("edit") : t("addProduct")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500 mb-1 block">Nom (FR)</label><input className="input" value={form.nom_fr} onChange={e => setForm({ ...form, nom_fr: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">الاسم (AR)</label><input className="input" dir="rtl" value={form.nom_ar} onChange={e => setForm({ ...form, nom_ar: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("reference")}</label><input className="input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("category")}</label>
                <select className="input" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value as ProductCategory })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(categoryKeys[c])}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("buyPrice")} (MAD)</label><input type="number" className="input" value={form.prix_achat} onChange={e => setForm({ ...form, prix_achat: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("sellPrice")} (MAD)</label><input type="number" className="input" value={form.prix_vente} onChange={e => setForm({ ...form, prix_vente: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("stock")}</label><input type="number" className="input" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Stock min</label><input type="number" className="input" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: +e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={save} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t("reference"), t("name"), t("category"), t("buyPrice"), t("sellPrice"), t("stock"), t("actions")].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => (
              <tr key={p.id} className={p.stock <= p.stock_min ? "bg-red-50" : "hover:bg-slate-50"}>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.reference}</td>
                <td className="px-4 py-3 font-medium">{p.nom_fr}</td>
                <td className="px-4 py-3 text-slate-600">{t(categoryKeys[p.categorie])}</td>
                <td className="px-4 py-3">{p.prix_achat} MAD</td>
                <td className="px-4 py-3 font-medium text-blue-600">{p.prix_vente} MAD</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${p.stock <= p.stock_min ? "text-red-600" : "text-green-600"}`}>{p.stock}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                    <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-400 py-10">{t("noData")}</p>}
      </div>
    </div>
  );
}
