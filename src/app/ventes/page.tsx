"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Sale, Client, Product, SaleItem, SaleStatus, Fournisseur } from "@/types/database";
import { Plus, Trash2, Printer, ScanLine, Check, Link2, X, MessageCircle, CloudOff, RefreshCw, Pencil, Wallet, Eye } from "lucide-react";
import ProductPicker from "@/components/ProductPicker";
import BarcodeScanner from "@/components/BarcodeScanner";
import { addPending, getPending, syncPending } from "@/lib/offlineSales";
import { buildReceipt, sendWhatsApp } from "@/lib/whatsapp";

type LastSale = {
  clientNom: string; clientTel: string | null; ville: string; date: string;
  lines: { nom: string; quantite: number; prix_unitaire: number }[];
  total: number; statut: SaleStatus; montant_paye: number; offline: boolean;
};

type LineItem = { product_id: string; quantite: number; prix_unitaire: number; nom: string; fournisseur_id?: string; variant?: string; equivalence_id?: string | null; cout_unitaire?: number };

export default function VentesPage() {
  const { t } = useLang();
  const [sales, setSales] = useState<(Sale & { client: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [crossSell, setCrossSell] = useState<Product[]>([]);
  // Variantes de marque par produit (Filtron + équivalences avec prix) → prix auto à la vente
  const [variants, setVariants] = useState<Record<string, { marque: string; reference: string; prix: number; prix_achat: number; stock: number; equivalence_id: string | null }[]>>({});
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
  // Hors-ligne + reçu
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  // Modification d'une vente existante
  const [editingSale, setEditingSale] = useState<(Sale & { client: Client }) | null>(null);
  const [oldLines, setOldLines] = useState<{ product_id: string; quantite: number; equivalence_id: string | null }[]>([]);
  // Modification rapide du paiement
  const [payEdit, setPayEdit] = useState<(Sale & { client: Client }) | null>(null);
  const [payStatut, setPayStatut] = useState<SaleStatus>("paye");
  const [payMontant, setPayMontant] = useState(0);
  // Marges révélées au clic (par vente)
  const [revealMargin, setRevealMargin] = useState<Set<string>>(new Set());
  function toggleMargin(id: string) {
    setRevealMargin(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function load() {
    const [{ data: s }, { data: c }, { data: fr }] = await Promise.all([
      supabase.from("sales").select("*, client:clients(*), items:sale_items(quantite, prix_unitaire, cout_unitaire, fournisseur_id, product:products(reference, prix_achat))").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("nom"),
      supabase.from("fournisseurs").select("*").order("nom"),
    ]);
    setSales((s as unknown as (Sale & { client: Client })[]) ?? []);
    setClients(c ?? []);
    setFournisseurs((fr as Fournisseur[]) ?? []);

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

  async function doSync() {
    setSyncing(true);
    const { left } = await syncPending(supabase);
    setPendingCount(left);
    setSyncing(false);
    if (left === 0) load();
  }

  useEffect(() => {
    setPendingCount(getPending().length);
    (async () => {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const { left } = await syncPending(supabase);
        setPendingCount(left);
      }
      load();
    })();
    const onOnline = async () => { const { left } = await syncPending(supabase); setPendingCount(left); if (left === 0) load(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

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
    updated[i] = { ...updated[i], product_id: p.id, prix_unitaire: p.prix_vente, nom: p.reference, variant: "Filtron", equivalence_id: null, cout_unitaire: p.prix_achat };
    setLines(updated);
    fetchCrossSell(p);
    loadVariants(p);
  }

  // Charge les variantes d'un produit (Filtron + équivalences enregistrées avec un prix)
  async function loadVariants(p: Product) {
    if (variants[p.id]) return;
    const { data } = await supabase.from("equivalences").select("id, marque, reference, prix, prix_achat, stock").eq("product_id", p.id);
    const list = [
      { marque: "Filtron", reference: p.reference, prix: p.prix_vente, prix_achat: p.prix_achat, stock: p.stock, equivalence_id: null as string | null },
      ...((data ?? []) as { id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number | null }[])
        .filter(e => e.prix != null)
        .map(e => ({ marque: e.marque, reference: e.reference, prix: e.prix as number, prix_achat: e.prix_achat ?? 0, stock: e.stock ?? 0, equivalence_id: e.id })),
    ];
    setVariants(prev => ({ ...prev, [p.id]: list }));
  }

  // Applique une marque à une ligne : prix de vente auto + coût figé + libellé "réf (marque)"
  function applyVariant(i: number, marque: string) {
    const l = lines[i];
    const v = (variants[l.product_id] || []).find(x => x.marque === marque);
    if (!v) return;
    setLines(lines.map((x, j) => j === i ? { ...x, variant: marque, prix_unitaire: v.prix, cout_unitaire: v.prix_achat, equivalence_id: v.equivalence_id, nom: `${v.reference} (${v.marque})` } : x));
  }

  // Vente croisée : autres filtres (catégories différentes) compatibles avec le même véhicule
  async function fetchCrossSell(p: Product) {
    try {
      const { data: apps } = await supabase.from("applications").select("marque, modele").eq("product_id", p.id).limit(1);
      if (!apps || apps.length === 0) return;
      const { marque, modele } = apps[0] as { marque: string; modele: string };
      const { data: matches } = await supabase.from("applications").select("product_id, products(*)").eq("marque", marque).eq("modele", modele).limit(60);
      const seen = new Set<string>();
      const out: Product[] = [];
      for (const m of (matches ?? []) as unknown as { product_id: string; products: Product | null }[]) {
        const prod = m.products;
        if (!prod || prod.id === p.id || prod.categorie === p.categorie || seen.has(prod.id)) continue;
        seen.add(prod.id); out.push(prod);
      }
      setCrossSell(out.slice(0, 6));
    } catch { /* silencieux */ }
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
      return [...prev, { product_id: p.id, quantite: 1, prix_unitaire: p.prix_vente, nom: p.reference }];
    });
    flash(`${p.reference} ajouté ✓`);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
    fetchCrossSell(p);
    loadVariants(p);
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

  function resetForm() {
    setShowForm(false); setEditingSale(null); setOldLines([]);
    setLines([]); setClientId(""); setNotes(""); setMontantPaye(0); setStatut("paye");
    setCrossSell([]);
  }

  function openNew() {
    resetForm();
    setShowForm(true);
  }

  // Ouvre le formulaire pré-rempli pour modifier une vente existante
  async function openEditSale(s: Sale & { client: Client }) {
    const { data } = await supabase.from("sale_items")
      .select("product_id, quantite, prix_unitaire, fournisseur_id, equivalence_id, cout_unitaire, product:products(reference)")
      .eq("sale_id", s.id);
    const items = (data ?? []) as unknown as { product_id: string; quantite: number; prix_unitaire: number; fournisseur_id: string | null; equivalence_id: string | null; cout_unitaire: number | null; product: { reference: string } | null }[];
    setLines(items.map(i => ({ product_id: i.product_id, quantite: i.quantite, prix_unitaire: i.prix_unitaire, nom: i.product?.reference ?? "", fournisseur_id: i.fournisseur_id ?? undefined, equivalence_id: i.equivalence_id, cout_unitaire: i.cout_unitaire ?? undefined })));
    setOldLines(items.map(i => ({ product_id: i.product_id, quantite: i.quantite, equivalence_id: i.equivalence_id })));
    setClientId(s.client_id);
    setStatut(s.statut);
    setMontantPaye(s.montant_paye);
    setNotes(s.notes ?? "");
    setEditingSale(s);
    setShowForm(true);
  }

  // Sauvegarde d'une MODIFICATION de vente (réajuste le stock : rend l'ancien, retire le nouveau)
  async function saveEdit() {
    if (!editingSale) return;
    const validLines = lines.filter(l => l.product_id && l.quantite > 0);
    if (!clientId || validLines.length === 0) { flash("Client et au moins un article requis"); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { alert("Modification impossible hors-ligne."); return; }
    const saleTotal = validLines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const montant = statut === "paye" ? saleTotal : montantPaye;
    try {
      // 1) Rendre le stock des anciens articles (qty négative => stock += qty)
      for (const o of oldLines) {
        if (o.equivalence_id) await supabase.rpc("decrement_equiv_stock", { e_id: o.equivalence_id, qty: -o.quantite });
        else await supabase.rpc("decrement_stock", { p_id: o.product_id, qty: -o.quantite });
      }
      // 2) Remplacer les lignes
      await supabase.from("sale_items").delete().eq("sale_id", editingSale.id);
      await supabase.from("sales").update({
        client_id: clientId, total: saleTotal, montant_paye: montant, statut, notes: notes || null,
      }).eq("id", editingSale.id);
      await supabase.from("sale_items").insert(
        validLines.map(l => ({ sale_id: editingSale.id, product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire, fournisseur_id: l.fournisseur_id || null, equivalence_id: l.equivalence_id || null, cout_unitaire: l.cout_unitaire ?? null }))
      );
      // 3) Retirer le stock des nouveaux articles
      for (const l of validLines) {
        if (l.equivalence_id) await supabase.rpc("decrement_equiv_stock", { e_id: l.equivalence_id, qty: l.quantite });
        else await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
      }
      flash("Vente modifiée ✓");
    } catch { alert("Erreur lors de la modification."); }
    resetForm();
    load();
  }

  // Modification rapide du paiement uniquement
  function openPayEdit(s: Sale & { client: Client }) {
    setPayEdit(s); setPayStatut(s.statut); setPayMontant(s.montant_paye);
  }
  async function savePayEdit() {
    if (!payEdit) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { alert("Modification impossible hors-ligne."); return; }
    const montant = payStatut === "paye" ? payEdit.total : payMontant;
    await supabase.from("sales").update({ statut: payStatut, montant_paye: montant }).eq("id", payEdit.id);
    setPayEdit(null);
    load();
  }

  async function save() {
    if (editingSale) { saveEdit(); return; }
    const validLines = lines.filter(l => l.product_id && l.quantite > 0);
    if (!clientId || validLines.length === 0) return;
    const client = clients.find(c => c.id === clientId);
    const saleTotal = validLines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const montant = statut === "paye" ? saleTotal : montantPaye;
    const date = new Date().toISOString().split("T")[0];

    let savedOnline = false;
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        const { data: sale, error } = await supabase.from("sales").insert({
          client_id: clientId, date, total: saleTotal, montant_paye: montant, statut, notes: notes || null,
        }).select().single();
        if (error || !sale) throw error || new Error("insert");
        const { error: e2 } = await supabase.from("sale_items").insert(
          validLines.map(l => ({ sale_id: sale.id, product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire, fournisseur_id: l.fournisseur_id || null, equivalence_id: l.equivalence_id || null, cout_unitaire: l.cout_unitaire ?? null }))
        );
        if (e2) throw e2;
        for (const l of validLines) {
          if (l.equivalence_id) await supabase.rpc("decrement_equiv_stock", { e_id: l.equivalence_id, qty: l.quantite });
          else await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
        }
        savedOnline = true;
      } catch { savedOnline = false; }
    }

    if (!savedOnline) {
      addPending({
        localId: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
        client_id: clientId, clientNom: client?.nom ?? "", clientTel: client?.telephone ?? null, date,
        lines: validLines.map(l => ({ product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire, nom: l.nom, fournisseur_id: l.fournisseur_id || null, equivalence_id: l.equivalence_id || null, cout_unitaire: l.cout_unitaire ?? null })),
        total: saleTotal, statut, montant_paye: montant, notes: notes || null, createdAt: Date.now(),
      });
      setPendingCount(getPending().length);
    }

    setLastSale({
      clientNom: client?.nom ?? "", clientTel: client?.telephone ?? null, ville: client?.ville ?? "", date,
      lines: validLines.map(l => ({ nom: l.nom, quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
      total: saleTotal, statut, montant_paye: montant, offline: !savedOnline,
    });
    setShowForm(false); setLines([]); setClientId(""); setNotes(""); setMontantPaye(0); setStatut("paye");
    if (savedOnline) load();
  }

  // Envoie un DEVIS (panier en cours) au client par WhatsApp, sans enregistrer la vente
  function sendDevis() {
    const validLines = lines.filter(l => l.product_id && l.quantite > 0);
    if (validLines.length === 0) return;
    const client = clients.find(c => c.id === clientId);
    const tot = validLines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const date = new Date().toLocaleDateString("fr-FR");
    const L = validLines.map(l => `• ${l.nom}  ×${l.quantite} = ${(l.quantite * l.prix_unitaire).toFixed(2)} MAD`).join("\n");
    const text = [
      "📝 *Devis — FiltroPro*",
      client ? `👤 ${client.nom}` : "",
      `📅 ${date}`,
      "————————————", L, "————————————",
      `🧮 *TOTAL : ${tot.toFixed(2)} MAD*`,
      "", "Devis indicatif, sous réserve de disponibilité.",
      "📞 06 02 35 02 90",
    ].filter(Boolean).join("\n");
    sendWhatsApp(client?.telephone, text);
  }

  // Envoie la fiche d'une vente déjà enregistrée (récupère ses articles)
  async function whatsForSale(s: Sale & { client: Client }) {
    const { data } = await supabase.from("sale_items")
      .select("quantite, prix_unitaire, product:products(reference)").eq("sale_id", s.id);
    const lns = (data ?? []).map((i: { quantite: number; prix_unitaire: number; product: { reference: string } | null }) =>
      ({ nom: i.product?.reference ?? "Produit", quantite: i.quantite, prix_unitaire: i.prix_unitaire }));
    sendWhatsApp(s.client?.telephone, buildReceipt({
      clientNom: s.client?.nom, date: s.date, lines: lns, total: s.total, statut: s.statut, montant_paye: s.montant_paye,
    }));
  }

  function printReceipt(s: Sale & { client: Client }) {
    const items = (s.items ?? []).map(i =>
      `<tr><td>${(i.product as Product | undefined)?.reference ?? ""}</td><td style="text-align:center">${i.quantite}</td><td style="text-align:right">${i.prix_unitaire} MAD</td><td style="text-align:right">${(i.quantite * i.prix_unitaire).toFixed(2)} MAD</td></tr>`
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
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t("addSale")}
        </button>
      } />

      {pendingCount > 0 && (
        <div className="card p-3 mb-4 flex items-center justify-between" style={{ borderColor: "rgba(234,179,8,0.4)" }}>
          <span className="text-sm text-yellow-400 flex items-center gap-2">
            <CloudOff size={16} /> {pendingCount} vente(s) enregistrée(s) hors-ligne — en attente de synchronisation
          </span>
          <button onClick={doSync} disabled={syncing} className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Synchroniser
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-2xl my-4">
            <h3 className="font-semibold text-slate-800 mb-4">{editingSale ? "Modifier la vente" : t("addSale")}</h3>
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
                <div key={i} className="mb-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <ProductPicker products={products} value={l.product_id} onSelect={(p) => setLineProduct(i, p)} />
                    </div>
                    <input type="number" className="input col-span-2" value={l.quantite} onChange={e => updateLine(i, "quantite", +e.target.value)} min={1} />
                    <input type="number" className="input col-span-3" value={l.prix_unitaire} onChange={e => updateLine(i, "prix_unitaire", +e.target.value)} />
                    <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="col-span-1 text-red-400 hover:text-red-600 flex items-center justify-center"><Trash2 size={15} /></button>
                    <div className="col-span-1 flex items-center text-sm font-medium text-slate-600">{(l.quantite * l.prix_unitaire).toFixed(0)}</div>
                  </div>
                  {variants[l.product_id] && variants[l.product_id].length > 1 && (
                    <select className="input mt-1 py-1 text-xs" value={l.variant ?? "Filtron"} onChange={e => applyVariant(i, e.target.value)}>
                      {variants[l.product_id].map(v => (
                        <option key={v.marque + v.reference} value={v.marque}>{v.marque} · {v.reference} · {v.prix} MAD (stock {v.stock})</option>
                      ))}
                    </select>
                  )}
                  {fournisseurs.length > 0 && (
                    <select className="input mt-1 py-1 text-xs" value={l.fournisseur_id ?? ""} onChange={e => updateLine(i, "fournisseur_id", e.target.value)}>
                      <option value="">Source : — (non attribué)</option>
                      {fournisseurs.map(f => <option key={f.id} value={f.id}>Source : {f.nom}{f.type === "capital" ? " (capital)" : ""}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>

            {crossSell.filter(p => !lines.some(l => l.product_id === p.id)).length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1.5">💡 Filtres pour le même véhicule (clique pour ajouter) :</p>
                <div className="flex flex-wrap gap-1.5">
                  {crossSell.filter(p => !lines.some(l => l.product_id === p.id)).map(p => (
                    <button key={p.id} type="button" onClick={() => addProductToCart(p)} className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/25">
                      <Plus size={11} /> <span className="font-mono">{p.reference}</span> <span className="text-slate-400">· {p.prix_vente} MAD</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            <div className="flex gap-2 justify-end items-center flex-wrap">
              <button onClick={resetForm} className="btn-secondary">{t("cancel")}</button>
              {!editingSale && (
                <button onClick={sendDevis} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/90 hover:bg-green-500 text-white text-sm font-medium" title="Envoyer un devis au client (sans enregistrer)">
                  <MessageCircle size={15} /> Devis
                </button>
              )}
              <button onClick={save} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t("date"), t("clients"), t("city"), t("total"), t("status"), t("profit")].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map(s => {
              const cost = (s.items ?? []).reduce((a, it) => a + it.quantite * (it.cout_unitaire ?? (it.product as Product | undefined)?.prix_achat ?? 0), 0);
              const benef = s.total - cost;
              return (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{s.date}</td>
                <td className="px-4 py-3 font-medium">{s.client?.nom}</td>
                <td className="px-4 py-3 text-slate-500">{s.client?.ville}</td>
                <td className="px-4 py-3 font-semibold">{s.total.toFixed(2)} MAD</td>
                <td className="px-4 py-3"><span className={badgeClass(s.statut)}>{t(s.statut === "paye" ? "paid" : s.statut === "partiel" ? "partial" : "pending")}</span></td>
                <td className="px-4 py-3">
                  {revealMargin.has(s.id) ? (
                    <div className="text-xs leading-tight">
                      <div className="font-semibold text-emerald-400">+{benef.toFixed(0)} MAD</div>
                      <div className="text-orange-400">coût {cost.toFixed(0)}</div>
                    </div>
                  ) : (
                    <button onClick={() => toggleMargin(s.id)} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                      <Eye size={12} /> Afficher
                    </button>
                  )}
                </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => openPayEdit(s)} className="text-amber-500 hover:text-amber-400" title="Modifier le paiement"><Wallet size={16} /></button>
                  <button onClick={() => openEditSale(s)} className="text-blue-400 hover:text-blue-300" title="Modifier la vente"><Pencil size={15} /></button>
                  <button onClick={() => whatsForSale(s)} className="text-green-500 hover:text-green-400" title="Envoyer la fiche sur WhatsApp"><MessageCircle size={16} /></button>
                  <button onClick={() => printReceipt(s)} className="text-slate-400 hover:text-blue-600" title={t("printReceipt")}><Printer size={15} /></button>
                </div>
              </td>
              </tr>
              );
            })}
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

      {/* Modification rapide du paiement */}
      {payEdit && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[60] p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Wallet size={18} className="text-amber-400" /> Paiement</h3>
              <button onClick={() => setPayEdit(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-1">{payEdit.client?.nom} · {payEdit.date}</p>
            <p className="text-lg font-bold text-blue-400 mb-4">Total : {payEdit.total.toFixed(2)} MAD</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("status")}</label>
                <select className="input" value={payStatut} onChange={e => setPayStatut(e.target.value as SaleStatus)}>
                  <option value="paye">{t("paid")}</option>
                  <option value="en_attente">{t("pending")}</option>
                  <option value="partiel">{t("partial")}</option>
                </select>
              </div>
              {payStatut !== "paye" && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Montant payé (MAD)</label>
                  <input type="number" className="input" value={payMontant} onChange={e => setPayMontant(+e.target.value)} />
                  <p className="text-xs text-orange-400 mt-1">Reste : {(payEdit.total - (payStatut === "paye" ? payEdit.total : payMontant)).toFixed(2)} MAD</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setPayEdit(null)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={savePayEdit} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation après-vente + envoi de la fiche */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[60] p-4">
          <div className="card p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-2">{lastSale.offline ? "📴" : "✅"}</div>
            <h3 className="font-semibold text-slate-100 mb-1">
              {lastSale.offline ? "Vente enregistrée hors-ligne" : "Vente enregistrée"}
            </h3>
            <p className="text-sm text-slate-400">{lastSale.clientNom || "Client"} · <b className="text-blue-400">{lastSale.total.toFixed(2)} MAD</b></p>
            {lastSale.offline && <p className="text-xs text-yellow-400 mt-2">Elle sera synchronisée automatiquement dès le retour d&apos;internet.</p>}
            <div className="flex flex-col gap-2 mt-5">
              <button onClick={() => sendWhatsApp(lastSale.clientTel, buildReceipt(lastSale))}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium">
                <MessageCircle size={18} /> Envoyer la fiche au client (WhatsApp)
              </button>
              <button onClick={() => setLastSale(null)} className="btn-secondary">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
