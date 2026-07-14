"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Client, ClientType } from "@/types/database";
import { Plus, Search, Pencil, Trash2, Phone, MessageCircle, Eye } from "lucide-react";

const empty = { nom: "", telephone: "", ville: "", adresse: "", notes: "", solde_du: 0, type: "comptoir" as ClientType, remise_pct: 0, limite_credit: 0 };

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
  // Date de la plus vieille vente non soldée par client → badge fiabilité
  const [oldestUnpaid, setOldestUnpaid] = useState<Record<string, string>>({});
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
    const map: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.from("sales").select("client_id, date, statut").neq("statut", "paye").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      for (const s of data as { client_id: string; date: string }[]) {
        if (!map[s.client_id] || s.date < map[s.client_id]) map[s.client_id] = s.date;
      }
      if (data.length < 1000) break;
    }
    setOldestUnpaid(map);
  }

  useEffect(() => { load(); loadMargins(); loadDebts(); }, []);

  async function save() {
    if (editing) {
      await supabase.from("clients").update(form).eq("id", editing.id);
    } else {
      await supabase.from("clients").insert(form);
    }
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
    setForm({ nom: c.nom, telephone: c.telephone ?? "", ville: c.ville, adresse: c.adresse ?? "", notes: c.notes ?? "", solde_du: c.solde_du, type: c.type ?? "comptoir", remise_pct: c.remise_pct ?? 0, limite_credit: c.limite_credit ?? 0 });
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
              {(() => { const b = fiabiliteBadge(oldestUnpaid[c.id] ?? null); return b && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${b.cls}`}>{b.emoji} {b.label}</span>
              ); })()}
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
            {c.solde_du > 0 && (
              <div className="mt-2 bg-orange-50 rounded-lg px-3 py-1.5">
                <p className="text-xs text-orange-600 font-medium">{t("pending")}: {c.solde_du} MAD</p>
              </div>
            )}
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
    </div>
  );
}
