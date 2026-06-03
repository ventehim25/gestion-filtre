"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Sale, Client, Product, SaleItem, SaleStatus } from "@/types/database";
import { Plus, Trash2, Printer, ScanLine, Check, Link2, X } from "lucide-react";
import ProductPicker from "@/components/ProductPicker";
import BarcodeScanner from "@/components/BarcodeScanner";

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
  // Scan code-barres
  const [camOpen, setCamOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("sales").select("*, client:clients(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("nom"),
    ]);
    setSales((s as unknown as (Sale & { client: Client })[]) ?? []);
    setClients(c ?? []);

    // Tous les produits (Supabase limite à 1000/requête → pagination)
    const all: Product[] = [];
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("products").select("*").order("reference").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
    }
    setProducts(all);
  }

  useEffect(() => { load(); }, []);

  function addLine() {
    setLines([...lines, { product_id: "", quantite: 1, prix_unitaire: 0, nom: "" }]);
  }

  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    const updated = [...lines];
    (updated[i] as Record<string, unknown>)[field] = val;
    setLines(updated);
  }

  function setLineProduct(i: number, p: Product) {
    const updated = [...lines];
    updated[i] = { ...updated[i], product_id: p.id, prix_unitaire: p.prix_vente, nom: p.nom_fr };
    setLines(updated);
  }

  function flash(msg: string) {
    setFeedback(msg);
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 2500);
  }

  // Ajoute un produit au panier (+1 s'il y est déjà)
  function addProductToCart(p: Product) {
    setLines(prev => {
      const idx = prev.findIndex(l => l.product_id === p.id);
      if (idx >= 0) {
        const u = [...prev];
        u[idx] = { ...u[idx], quantite: u[idx].quantite + 1 };
        return u;
      }
      return [...prev, { product_id: p.id, quantite: 1, prix_unitaire: p.prix_vente, nom: p.nom_fr }];
    });
    flash(`${p.reference} ajouté ✓`);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
  }

  // Traite un code scanné (caméra ou douchette)
  function handleScan(raw: string) {
    const code = raw.trim();
    if (!code || linkCode) return;
    const found = products.find(p =>
      (p.code_barre && p.code_barre === code) || p.reference.toUpperCase() === code.toUpperCase());
    if (found) {
      addProductToCart(found);
    } else {
      setCamOpen(false);
      setLinkCode(code);
    }
  }

  // Associe un code inconnu à une référence (mémorisé) puis l'ajoute au panier
  async function linkAndAdd(p: Product) {
    if (!linkCode) return;
    await supabase.from("products").update({ code_barre: linkCode }).eq("id", p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, code_barre: linkCode } : x));
    addProductToCart({ ...p, code_barre: linkCode });
    setLinkCode(null);
  }

  const total = lines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);

  async function save() {
    const validLines = lines.filter(l => l.product_id && l.quantite > 0);
    if (!clientId || validLines.length === 0) return;
    const saleTotal = validLines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const { data: sale } = await supabase.from("sales").insert({
      client_id: clientId, date: new Date().toISOString().split("T")[0],
      total: saleTotal, montant_paye: statut === "paye" ? saleTotal : montantPaye,
      statut, notes: notes || null,
    }).select().single();

    if (sale) {
      await supabase.from("sale_items").insert(
        validLines.map(l => ({ sale_id: sale.id, product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire }))
      );
      for (const l of validLines) {
        await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
      }
    }
    setShowForm(false); setLines([]); setClientId(""); setNotes(""); setMontantPaye(0);
    load();
  }

  function printReceipt(s: Sale & { client: Client }) {
    const items = (s.items ?? []).map(i =>
      `<tr><td>${(i.product as Product | undefined)?.nom_fr ?? ""}</td><td style="text-align:center">${i.quantite}</td><td style="text-align:right">${i.prix_unitaire} MAD</td><td style="text-align:right">${(i.quantite * i.prix_unitaire).toFixed(2)} MAD</td></tr>`
    ).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon de livraison</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;font-size:13px}th{background:#f3f4f6}.total{font-weight:bold;font-size:16px;text-align:right;margin-top:8px}.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}@media print{button{display:none}}</style>
    </head><body>
    <h2>Bon de Livraison</h2>
    <p><strong>Client :</strong> ${s.client?.nom ?? ""}</p>
    <p><strong>Ville :</strong> ${s.client?.ville ?? ""}</p>
    <p><strong>Date :</strong> ${s.date}</p>
    <table><thead><tr><th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead>
    <tbody>${items}</tbody></table>
    <p class="total">Total : ${s.total.toFixed(2)} MAD</p>
    <p class="total" style="color:${s.statut === "paye" ? "green" : "red"}">
      ${s.statut === "paye" ? "✓ Payé" : `Reste à payer : ${(s.total - s.montant_paye).toFixed(2)} MAD`}
    </p>
    <p class="footer">Gestion Filtres — Maroc</p>
    <button onclick="window.print()" style="margin-top:16px;padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">Imprimer</button>
    </body></html>`);
    w.document.close();
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
                <div className="flex gap-2">
                  <button onClick={() => setCamOpen(true)} className="flex items-center gap-1 text-xs py-1 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium"><ScanLine size={12} /> Scanner</button>
                  <button onClick={addLine} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Plus size={12} /> Ajouter ligne</button>
                </div>
              </div>
              <div className="relative mb-2">
                <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                <input
                  className="input ps-9 font-mono"
                  placeholder="Scannez ici (douchette) ou tapez le code + Entrée"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleScan(scanInput); setScanInput(""); } }}
                />
              </div>
              {feedback && (
                <div className="mb-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 flex items-center gap-2">
                  <Check size={15} /> {feedback}
                </div>
              )}
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <ProductPicker products={products} value={l.product_id} onSelect={(p) => setLineProduct(i, p)} />
                  </div>
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
              <td className="px-4 py-3">
                <button onClick={() => printReceipt(s)} className="text-slate-400 hover:text-blue-600" title={t("printReceipt")}><Printer size={15} /></button>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <p className="text-center text-slate-400 py-10">{t("noData")}</p>}
      </div>

      {/* Scanner caméra */}
      {camOpen && <BarcodeScanner onScan={handleScan} onClose={() => setCamOpen(false)} />}

      {/* Association d'un code inconnu */}
      {linkCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Link2 size={18} className="text-red-400" /> Associer un code-barres</h3>
              <button onClick={() => setLinkCode(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-1">Code scanné :</p>
            <p className="font-mono text-lg text-slate-100 bg-slate-800/60 rounded-lg px-3 py-2 mb-4">{linkCode}</p>
            <p className="text-sm text-slate-400 mb-2">Choisissez la référence correspondante :</p>
            <ProductPicker products={products} value="" onSelect={(p) => linkAndAdd(p)} />
          </div>
        </div>
      )}
    </div>
  );
}
