"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/database";
import { Plus, Search, Pencil, Trash2, Phone } from "lucide-react";

const empty = { nom: "", telephone: "", ville: "", adresse: "", notes: "", solde_du: 0 };

export default function ClientsPage() {
  const { t } = useLang();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("nom");
    setClients(data ?? []);
  }

  useEffect(() => { load(); }, []);

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
    setForm({ nom: c.nom, telephone: c.telephone ?? "", ville: c.ville, adresse: c.adresse ?? "", notes: c.notes ?? "", solde_du: c.solde_du });
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
            {c.telephone && (
              <a href={`tel:${c.telephone}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2">
                <Phone size={14} /> {c.telephone}
              </a>
            )}
            {c.solde_du > 0 && (
              <div className="mt-2 bg-orange-50 rounded-lg px-3 py-1.5">
                <p className="text-xs text-orange-600 font-medium">{t("pending")}: {c.solde_du} MAD</p>
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
