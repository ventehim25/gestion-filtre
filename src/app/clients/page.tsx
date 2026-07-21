"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Client, ClientType } from "@/types/database";
import { Plus, Search, Pencil, Trash2, Phone, MessageCircle, Eye } from "lucide-react";

const empty = { nom: "", telephone: "", ville: "", adresse: "", notes: "", solde_du: 0, type: "comptoir" as ClientType, remise_pct: 0, limite_credit: 0, parrain_id: "" };

const TYPE_LABELS: Record<ClientType, string> = { comptoir: "Comptoir", garage: "Garage", gros: "Gros" };

// Badge fiabilité : basé sur l'âge de la dette EN COURS (pas d'historique de délai de paiement disponible)
function fiabiliteBadge(oldestUnpaidDate: string | null): { emoji: string; label: string; cls: string } | null {
  if (!oldestUnpaidDate) return null; // rien en cours → pas de jugement
  const days = Math.round((Date.now() - new Date(oldestUnpaidDate).getTime()) / 86400000);
  if (days > 30) return { emoji: "🔴", label: `Dette > 30 j`, cls: "bg-red-500/15 text-red-400" };
  if (days > 7) return { emoji: "🟠", label: `Dette ${days} j`, cls: "bg-orange-500/15 text-orange-400" };
  return { emoji: "🟢", label: "À jour", cls: "bg-green-500/15 text-green-400" };
}

