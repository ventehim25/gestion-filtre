"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Sale, Client, Product, SaleItem, SaleStatus } from "@/types/database";
import { Plus, Trash2 } from "lucide-react";

type LineItem = { product_id: string; quantite: number; prix_unitaire: number; nom: string };

export default function VentesPage() {
  const { t } = useLang();
  const [sales, setSales] = useState<(Sale & { client: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [statut, setStatut] = useState<SaleStatus>("paye");
  const [montantPaye, setMontantPaye] = useState(0);
  const [notes, setNotes] = useState("");

  async function load() {
    const [{ data: s }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("sales").select("*, client:clients(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("nom"),
      supabase.from("products").select("*").order("nom_fr"),
    ]);
    setSales((s as unknown as (Sale & { client: Client })[]) ?? []);
    setClients(c ?? []);
    setProducts(p ?? []);
  }

  useEffect(() => { load(); }, []);

  function addLine() {
    if (!products[0]) return;
    setLines([...lines, { product_id: products[0].id, quantite: 1, prix_unitaire: products[0].prix_vente, nom: products[0].nom_fr }]);
  }

  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    const updated = [...lines];
    if (field === "product_id") {
      const p = products.find(p => p.id === val);
      if (p) updated[i] = { ...updated[i], product_id: p.id, prix_unitaire: p.prix_vente, nom: p.nom_fr };
    } else {
      (updated[i] as Record<string, unknown>)[field] = val;
    }
    setLines(updated);
  }

  const total = lines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);

  async function save() {
    if (!clientId || lines.length === 0) return;
    const { data: sale } = await supabase.from("sales").insert({
      client_id: clientId, date: new Date().toISOString().split("T")[0],
      total, montant_paye: statut === "paye" ? total : montantPaye,
      statut, notes: notes || null,
    }).select().single();

    if (sale) {
      await supabase.from("sale_items").insert(
        lines.map(l => ({ sale_id: sale.id, product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire }))
      );
      for (const l of lines) {
        await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
      }
    }
    setShowForm(false); setLines([]); setClientId(""); setNotes(""); setMontantPaye(0);
    load();
  }

  const badgeClass = (s: SaleStatus) =>
    s === "paye" ? "badge-paid" : s === "partiel" ? "badge-partial" : "badge-pending";

  return (
    <div>
      <Header title="sales" action={
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t("addSale")}
        </button>
      } />

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-2xl my-4">
            <h3 className="font-semibold text-slate-800 mb-4">{t("addSale")}</h3>
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-1 block">{t("clients")}</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">-- Choisir client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.ville}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500">{t("products")}</label>
                <button onClick={addLine} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Plus size={12} /> Ajouter ligne</button>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                  <select className="input col-span-5" value={l.product_id} onChange={e => updateLine(i, "product_id", e.target.value)}>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nom_fr}</option>)}
                  </select>
                  <input type="number" className="input col-span-2" value={l.quantite} onChange={e => updateLine(i, "quantite", +e.target.value)} min={1} />
                  <input type="number" className="input col-span-3" value={l.prix_unitaire} onChange={e => updateLine(i, "prix_unitaire", +e.target.value)} />
                  <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="col-span-1 text-red-400 hover:text-red-600 flex items-center justify-center"><Trash2 size={15} /></button>
                  <div className="col-span-1 flex items-center text-sm font-medium text-slate-600">{(l.quantite * l.prix_unitaire).toFixed(0)}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="font-semibold">{t("total")}</span>
              <span className="text-lg font-bold text-blue-600">{total.toFixed(2)} MAD</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("status")}</label>
                <select className="input" value={statut} onChange={e => setStatut(e.target.value as SaleStatus)}>
                  <option value="paye">{t("paid")}</option>
                  <option value="en_attente">{t("pending")}</option>
                  <option value="partiel">{t("partial")}</option>
                </select>
              </div>
              {statut !== "paye" && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Montant payé (MAD)</label>
                  <input type="number" className="input" value={montantPaye} onChange={e => setMontantPaye(+e.target.value)} />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
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
              {[t("date"), t("clients"), t("city"), t("total"), t("status")].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{s.date}</td>
                <td className="px-4 py-3 font-medium">{s.client?.nom}</td>
                <td className="px-4 py-3 text-slate-500">{s.client?.ville}</td>
                <td className="px-4 py-3 font-semibold">{s.total.toFixed(2)} MAD</td>
                <td className="px-4 py-3"><span className={badgeClass(s.statut)}>{t(s.statut === "paye" ? "paid" : s.statut === "partiel" ? "partial" : "pending")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <p className="text-center text-slate-400 py-10">{t("noData")}</p>}
      </div>
    </div>
  );
}
