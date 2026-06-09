"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import type { Fournisseur, Reception, Avance, Product, FournisseurType } from "@/types/database";
import ProductPicker from "@/components/ProductPicker";
import {
  Plus, Truck, Phone, MessageCircle, Pencil, Trash2, X, PackagePlus, HandCoins,
  ChevronDown, ChevronUp, Wallet, TrendingUp, Eye, EyeOff, PiggyBank,
} from "lucide-react";

type RecLine = { product_id: string; quantite: number; prix_achat: number; reference: string };
const todayStr = () => new Date().toISOString().split("T")[0];
function waLink(tel: string) { return `https://wa.me/212${tel.replace(/\D/g, "").replace(/^0/, "")}`; }

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [avances, setAvances] = useState<Avance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesAgg, setSalesAgg] = useState<{ date: string; cout: number; benef: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);   // montants masqués par défaut
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Ventes attribuées par fournisseur (source choisie à la vente)
  const [attByF, setAttByF] = useState<Record<string, { ventes: number; benef: number }>>({});

  // Formulaire fournisseur
  const [showSupplier, setShowSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Fournisseur | null>(null);
  const [sForm, setSForm] = useState<{ nom: string; telephone: string; note: string; type: FournisseurType }>({ nom: "", telephone: "", note: "", type: "credit" });

  // Formulaire réception (marchandise prise)
  const [recFor, setRecFor] = useState<Fournisseur | null>(null);
  const [recDate, setRecDate] = useState(todayStr());
  const [recLines, setRecLines] = useState<RecLine[]>([]);

  // Formulaire avance
  const [avFor, setAvFor] = useState<Fournisseur | null>(null);
  const [avDate, setAvDate] = useState(todayStr());
  const [avMontant, setAvMontant] = useState(0);
  const [avNote, setAvNote] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: f }, { data: r }, { data: a }] = await Promise.all([
      supabase.from("fournisseurs").select("*").order("nom"),
      supabase.from("receptions").select("*").order("date", { ascending: false }),
      supabase.from("avances").select("*").order("date", { ascending: false }),
    ]);
    setFournisseurs((f as Fournisseur[]) ?? []);
    setReceptions((r as Reception[]) ?? []);
    setAvances((a as Avance[]) ?? []);

    // Produits (pour le sélecteur)
    const all: Product[] = [];
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("products").select("id, reference, nom_fr, prix_achat, prix_vente").order("reference").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      all.push(...(data as unknown as Product[]));
      if (data.length < 1000) break;
    }
    setProducts(all);

    // Portefeuille (depuis les ventes)
    const items: { date: string; items: { quantite: number; prix_unitaire: number; product: { prix_achat: number } | null }[] }[] = [];
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("sales").select("date, items:sale_items(quantite, prix_unitaire, product:products(prix_achat))").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      items.push(...(data as unknown as typeof items));
      if (data.length < 1000) break;
    }
    const agg: { date: string; cout: number; benef: number }[] = [];
    for (const s of items) {
      let c = 0, b = 0;
      for (const it of s.items ?? []) {
        const pa = it.product?.prix_achat ?? 0;
        c += it.quantite * pa;
        b += it.quantite * (it.prix_unitaire - pa);
      }
      agg.push({ date: s.date ?? "", cout: c, benef: b });
    }
    setSalesAgg(agg);

    // Ventes attribuées à un fournisseur (source choisie à la vente)
    const attLines: { fournisseur_id: string; quantite: number; prix_unitaire: number; product: { prix_achat: number } | null }[] = [];
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("sale_items").select("fournisseur_id, quantite, prix_unitaire, product:products(prix_achat)").not("fournisseur_id", "is", null).range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      attLines.push(...(data as unknown as typeof attLines));
      if (data.length < 1000) break;
    }
    const att: Record<string, { ventes: number; benef: number }> = {};
    for (const l of attLines) {
      const pa = l.product?.prix_achat ?? 0;
      const cur = att[l.fournisseur_id] ?? { ventes: 0, benef: 0 };
      cur.ventes += l.quantite * l.prix_unitaire;
      cur.benef += l.quantite * (l.prix_unitaire - pa);
      att[l.fournisseur_id] = cur;
    }
    setAttByF(att);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const recByF = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of receptions) m[r.fournisseur_id] = (m[r.fournisseur_id] ?? 0) + r.montant;
    return m;
  }, [receptions]);
  const avByF = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of avances) m[a.fournisseur_id] = (m[a.fournisseur_id] ?? 0) + a.montant;
    return m;
  }, [avances]);
  const soldeOf = (id: string) => (recByF[id] ?? 0) - (avByF[id] ?? 0);
  const isCapital = (f: Fournisseur) => (f.type ?? "credit") === "capital";
  // Capital dispo (type capital) = ventes attribuées − marchandise achetée
  const capitalOf = (id: string) => (attByF[id]?.ventes ?? 0) - (recByF[id] ?? 0);
  const capitalTotal = fournisseurs.filter(isCapital).reduce((s, f) => s + capitalOf(f.id), 0);
  const duTotal = fournisseurs.filter(f => !isCapital(f)).reduce((s, f) => s + soldeOf(f.id), 0);

  // Mois disponibles + filtre
  const months = useMemo(() => {
    const set = new Set<string>();
    receptions.forEach(r => r.date && set.add(r.date.slice(0, 7)));
    avances.forEach(a => a.date && set.add(a.date.slice(0, 7)));
    salesAgg.forEach(s => s.date && set.add(s.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [receptions, avances, salesAgg]);
  const inMonth = (d: string) => selectedMonth === "all" || (d ?? "").slice(0, 7) === selectedMonth;
  const monthLabel = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

  // Portefeuille (selon le mois sélectionné)
  const porte = useMemo(() => {
    let cout = 0, benefice = 0;
    for (const s of salesAgg) if (inMonth(s.date)) { cout += s.cout; benefice += s.benef; }
    return { cout, benefice };
  }, [salesAgg, selectedMonth]);

  // Pris / versé sur la période (pour affichage), le solde reste cumulé
  const recByFPeriod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of receptions) if (inMonth(r.date)) m[r.fournisseur_id] = (m[r.fournisseur_id] ?? 0) + r.montant;
    return m;
  }, [receptions, selectedMonth]);
  const avByFPeriod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of avances) if (inMonth(a.date)) m[a.fournisseur_id] = (m[a.fournisseur_id] ?? 0) + a.montant;
    return m;
  }, [avances, selectedMonth]);

  // Masquage des montants
  const money = (n: number) => showAmounts ? `${n.toFixed(0)} MAD` : "••• MAD";
  const periodTxt = selectedMonth === "all" ? "cumul" : monthLabel(selectedMonth);

  // ---- Fournisseur CRUD ----
  function openNewSupplier() { setEditingSupplier(null); setSForm({ nom: "", telephone: "", note: "", type: "credit" }); setShowSupplier(true); }
  function openEditSupplier(f: Fournisseur) { setEditingSupplier(f); setSForm({ nom: f.nom, telephone: f.telephone ?? "", note: f.note ?? "", type: f.type ?? "credit" }); setShowSupplier(true); }
  async function saveSupplier() {
    if (!sForm.nom.trim()) { alert("Nom requis"); return; }
    const payload = { nom: sForm.nom.trim(), telephone: sForm.telephone || null, note: sForm.note || null, type: sForm.type };
    if (editingSupplier) await supabase.from("fournisseurs").update(payload).eq("id", editingSupplier.id);
    else await supabase.from("fournisseurs").insert(payload);
    setShowSupplier(false); load();
  }
  async function removeSupplier(f: Fournisseur) {
    if (!confirm(`Supprimer « ${f.nom} » et tout son historique ?`)) return;
    await supabase.from("fournisseurs").delete().eq("id", f.id);
    load();
  }

  // ---- Réception (marchandise prise) ----
  function openReception(f: Fournisseur) { setRecFor(f); setRecDate(todayStr()); setRecLines([{ product_id: "", quantite: 1, prix_achat: 0, reference: "" }]); }
  function setRecProduct(i: number, p: Product) {
    setRecLines(prev => prev.map((l, j) => j === i ? { ...l, product_id: p.id, prix_achat: p.prix_achat, reference: p.reference } : l));
  }
  const recMontant = recLines.reduce((s, l) => s + l.quantite * l.prix_achat, 0);
  async function saveReception() {
    if (!recFor) return;
    const valid = recLines.filter(l => l.product_id && l.quantite > 0);
    if (valid.length === 0) { alert("Ajoute au moins un produit"); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { alert("Action impossible hors-ligne."); return; }
    const montant = valid.reduce((s, l) => s + l.quantite * l.prix_achat, 0);
    const details = valid.map(l => `${l.reference}×${l.quantite}`).join(", ");
    await supabase.from("receptions").insert({ fournisseur_id: recFor.id, date: recDate, montant, details });
    // Augmente le stock (decrement avec qté négative)
    for (const l of valid) await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: -l.quantite });
    setRecFor(null); load();
  }

  // ---- Avance ----
  function openAvance(f: Fournisseur) { setAvFor(f); setAvDate(todayStr()); setAvMontant(0); setAvNote(""); }
  async function saveAvance() {
    if (!avFor || avMontant <= 0) { alert("Montant requis"); return; }
    await supabase.from("avances").insert({ fournisseur_id: avFor.id, date: avDate, montant: avMontant, note: avNote || null });
    setAvFor(null); load();
  }

  function histOf(id: string) {
    const r = receptions.filter(x => x.fournisseur_id === id && inMonth(x.date)).map(x => ({ type: "rec" as const, date: x.date, montant: x.montant, text: x.details ?? "Marchandise" }));
    const a = avances.filter(x => x.fournisseur_id === id && inMonth(x.date)).map(x => ({ type: "av" as const, date: x.date, montant: x.montant, text: x.note ?? "Avance" }));
    return [...r, ...a].sort((p, q) => q.date.localeCompare(p.date));
  }

  return (
    <div>
      <Header title="suppliers" action={
        <div className="flex items-center gap-2">
          <select className="input w-auto py-1.5 text-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            <option value="all">Tous les mois</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button onClick={() => setShowAmounts(v => !v)} title={showAmounts ? "Masquer les montants" : "Afficher les montants"}
            className="btn-secondary flex items-center gap-1.5">
            {showAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="hidden sm:inline">{showAmounts ? "Masquer" : "Afficher"}</span>
          </button>
          <button onClick={openNewSupplier} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">Fournisseur</span>
          </button>
        </div>
      } />

      {/* Capital / Dette / Bénéfice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><PiggyBank size={14} className="text-emerald-400" /> Capital disponible (mon argent)</h3>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{money(capitalTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">cumulé · grandit avec les ventes</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Truck size={14} className="text-red-400" /> Total dû (fournisseurs crédit)</h3>
          <p className={`text-2xl font-bold mt-1 ${duTotal > 0 ? "text-red-400" : "text-emerald-400"}`}>{money(duTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">cumulé</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><TrendingUp size={14} className="text-sky-400" /> Bénéfice (toutes ventes)</h3>
          <p className="text-2xl font-bold text-sky-400 mt-1">{money(porte.benefice)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{periodTxt}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10">Chargement…</p>
      ) : fournisseurs.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <Truck size={40} className="mx-auto mb-3 text-slate-600" />
          <p>Aucun fournisseur. Clique « Ajouter fournisseur » pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fournisseurs.map(f => {
            const cap = isCapital(f);
            const solde = soldeOf(f.id);
            const capital = capitalOf(f.id);
            const att = attByF[f.id] ?? { ventes: 0, benef: 0 };
            const open = expanded === f.id;
            return (
              <div key={f.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
                      {cap ? <PiggyBank size={16} className="text-emerald-400" /> : <Truck size={16} className="text-red-400" />}
                      {f.nom}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cap ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{cap ? "capital" : "crédit"}</span>
                    </p>
                    {f.telephone && (
                      <div className="flex items-center gap-2 mt-1">
                        <a href={`tel:${f.telephone}`} className="flex items-center gap-1 text-xs text-blue-400 hover:underline"><Phone size={12} /> {f.telephone}</a>
                        <a href={waLink(f.telephone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-green-500/15 text-green-300 px-2 py-0.5 rounded-full"><MessageCircle size={11} /> WA</a>
                      </div>
                    )}
                    {f.note && <p className="text-xs text-slate-500 mt-1">{f.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-500">{cap ? "Capital disponible" : "Reste à payer"}</p>
                    {cap
                      ? <p className="text-xl font-bold text-emerald-400">{money(capital)}</p>
                      : <p className={`text-xl font-bold ${solde > 0 ? "text-red-400" : "text-emerald-400"}`}>{money(solde)}</p>}
                    <div className="flex gap-2 justify-end mt-1">
                      <button onClick={() => openEditSupplier(f)} className="text-blue-400 hover:text-blue-300"><Pencil size={14} /></button>
                      <button onClick={() => removeSupplier(f)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                  {cap ? (
                    <>
                      <span>Vendu : <b className="text-slate-200">{money(att.ventes)}</b></span>
                      <span>Acheté : <b className="text-slate-200">{money(recByF[f.id] ?? 0)}</b></span>
                    </>
                  ) : (
                    <>
                      <span>Pris ({periodTxt}) : <b className="text-slate-200">{money(recByFPeriod[f.id] ?? 0)}</b></span>
                      <span>Versé ({periodTxt}) : <b className="text-slate-200">{money(avByFPeriod[f.id] ?? 0)}</b></span>
                      <span>Bénéfice : <b className="text-emerald-300">{money(att.benef)}</b></span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => openReception(f)} className="flex items-center gap-1.5 text-xs bg-orange-500/15 text-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-500/25"><PackagePlus size={14} /> Marchandise prise</button>
                  {!cap && <button onClick={() => openAvance(f)} className="flex items-center gap-1.5 text-xs bg-emerald-500/15 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/25"><HandCoins size={14} /> Avance / paiement</button>}
                  <button onClick={() => setExpanded(open ? null : f.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 ms-auto">
                    Historique {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {open && (
                  <div className="mt-3 border-t border-slate-700/60 pt-2 space-y-1 max-h-60 overflow-y-auto">
                    {histOf(f.id).length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">Aucun mouvement.</p>
                    ) : histOf(f.id).map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-400">{h.date} · <span className="text-slate-300">{h.text}</span></span>
                        <span className={h.type === "rec" ? "text-orange-300 font-medium" : "text-emerald-300 font-medium"}>
                          {h.type === "rec" ? "+" : "−"}{money(h.montant)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal fournisseur */}
      {showSupplier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100">{editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h3>
              <button onClick={() => setShowSupplier(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Nom *</label><input className="input" value={sForm.nom} onChange={e => setSForm({ ...sForm, nom: e.target.value })} /></div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <select className="input" value={sForm.type} onChange={e => setSForm({ ...sForm, type: e.target.value as FournisseurType })}>
                  <option value="credit">Crédit — fournisseur à rembourser (ex. dinoun)</option>
                  <option value="capital">Capital — mon propre argent (ex. filtropro)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Capital : ton argent qui tourne et grandit. Crédit : tu rembourses le coût, tu gardes le bénéfice.</p>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Téléphone</label><input className="input" value={sForm.telephone} onChange={e => setSForm({ ...sForm, telephone: e.target.value })} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Note</label><textarea className="input" rows={2} value={sForm.note} onChange={e => setSForm({ ...sForm, note: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowSupplier(false)} className="btn-secondary">Annuler</button>
              <button onClick={saveSupplier} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal réception */}
      {recFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-lg my-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><PackagePlus size={18} className="text-orange-400" /> Marchandise prise — {recFor.nom}</h3>
              <button onClick={() => setRecFor(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="mb-3">
              <label className="text-xs text-slate-400 mb-1 block">Date</label>
              <input type="date" className="input w-44" value={recDate} onChange={e => setRecDate(e.target.value)} />
            </div>
            <div className="space-y-2 mb-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-slate-500">
                <span className="col-span-6">Produit</span>
                <span className="col-span-2 text-center">Qté</span>
                <span className="col-span-3 text-center">Prix achat (u.)</span>
                <span className="col-span-1"></span>
              </div>
              {recLines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6"><ProductPicker products={products} value={l.product_id} onSelect={(p) => setRecProduct(i, p)} /></div>
                  <input type="number" min={1} className="input col-span-2 text-center" value={l.quantite} onChange={e => setRecLines(prev => prev.map((x, j) => j === i ? { ...x, quantite: Math.max(1, +e.target.value) } : x))} />
                  <input type="number" min={0} step="0.01" className="input col-span-3 text-center" placeholder="prix" value={l.prix_achat || ""} onChange={e => setRecLines(prev => prev.map((x, j) => j === i ? { ...x, prix_achat: Math.max(0, +e.target.value) } : x))} />
                  <button onClick={() => setRecLines(prev => prev.filter((_, j) => j !== i))} className="col-span-1 text-red-400 hover:text-red-300 flex justify-center"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => setRecLines([...recLines, { product_id: "", quantite: 1, prix_achat: 0, reference: "" }])} className="btn-secondary text-xs flex items-center gap-1"><Plus size={12} /> Ajouter une ligne</button>
              <p className="text-[11px] text-slate-500">Le prix d&apos;achat se remplit auto, mais tu peux le corriger selon le prix de ce fournisseur.</p>
            </div>
            <div className="bg-[var(--surface-2)] rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-300">Coût total (ajouté à la dette)</span>
              <span className="text-lg font-bold text-orange-400">{recMontant.toFixed(2)} MAD</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Le stock des produits sera augmenté automatiquement.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRecFor(null)} className="btn-secondary">Annuler</button>
              <button onClick={saveReception} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal avance */}
      {avFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><HandCoins size={18} className="text-emerald-400" /> Avance — {avFor.nom}</h3>
              <button onClick={() => setAvFor(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Reste à payer : <b className="text-red-400">{soldeOf(avFor.id).toFixed(0)} MAD</b></p>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Date</label><input type="date" className="input" value={avDate} onChange={e => setAvDate(e.target.value)} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Montant versé (MAD)</label><input type="number" min={0} className="input" value={avMontant} onChange={e => setAvMontant(+e.target.value)} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Note</label><input className="input" value={avNote} onChange={e => setAvNote(e.target.value)} /></div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setAvFor(null)} className="btn-secondary">Annuler</button>
              <button onClick={saveAvance} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
