"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/database";
import { MessageCircle, Printer, AlertTriangle, Check, Plus, Eye } from "lucide-react";
import { sendWhatsApp } from "@/lib/whatsapp";
import StockBadge from "@/components/StockBadge";

// Demandes « j'ai pas » agrégées par référence (Bible §4.12)
type Demande = { reference: string; count: number; last: string; ids: string[] };

// Article vendu sur 90 j (dormant §4.2 + prédictif §4.7)
type Item90 = { product_id: string; equivalence_id: string | null; quantite: number; fournisseur_id: string | null; sales: { date: string } | null };
type EquivRow = { id: string; product_id: string; marque: string; reference: string; stock: number; prix_achat: number | null; prix: number | null };

function refCompare(a: string, b: string) {
  const parse = (r: string): [string, number, number, string] => {
    const m = r.toUpperCase().match(/^([A-Z]+)\s*(\d+)(?:\/(\d+))?(.*)$/);
    return m ? [m[1], parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : 0, m[4] || ""] : [r.toUpperCase(), 0, 0, ""];
  };
  const ka = parse(a), kb = parse(b);
  return ka[0].localeCompare(kb[0]) || ka[1] - kb[1] || ka[2] - kb[2] || ka[3].localeCompare(kb[3]);
}

export default function ReapproPage() {
  const { t } = useLang();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"seuil" | "demande" | "dormant" | "predictif">("seuil");
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [demandesOk, setDemandesOk] = useState(true);
  // Ventes 90 j + variantes + fournisseurs (dormant §4.2, prédictif §4.7)
  const [items90, setItems90] = useState<Item90[]>([]);
  const [equivs, setEquivs] = useState<EquivRow[]>([]);
  const [fours, setFours] = useState<{ id: string; nom: string; telephone: string | null }[]>([]);
  const [showVal, setShowVal] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function loadDemandes() {
    try {
      const rows: { id: string; reference: string; created_at: string }[] = [];
      for (let i = 0; i < 10; i++) {
        const { data, error } = await supabase.from("demandes_manquees")
          .select("id, reference, created_at").eq("traite", false)
          .order("created_at", { ascending: false }).range(i * 1000, i * 1000 + 999);
        if (error) { setDemandesOk(false); return; }
        if (!data || data.length === 0) break;
        rows.push(...(data as typeof rows));
        if (data.length < 1000) break;
      }
      const map = new Map<string, Demande>();
      for (const r of rows) {
        const cur = map.get(r.reference) ?? { reference: r.reference, count: 0, last: r.created_at, ids: [] };
        cur.count += 1;
        cur.ids.push(r.id);
        if (r.created_at > cur.last) cur.last = r.created_at;
        map.set(r.reference, cur);
      }
      setDemandes([...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)));
      setDemandesOk(true);
    } catch { setDemandesOk(false); }
  }

  async function marquerTraite(d: Demande) {
    await supabase.from("demandes_manquees").update({ traite: true }).in("id", d.ids);
    setDemandes(prev => prev.filter(x => x.reference !== d.reference));
  }

  useEffect(() => {
    (async () => {
      const all: Product[] = [];
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.from("products").select("*").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < 1000) break;
      }
      setProducts(all);
      setLoading(false);
    })();
    loadDemandes();
    // Ventes des 90 derniers jours (paginé) — sert au dormant et au prédictif
    (async () => {
      const since = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const rows: Item90[] = [];
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.from("sale_items")
          .select("product_id, equivalence_id, quantite, fournisseur_id, sales!inner(date)")
          .gte("sales.date", since).range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        rows.push(...(data as unknown as Item90[]));
        if (data.length < 1000) break;
      }
      setItems90(rows);
    })();
    // Variantes de marque (stock par marque)
    (async () => {
      const rows: EquivRow[] = [];
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.from("equivalences")
          .select("id, product_id, marque, reference, stock, prix_achat, prix").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        rows.push(...(data as EquivRow[]));
        if (data.length < 1000) break;
      }
      setEquivs(rows);
    })();
    supabase.from("fournisseurs").select("id, nom, telephone").then(({ data }) => setFours(data ?? []));
  }, []);

  // ---------- Stock dormant (Bible §4.2) : rien vendu en 90 j, en stock, créé il y a > 60 j ----------
  const dormants = useMemo(() => {
    const soldP = new Set(items90.map(i => i.product_id));
    const soldE = new Set(items90.map(i => i.equivalence_id).filter(Boolean) as string[]);
    const cutoff60 = new Date(Date.now() - 60 * 86400000).toISOString();
    const byId = new Map(products.map(p => [p.id, p]));
    const rows: { key: string; productId: string; reference: string; marque: string; stock: number; valeur: number; isVariant: boolean }[] = [];
    for (const p of products) {
      if (p.stock > 0 && !soldP.has(p.id) && p.created_at < cutoff60)
        rows.push({ key: p.id, productId: p.id, reference: p.reference, marque: p.marque ?? "Filtron", stock: p.stock, valeur: p.stock * p.prix_achat, isVariant: false });
    }
    for (const e of equivs) {
      const parent = byId.get(e.product_id);
      if (!parent || e.stock <= 0 || soldE.has(e.id) || parent.created_at >= cutoff60) continue;
      rows.push({ key: e.id, productId: e.product_id, reference: e.reference, marque: e.marque, stock: e.stock, valeur: e.stock * (e.prix_achat ?? parent.prix_achat), isVariant: true });
    }
    return rows.sort((a, b) => b.valeur - a.valeur);
  }, [products, equivs, items90]);
  const valeurDormante = dormants.reduce((s, d) => s + d.valeur, 0);

  async function promoDormant(productId: string) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const promo = Math.round(p.prix_vente * 0.85);
    await supabase.from("products").update({ prix_promo: promo }).eq("id", productId);
    setProducts(prev => prev.map(x => x.id === productId ? { ...x, prix_promo: promo } : x));
    setFlash(`${p.reference} → promo ${promo} MAD ✓`);
    setTimeout(() => setFlash(null), 2500);
  }

  function promoWhatsAppDormant() {
    const enPromo = products.filter(p => p.prix_promo != null && dormants.some(d => d.productId === p.id && !d.isVariant));
    const lignes = ["🔥 *Promos FiltroPro — quantités limitées*", ""];
    for (const p of enPromo.slice(0, 15)) lignes.push(`• ${p.reference} : *${p.prix_promo} MAD* au lieu de ${p.prix_vente}`);
    if (enPromo.length === 0) { alert("Mets d'abord une promo (bouton −15 %) sur au moins un produit dormant."); return; }
    lignes.push("", "📞 06 02 35 02 90 · on livre les garages 🚚");
    sendWhatsApp(null, lignes.join("\n"));
  }

  // ---------- Réappro prédictif (Bible §4.7) : jours de stock restants ----------
  const predictif = useMemo(() => {
    const qty = new Map<string, number>();
    const lastFour = new Map<string, { date: string; fournisseur_id: string }>();
    for (const it of items90) {
      qty.set(it.product_id, (qty.get(it.product_id) ?? 0) + it.quantite);
      const d = it.sales?.date ?? "";
      if (it.fournisseur_id && (!lastFour.has(it.product_id) || d > lastFour.get(it.product_id)!.date))
        lastFour.set(it.product_id, { date: d, fournisseur_id: it.fournisseur_id });
    }
    // Seules les variantes AVEC prix de vente sont réellement vendables (même filtre que /ventes) —
    // sinon le stock d'une variante sans prix gonfle "jours restants" et masque une rupture réelle.
    const stockEquiv = new Map<string, number>();
    for (const e of equivs) {
      if (e.prix == null) continue;
      stockEquiv.set(e.product_id, (stockEquiv.get(e.product_id) ?? 0) + Math.max(0, e.stock));
    }
    const fourName = (id?: string) => fours.find(f => f.id === id)?.nom ?? "—";
    const rows: { id: string; reference: string; stockTotal: number; parJour: number; jours: number; suggestion: number; fournisseur: string }[] = [];
    for (const p of products) {
      const q = qty.get(p.id) ?? 0;
      if (q <= 0) continue;
      const vel = q / 90;
      const stockTotal = Math.max(0, p.stock) + (stockEquiv.get(p.id) ?? 0);
      rows.push({
        id: p.id, reference: p.reference, stockTotal, parJour: vel,
        jours: Math.round(stockTotal / vel),
        suggestion: Math.max(0, Math.ceil(vel * 30) - stockTotal),
        fournisseur: fourName(lastFour.get(p.id)?.fournisseur_id),
      });
    }
    return rows.sort((a, b) => a.jours - b.jours);
  }, [products, equivs, items90, fours]);

  const predShown = urgentOnly ? predictif.filter(r => r.jours < 15) : predictif;
  const predGroups = useMemo(() => {
    const g = new Map<string, typeof predShown>();
    for (const r of predShown) { const arr = g.get(r.fournisseur) ?? []; arr.push(r); g.set(r.fournisseur, arr); }
    return [...g.entries()];
  }, [predShown]);

  function commandePredictive(fournisseur: string, rows: { reference: string; suggestion: number }[]) {
    const utiles = rows.filter(r => r.suggestion > 0);
    if (!utiles.length) { alert("Rien à commander dans ce groupe (couverture 30 j déjà atteinte)."); return; }
    const tel = fours.find(f => f.nom === fournisseur)?.telephone ?? null;
    const lignes = ["🧾 *Bon de commande — FiltroPro*", `📅 ${new Date().toLocaleDateString("fr-FR")}`, "————————————"];
    for (const r of utiles) lignes.push(`• ${r.reference}  ×${r.suggestion}`);
    lignes.push("————————————", `📦 ${utiles.length} référence(s)`);
    sendWhatsApp(tel, lignes.join("\n"));
  }

  // Produits à recommander : stock <= seuil
  const low = useMemo(() =>
    products.filter(p => p.stock <= p.stock_min).sort((a, b) => refCompare(a.reference, b.reference)),
    [products]);

  // Sélection + quantité suggérée par défaut (remettre ~2x le seuil)
  useEffect(() => {
    if (!low.length) return;
    const s: Record<string, boolean> = {}, q: Record<string, number> = {};
    for (const p of low) { s[p.id] = true; q[p.id] = Math.max(1, p.stock_min * 2 - p.stock); }
    setSel(s); setQty(q);
  }, [low]);

  const selected = low.filter(p => sel[p.id]);

  function orderText() {
    const date = new Date().toLocaleDateString("fr-FR");
    const lignes = selected.map(p => `• ${p.reference} — ${p.nom_fr}  ×${qty[p.id] || 1}`).join("\n");
    return [
      "🧾 *Bon de commande — FiltroPro*",
      `📅 ${date}`,
      "————————————",
      lignes,
      "————————————",
      `📦 ${selected.length} référence(s) à commander`,
    ].join("\n");
  }

  function printOrder() {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = selected.map(p => `<tr><td>${p.reference}</td><td>${p.nom_fr}</td><td style="text-align:center">${p.stock}</td><td style="text-align:center;font-weight:bold">${qty[p.id] || 1}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon de commande</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;max-width:680px;margin:0 auto}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:7px;font-size:13px}th{background:#f3f4f6}.f{margin-top:18px;text-align:center;font-size:12px;color:#888}@media print{button{display:none}}</style>
    </head><body><h2>Bon de Commande — FiltroPro</h2><p>Date : ${new Date().toLocaleDateString("fr-FR")}</p>
    <table><thead><tr><th>Référence</th><th>Désignation</th><th>Stock actuel</th><th>À commander</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="f">FiltroPro — Pièces & Filtres Auto · Maroc</p>
    <button onclick="window.print()" style="margin-top:12px;padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer">Imprimer</button>
    </body></html>`);
    w.document.close();
  }

  return (
    <div>
      <Header title="reorder" action={
        <div className="flex gap-2">
          <button onClick={printOrder} disabled={!selected.length} className="btn-secondary flex items-center gap-2 disabled:opacity-40">
            <Printer size={16} /> <span className="hidden sm:inline">Imprimer</span>
          </button>
          <button onClick={() => sendWhatsApp(null, orderText())} disabled={!selected.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-40">
            <MessageCircle size={16} /> Commande WhatsApp
          </button>
        </div>
      } />

      {/* Onglets : sous seuil / prédictif (§4.7) / dormant (§4.2) / demandé (§4.12) */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setTab("seuil")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "seuil" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          Sous seuil ({low.length})
        </button>
        <button onClick={() => setTab("predictif")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "predictif" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          📈 Prédictif
          {predictif.some(r => r.jours < 15) && <span className="ms-1.5 inline-block h-2 w-2 rounded-full bg-orange-400 animate-pulse" />}
        </button>
        <button onClick={() => setTab("dormant")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "dormant" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          💤 Dormant ({dormants.length})
        </button>
        <button onClick={() => setTab("demande")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "demande" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          🔎 Demandé ({demandes.length})
          {demandes.some(d => d.count >= 3) && <span className="ms-1.5 inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />}
        </button>
      </div>

      {flash && (
        <div className="mb-3 px-3 py-2 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 flex items-center gap-2">
          <Check size={15} /> {flash}
        </div>
      )}

      {/* ---------- Stock dormant (Bible §4.2) ---------- */}
      {tab === "dormant" && (
        <>
          <div className="card p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💤</span>
              <div>
                <p className="font-semibold text-slate-100">{dormants.length} produit(s) sans vente depuis 90 j</p>
                <button onClick={() => setShowVal(v => !v)} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                  <Eye size={12} /> {showVal ? `${valeurDormante.toFixed(0)} MAD immobilisés (prix d'achat)` : "Afficher la valeur immobilisée"}
                </button>
              </div>
            </div>
            <button onClick={promoWhatsAppDormant}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium">
              <MessageCircle size={16} /> 📣 Promo WhatsApp
            </button>
          </div>
          <div className="card overflow-x-auto">
            {dormants.length === 0 && <p className="text-center text-slate-400 py-10">✅ Rien ne dort — tout le stock a bougé ces 90 derniers jours.</p>}
            {dormants.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{["Référence", "Marque", "Stock", "Immobilisé", ""].map((h, i) => (
                    <th key={i} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dormants.map(d => {
                    const p = products.find(x => x.id === d.productId);
                    return (
                      <tr key={d.key} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{d.reference}</td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs">{d.marque}{d.isVariant ? " (variante)" : ""}</td>
                        <td className="px-3 py-2.5 text-slate-300">{d.stock}</td>
                        <td className="px-3 py-2.5 text-orange-400 text-xs">{showVal ? `${d.valeur.toFixed(0)} MAD` : "•••"}</td>
                        <td className="px-3 py-2.5">
                          {!d.isVariant && (p?.prix_promo != null ? (
                            <span className="text-xs text-emerald-400 font-medium">Promo {p.prix_promo} MAD ✓</span>
                          ) : (
                            <button onClick={() => promoDormant(d.productId)}
                              className="text-xs bg-amber-500/15 text-amber-300 px-2 py-1 rounded-lg hover:bg-amber-500/25">
                              Promo −15 %
                            </button>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ---------- Réappro prédictif (Bible §4.7) ---------- */}
      {tab === "predictif" && (
        <>
          <div className="card p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-slate-100">Jours de stock restants (vitesse réelle sur 90 j)</p>
              <p className="text-xs text-slate-400">Suggestion = de quoi tenir 30 jours. Groupé par dernier fournisseur utilisé.</p>
            </div>
            <button onClick={() => setUrgentOnly(v => !v)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium ${urgentOnly ? "bg-orange-500/25 text-orange-300" : "card text-slate-300 hover:text-slate-100"}`}>
              ⚠ Moins de 15 j {urgentOnly ? "✓" : ""}
            </button>
          </div>
          {predShown.length === 0 && <div className="card p-10 text-center text-slate-400">Pas encore assez de ventes pour prédire — reviens après quelques jours de ventes.</div>}
          {predGroups.map(([four, rows]) => (
            <div key={four} className="card overflow-x-auto mb-4">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase">Fournisseur : {four}</p>
                <button onClick={() => commandePredictive(four, rows)}
                  className="flex items-center gap-1.5 text-xs bg-green-500/15 text-green-400 px-2.5 py-1.5 rounded-lg hover:bg-green-500/25">
                  <MessageCircle size={13} /> Commander
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr>{["Référence", "Stock", "Ventes/j", "Reste", "Commander"].map((h, i) => (
                    <th key={i} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(r => (
                    <tr key={r.id} className={r.jours < 15 ? "bg-orange-500/5" : "hover:bg-slate-50"}>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{r.reference}</td>
                      <td className="px-3 py-2.5 text-slate-300">{r.stockTotal}</td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{r.parJour.toFixed(2)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-semibold ${r.jours < 8 ? "text-red-400" : r.jours < 15 ? "text-orange-400" : "text-slate-300"}`}>{r.jours} j</span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-200">{r.suggestion > 0 ? r.suggestion : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {tab === "demande" && (
        <div className="card overflow-x-auto">
          {!demandesOk && (
            <p className="text-center text-slate-400 py-10 px-4">
              Table absente — colle le SQL <span className="font-mono text-slate-300">supabase/idees_bible_19_24.sql</span> dans l&apos;éditeur Supabase (Bible §4.12).
            </p>
          )}
          {demandesOk && demandes.length === 0 && (
            <p className="text-center text-slate-400 py-10 px-4">
              Aucune demande notée. Quand un client demande une référence que tu n&apos;as pas :
              Recherche → « ❌ J&apos;ai pas » — à la 3ᵉ demande, elle s&apos;allume ici.
            </p>
          )}
          {demandesOk && demandes.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Référence", "Demandé", "Dernière fois", ""].map((h, i) => (
                    <th key={i} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demandes.map(d => (
                  <tr key={d.reference} className={d.count >= 3 ? "bg-red-500/5" : "hover:bg-slate-50"}>
                    <td className="px-3 py-2.5 font-mono text-slate-200">{d.reference}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-semibold ${d.count >= 3 ? "text-red-400" : "text-slate-300"}`}>{d.count}×</span>
                      {d.count >= 3 && <span className="ms-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">à stocker</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{new Date(d.last).toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => router.push(`/recherche?q=${encodeURIComponent(d.reference)}`)}
                          className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/25" title="Créer / rechercher la référence">
                          <Plus size={12} /> Créer
                        </button>
                        <button onClick={() => marquerTraite(d)}
                          className="flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-2 py-1 rounded-lg hover:bg-green-500/25" title="Marquer traité">
                          <Check size={12} /> Traité
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "seuil" && (<>
      <div className="card p-4 mb-4 flex items-center gap-3">
        <AlertTriangle size={22} className="text-yellow-400 shrink-0" />
        <div>
          <p className="font-semibold text-slate-100">{low.length} produit(s) à recommander</p>
          <p className="text-xs text-slate-400">Stock au niveau ou sous le seuil minimum. Coche/ajuste les quantités puis envoie la commande au fournisseur.</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["", "Référence", "Désignation", "Stock", "Seuil", "À commander"].map((h, i) => (
                <th key={i} className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {low.map(p => (
              <tr key={p.id} className={sel[p.id] ? "bg-blue-50" : "hover:bg-slate-50"}>
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={!!sel[p.id]} onChange={e => setSel({ ...sel, [p.id]: e.target.checked })} className="h-4 w-4 accent-red-600" />
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{p.reference}</td>
                <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{p.nom_fr}</td>
                <td className="px-3 py-2.5"><StockBadge stock={p.stock} stockMin={p.stock_min} /></td>
                <td className="px-3 py-2.5 text-slate-400">{p.stock_min}</td>
                <td className="px-3 py-2.5">
                  <input type="number" min={1} className="input w-20 text-center font-mono py-1"
                    value={qty[p.id] ?? 1} onChange={e => setQty({ ...qty, [p.id]: Math.max(1, +e.target.value) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && low.length === 0 && <p className="text-center text-slate-400 py-10">✅ Aucun produit sous le seuil — stock OK.</p>}
        {loading && <p className="text-center text-slate-400 py-10">{t("loading")}</p>}
      </div>
      </>)}
    </div>
  );
}