export default function ClientsPage() {
  const { t } = useLang();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);
  // Marges (bénéfice + coût fournisseur) cumulées par client, révélées au clic
  const [margins, setMargins] = useState<Record<string, { benefice: number; cost: number }>>({});
  const [reveal, setReveal] = useState<Set<string>>(new Set());
  // Dette réelle par client (calculée en direct depuis les ventes — solde_du n'est jamais mis à jour automatiquement)
  const [debts, setDebts] = useState<Record<string, { total: number; oldest: string }>>({});
  // Fidélité paliers trimestriels (Bible §4.9) : CA du trimestre en cours par client
  const [trimCA, setTrimCA] = useState<Record<string, number>>({});
  const [palierIgnore, setPalierIgnore] = useState<Set<string>>(new Set());
  // Ancien impayé (dette d'avant l'app) : créé comme un bon en attente → suit le système normal
  const [impayeFor, setImpayeFor] = useState<Client | null>(null);
  const [impMontant, setImpMontant] = useState(0);
  const [impDate, setImpDate] = useState("");
  function openAncienImpaye(c: Client) { setImpayeFor(c); setImpMontant(0); setImpDate(new Date().toISOString().slice(0, 10)); }
  async function saveAncienImpaye() {
    if (!impayeFor || impMontant <= 0) { alert("Montant requis"); return; }
    const { error } = await supabase.from("sales").insert({
      client_id: impayeFor.id, date: impDate || new Date().toISOString().slice(0, 10),
      total: impMontant, montant_paye: 0, statut: "en_attente", notes: "Ancien impayé (avant l'app)",
    });
    if (error) { alert("Erreur : " + error.message); return; }
    setImpayeFor(null); loadDebts();
  }

  // Palier suggéré selon le CA trimestriel : jamais appliqué sans validation (c'est du prix)
  function palierPour(ca: number): number {
    if (ca >= 15000) return 10;
    if (ca >= 8000) return 8;
    if (ca >= 3000) return 5;
    return 0;
  }
  function prochainPalier(ca: number): { seuil: number; remise: number } | null {
    if (ca < 3000) return { seuil: 3000, remise: 5 };
    if (ca < 8000) return { seuil: 8000, remise: 8 };
    if (ca < 15000) return { seuil: 15000, remise: 10 };
    return null;
  }

  async function loadTrimCA() {
    const now = new Date();
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10);
    const map: Record<string, number> = {};
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("sales").select("client_id, total").gte("date", qStart).range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      for (const s of data as { client_id: string; total: number }[]) map[s.client_id] = (map[s.client_id] ?? 0) + s.total;
      if (data.length < 1000) break;
    }
    setTrimCA(map);
  }

  async function appliquerPalier(c: Client, remise: number) {
    await supabase.from("clients").update({ remise_pct: remise }).eq("id", c.id);
    setClients(prev => prev.map(x => x.id === c.id ? { ...x, remise_pct: remise } : x));
  }
  function toggleReveal(id: string) {
    setReveal(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("nom");
    setClients(data ?? []);
  }

  async function loadMargins() {
    const map: Record<string, { benefice: number; cost: number }> = {};
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("sales")
        .select("client_id, items:sale_items(quantite, prix_unitaire, cout_unitaire, product:products(prix_achat))")
        .range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      for (const s of data as unknown as { client_id: string; items: { quantite: number; prix_unitaire: number; cout_unitaire: number | null; product: { prix_achat: number } | null }[] }[]) {
        const cur = map[s.client_id] ?? { benefice: 0, cost: 0 };
        for (const it of s.items ?? []) {
          const pa = it.cout_unitaire ?? it.product?.prix_achat ?? 0;
          cur.cost += it.quantite * pa;
          cur.benefice += it.quantite * (it.prix_unitaire - pa);
        }
        map[s.client_id] = cur;
      }
      if (data.length < 1000) break;
    }
    setMargins(map);
  }

  async function loadDebts() {
    const map: Record<string, { total: number; oldest: string }> = {};
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("sales").select("client_id, date, total, montant_paye").neq("statut", "paye").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      for (const s of data as { client_id: string; date: string; total: number; montant_paye: number }[]) {
        const cur = map[s.client_id] ?? { total: 0, oldest: s.date };
        cur.total += s.total - s.montant_paye;
        if (s.date < cur.oldest) cur.oldest = s.date;
        map[s.client_id] = cur;
      }
      if (data.length < 1000) break;
    }
    setDebts(map);
  }

  useEffect(() => { load(); loadMargins(); loadDebts(); loadTrimCA(); }, []);

  async function save() {
    // parrain_id "" → null ; si la colonne n'existe pas encore (SQL Bible §4.15 pas collé), on réessaie sans
    const payload: Record<string, unknown> = { ...form, parrain_id: form.parrain_id || null };
    const attempt = (p: Record<string, unknown>) =>
      editing ? supabase.from("clients").update(p).eq("id", editing.id) : supabase.from("clients").insert(p);
    let { error } = await attempt(payload);
    if (error && /parrain/i.test(error.message)) {
      delete payload.parrain_id;
      ({ error } = await attempt(payload));
    }
    if (error) { alert("Erreur : " + error.message); return; }
    setShowForm(false); setEditing(null); setForm(empty);
    load();
  }

  async function remove(id: string) {
    if (confirm(t("confirm") + "?")) {
      await supabase.from("clients").delete().eq("id", id);
      load();
    }
  }

  function startEdit(c: Client) {
    setEditing(c);
    setForm({ nom: c.nom, telephone: c.telephone ?? "", ville: c.ville, adresse: c.adresse ?? "", notes: c.notes ?? "", solde_du: c.solde_du, type: c.type ?? "comptoir", remise_pct: c.remise_pct ?? 0, limite_credit: c.limite_credit ?? 0, parrain_id: c.parrain_id ?? "" });
    setShowForm(true);
  }

  const filtered = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.ville.toLowerCase().includes(search.toLowerCase())
  );

  const cities = [...new Set(clients.map(c => c.ville))].sort();

  return (
    <div>
      <Header title="clients" action={
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(empty); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t("addClient")}
        </button>
      } />

      <div className="card p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9" placeholder={t("search")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" onChange={e => setSearch(e.target.value)}>
          <option value="">{t("city")} — tous</option>
          {cities.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="font-semibold text-slate-800 mb-4">{editing ? t("edit") : t("addClient")}</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 mb-1 block">{t("name")}</label><input className="input" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("phone")}</label><input className="input" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("city")}</label><input className="input" value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[11px] text-slate-500 mb-1 block">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ClientType })}>
                    {(Object.keys(TYPE_LABELS) as ClientType[]).map(k => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
                  </select>
                </div>
                <div><label className="text-[11px] text-slate-500 mb-1 block">Remise %</label>
                  <input type="number" className="input" value={form.remise_pct || ""} placeholder="0" onChange={e => setForm({ ...form, remise_pct: +e.target.value })} />
                </div>
                <div><label className="text-[11px] text-slate-500 mb-1 block">Limite crédit</label>
                  <input type="number" className="input" value={form.limite_credit || ""} placeholder="0 = illimité" onChange={e => setForm({ ...form, limite_credit: +e.target.value })} />
                </div>
              </div>
              {/* Parrainage (Bible §4.15) : le parrain reçoit 100 MAD d'avoir à la 1ère vente du filleul */}
              <div><label className="text-xs text-slate-500 mb-1 block">Parrainé par (optionnel — 🎁 100 MAD d&apos;avoir au parrain)</label>
                <select className="input" value={form.parrain_id} onChange={e => setForm({ ...form, parrain_id: e.target.value })}>
                  <option value="">— Personne —</option>
                  {clients.filter(c => c.id !== editing?.id && (c.type === "garage" || c.type === "gros")).map(c => (
                    <option key={c.id} value={c.id}>{c.nom} — {c.ville}</option>
                  ))}
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("notes")}</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={save} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-800">{c.nom}</p>
                <p className="text-sm text-slate-500">{c.ville}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(c)} className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {c.type && c.type !== "comptoir" && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400">{TYPE_LABELS[c.type]}</span>
              )}
              {(c.remise_pct ?? 0) > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">−{c.remise_pct}%</span>
              )}
              {(() => { const b = fiabiliteBadge(debts[c.id]?.oldest ?? null); return b && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${b.cls}`}>{b.emoji} {b.label}</span>
              ); })()}
              {(c.avoir ?? 0) > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">🎁 Avoir {(c.avoir ?? 0).toFixed(0)} MAD</span>
              )}
            </div>
            {c.telephone && (
              <div className="flex items-center gap-2 mb-2">
                <a href={`tel:${c.telephone}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <Phone size={14} /> {c.telephone}
                </a>
                <a href={`https://wa.me/212${c.telephone.replace(/^0/, "")}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors">
                  <MessageCircle size={12} /> WA
                </a>
              </div>
            )}
            {(debts[c.id]?.total ?? 0) > 0 && (
              <div className="mt-2 bg-orange-50 rounded-lg px-3 py-1.5">
                <p className="text-xs text-orange-600 font-medium">{t("pending")}: {debts[c.id].total.toFixed(0)} MAD</p>
              </div>
            )}
            <button onClick={() => openAncienImpaye(c)} className="mt-2 text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
              <Plus size={11} /> Ancien impayé (avant l&apos;app)
            </button>
            {/* Fidélité paliers trimestriels (Bible §4.9) — suggestion à valider, jamais automatique */}
            {(c.type === "garage" || c.type === "gros") && (() => {
              const ca = trimCA[c.id] ?? 0;
              const suggere = palierPour(ca);
              const next = prochainPalier(ca);
              if (suggere > (c.remise_pct ?? 0) && !palierIgnore.has(c.id)) {
                return (
                  <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-yellow-400 font-medium">💡 {ca.toFixed(0)} MAD ce trim. → palier −{suggere}%</p>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => appliquerPalier(c, suggere)} className="text-[11px] bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-lg hover:bg-yellow-500/30 font-medium">Appliquer</button>
                      <button onClick={() => setPalierIgnore(prev => new Set(prev).add(c.id))} className="text-[11px] text-slate-500 hover:text-slate-300 px-1">✕</button>
                    </div>
                  </div>
                );
              }
              if (next && ca > 0) {
                return <p className="mt-2 text-[11px] text-slate-500">🎯 Encore {(next.seuil - ca).toFixed(0)} MAD ce trimestre pour −{next.remise}%</p>;
              }
              return null;
            })()}
            {margins[c.id] && (
              <div className="mt-2">
                {reveal.has(c.id) ? (
                  <div className="flex gap-3 text-xs bg-[var(--surface-2)] rounded-lg px-3 py-1.5">
                    <span className="text-emerald-400 font-semibold">Bénéf: {margins[c.id].benefice.toFixed(0)} MAD</span>
                    <span className="text-orange-400">Coût: {margins[c.id].cost.toFixed(0)} MAD</span>
                  </div>
                ) : (
                  <button onClick={() => toggleReveal(c.id)} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                    <Eye size={12} /> Bénéfice / coût
                  </button>
                )}
              </div>
            )}
            {c.notes && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{c.notes}</p>}
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-slate-400 py-20">{t("noData")}</p>}

      {/* Ancien impayé (dette d'avant l'app) */}
      {impayeFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="font-semibold text-slate-100 mb-1">Ancien impayé — {impayeFor.nom}</h3>
            <p className="text-xs text-slate-500 mb-4">Ce que ce garage te devait déjà <b>avant l&apos;app</b>. Il apparaîtra dans « À relancer », et tu le gères comme un impayé normal (relance, paiement).</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Montant dû (MAD)</label>
                <input type="number" className="input" value={impMontant || ""} placeholder="0" onChange={e => setImpMontant(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Depuis quand (date de la dette)</label>
                <input type="date" className="input" value={impDate} onChange={e => setImpDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setImpayeFor(null)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={saveAncienImpaye} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
