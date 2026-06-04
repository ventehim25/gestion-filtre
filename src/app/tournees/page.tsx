"use client";
export const dynamic = "force-dynamic";
import nextDynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import type { Garage, GarageStatut } from "@/types/database";
import {
  KENITRA, STATUT_INFO, STATUT_ORDER, optimizeRoute, planDays, gmapsTo, gmapsRoute,
  type DayPlan, type LatLng,
} from "@/lib/tournee";
import {
  MapPin, Plus, Phone, MessageCircle, Navigation, Pencil, Trash2, X, Camera,
  Route as RouteIcon, Crosshair, ExternalLink, StickyNote, ListChecks,
} from "lucide-react";

const GarageMap = nextDynamic(() => import("@/components/GarageMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-[var(--surface-2)] rounded-xl">
      Chargement de la carte…
    </div>
  ),
});

type FormState = {
  nom: string; telephone: string; ville: string; region: string;
  statut: GarageStatut; note: string; refs_demandees: string; photo_url: string;
  latitude: number; longitude: number;
};
const emptyForm: FormState = {
  nom: "", telephone: "", ville: "", region: "", statut: "a_livrer",
  note: "", refs_demandees: "", photo_url: "", latitude: 0, longitude: 0,
};

// Compresse une photo en data URL légère (max 1000px, JPEG 0.6).
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1000;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r); height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function waLink(tel: string): string {
  const digits = tel.replace(/\D/g, "").replace(/^0/, "");
  return `https://wa.me/212${digits}`;
}

export default function TourneesPage() {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Garage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [photoBusy, setPhotoBusy] = useState(false);

  // placing : "new" = on attend un clic pour créer ; <id> = on repositionne un garage
  const [placing, setPlacing] = useState<"new" | string | null>(null);

  // Filtres
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<Set<GarageStatut>>(new Set());
  const [regionFilter, setRegionFilter] = useState<Set<string>>(new Set());

  // Circuit
  const [kmCap, setKmCap] = useState(250);
  const [dayPlan, setDayPlan] = useState<DayPlan[] | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | "all" | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("garages").select("*").order("created_at");
    setGarages((data as Garage[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const regions = useMemo(
    () => [...new Set(garages.map((g) => g.region).filter(Boolean) as string[])].sort(),
    [garages],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return garages.filter((g) => {
      if (statutFilter.size && !statutFilter.has(g.statut)) return false;
      if (regionFilter.size && !(g.region && regionFilter.has(g.region))) return false;
      if (q && !(`${g.nom} ${g.ville ?? ""} ${g.region ?? ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [garages, statutFilter, regionFilter, search]);

  // Numéro d'ordre global (badges sur la carte) une fois le circuit calculé
  const orderMap = useMemo(() => {
    const m: Record<string, number> = {};
    orderedIds.forEach((id, i) => { m[id] = i + 1; });
    return m;
  }, [orderedIds]);

  // Garages affichés sur la carte : filtrés (et limités au jour sélectionné si demandé)
  const dayGarageIds = useMemo(() => {
    if (selectedDay === null || selectedDay === "all" || !dayPlan) return null;
    return new Set(dayPlan[selectedDay - 1]?.garages.map((g) => g.id) ?? []);
  }, [selectedDay, dayPlan]);

  const mapGarages = useMemo(
    () => (dayGarageIds ? filtered.filter((g) => dayGarageIds.has(g.id)) : filtered),
    [filtered, dayGarageIds],
  );

  // Polyligne affichée
  const routeLine: LatLng[] | undefined = useMemo(() => {
    if (!dayPlan || selectedDay === null) return undefined;
    if (selectedDay === "all") {
      const ord = orderedIds
        .map((id) => garages.find((g) => g.id === id))
        .filter(Boolean) as Garage[];
      if (!ord.length) return undefined;
      return [KENITRA, ...ord.map((g) => ({ lat: g.latitude, lng: g.longitude })), KENITRA];
    }
    return dayPlan[selectedDay - 1]?.line;
  }, [dayPlan, selectedDay, orderedIds, garages]);

  // Liste affichée : ordonnée par circuit si calculé
  const listGarages = useMemo(() => {
    const base = dayGarageIds ? filtered.filter((g) => dayGarageIds.has(g.id)) : filtered;
    if (orderedIds.length) {
      return [...base].sort((a, b) => (orderMap[a.id] ?? 1e9) - (orderMap[b.id] ?? 1e9));
    }
    return base;
  }, [filtered, dayGarageIds, orderedIds, orderMap]);

  function calcCircuit() {
    const routable = filtered.filter((g) => typeof g.latitude === "number");
    if (routable.length === 0) return;
    const ordered = optimizeRoute(routable, KENITRA);
    setOrderedIds(ordered.map((g) => g.id));
    setDayPlan(planDays(ordered, KENITRA, kmCap));
    setSelectedDay("all");
  }
  function clearCircuit() {
    setDayPlan(null); setOrderedIds([]); setSelectedDay(null);
  }

  // --- CRUD ---
  function openNew() {
    setEditing(null); setForm(emptyForm); setPlacing("new");
  }
  function openEdit(g: Garage) {
    setEditing(g);
    setForm({
      nom: g.nom, telephone: g.telephone ?? "", ville: g.ville ?? "", region: g.region ?? "",
      statut: g.statut, note: g.note ?? "", refs_demandees: g.refs_demandees ?? "",
      photo_url: g.photo_url ?? "", latitude: g.latitude, longitude: g.longitude,
    });
    setShowForm(true);
  }

  async function handleMapClick(lat: number, lng: number) {
    if (placing === "new") {
      setForm({ ...emptyForm, latitude: lat, longitude: lng });
      setEditing(null); setPlacing(null); setShowForm(true);
    } else if (typeof placing === "string") {
      await supabase.from("garages").update({ latitude: lat, longitude: lng }).eq("id", placing);
      setPlacing(null); load();
    }
  }

  async function save() {
    if (!form.nom.trim()) { alert("Le nom du garage est obligatoire."); return; }
    const payload = {
      nom: form.nom.trim(),
      telephone: form.telephone || null,
      ville: form.ville || null,
      region: form.region || null,
      statut: form.statut,
      note: form.note || null,
      refs_demandees: form.refs_demandees || null,
      photo_url: form.photo_url || null,
      latitude: form.latitude,
      longitude: form.longitude,
    };
    if (editing) await supabase.from("garages").update(payload).eq("id", editing.id);
    else await supabase.from("garages").insert(payload);
    setShowForm(false); setEditing(null); setForm(emptyForm);
    clearCircuit(); load();
  }

  async function remove(g: Garage) {
    if (!confirm(`Supprimer « ${g.nom} » ?`)) return;
    await supabase.from("garages").delete().eq("id", g.id);
    clearCircuit(); load();
  }

  async function setStatut(g: Garage, statut: GarageStatut) {
    await supabase.from("garages").update({ statut }).eq("id", g.id);
    setGarages((prev) => prev.map((x) => (x.id === g.id ? { ...x, statut } : x)));
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try { const url = await compressImage(file); setForm((f) => ({ ...f, photo_url: url })); }
    catch { alert("Impossible de charger la photo."); }
    finally { setPhotoBusy(false); }
  }

  function toggle<T>(set: Set<T>, val: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of garages) c[g.statut] = (c[g.statut] ?? 0) + 1;
    return c;
  }, [garages]);

  return (
    <div>
      <Header title="tours" action={
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Ajouter un garage
        </button>
      } />

      {/* Bandeau "mode placement" */}
      {placing && (
        <div className="card p-3 mb-4 flex items-center justify-between border-red-500/40 bg-red-500/10">
          <div className="flex items-center gap-2 text-sm text-red-300">
            <Crosshair size={16} />
            {placing === "new"
              ? "Cliquez sur la carte à l'emplacement du garage."
              : "Cliquez sur la carte pour repositionner le garage."}
          </div>
          <button onClick={() => setPlacing(null)} className="btn-secondary text-xs">Annuler</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carte */}
        <div className="lg:col-span-2 order-1">
          <div className="card p-1.5 h-[55vh] lg:h-[78vh]">
            <GarageMap
              garages={mapGarages}
              base={KENITRA}
              routeLine={routeLine}
              orderMap={orderMap}
              adding={placing !== null}
              focusId={focusId}
              onMapClick={handleMapClick}
              onMarkerClick={(g) => { setFocusId(g.id); openEdit(g); }}
            />
          </div>
        </div>

        {/* Panneau de contrôle */}
        <div className="order-2 space-y-4">
          {/* Circuit */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <RouteIcon size={16} className="text-red-400" /> Circuit optimisé
            </h3>
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Plafond km / jour</label>
                <input type="number" min={20} step={10} className="input" value={kmCap}
                  onChange={(e) => setKmCap(Number(e.target.value) || 0)} />
              </div>
              <button onClick={calcCircuit} className="btn-primary whitespace-nowrap">Calculer</button>
            </div>
            {dayPlan && (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button onClick={() => setSelectedDay("all")}
                    className={`text-xs px-2.5 py-1 rounded-full ${selectedDay === "all" ? "bg-red-600 text-white" : "btn-secondary"}`}>
                    Tout ({orderedIds.length})
                  </button>
                  {dayPlan.map((d) => (
                    <button key={d.jour} onClick={() => setSelectedDay(d.jour)}
                      className={`text-xs px-2.5 py-1 rounded-full ${selectedDay === d.jour ? "bg-red-600 text-white" : "btn-secondary"}`}>
                      Jour {d.jour} · {d.distanceKm} km · {d.garages.length}
                    </button>
                  ))}
                </div>
                {typeof selectedDay === "number" && dayPlan[selectedDay - 1] && (
                  <a href={gmapsRoute(dayPlan[selectedDay - 1].garages)} target="_blank" rel="noreferrer"
                    className="text-xs flex items-center gap-1.5 text-blue-400 hover:underline">
                    <ExternalLink size={12} /> Ouvrir l'itinéraire du jour dans Google Maps
                  </a>
                )}
                <button onClick={clearCircuit} className="text-xs text-slate-400 hover:text-slate-200 mt-2">Effacer le circuit</button>
              </>
            )}
          </div>

          {/* Filtres statut */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <ListChecks size={16} className="text-red-400" /> Statuts
            </h3>
            <div className="space-y-1.5">
              {STATUT_ORDER.map((s) => {
                const info = STATUT_INFO[s];
                const active = statutFilter.has(s);
                return (
                  <button key={s} onClick={() => toggle(statutFilter, s, setStatutFilter)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${active ? "ring-2 ring-red-500/60" : ""}`}
                    style={{ background: info.bg }}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: info.color }} />
                      {info.label}
                    </span>
                    <span className="text-xs text-slate-400">{counts[s] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtres région */}
          {regions.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-red-400" /> Régions / villes
              </h3>
              <div className="flex flex-wrap gap-2">
                {regions.map((r) => (
                  <button key={r} onClick={() => toggle(regionFilter, r, setRegionFilter)}
                    className={`text-xs px-2.5 py-1 rounded-full ${regionFilter.has(r) ? "bg-red-600 text-white" : "btn-secondary"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Liste des garages */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-200">
            Garages <span className="text-slate-500 text-sm">({listGarages.length})</span>
          </h3>
          <input className="input w-56" placeholder="Rechercher un garage…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-10">Chargement…</p>
        ) : listGarages.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            <MapPin size={40} className="mx-auto mb-3 text-slate-600" />
            <p>Aucun garage. Cliquez sur « Ajouter un garage » puis posez un point sur la carte.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listGarages.map((g) => {
              const info = STATUT_INFO[g.statut];
              const order = orderMap[g.id];
              return (
                <div key={g.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button onClick={() => { setFocusId(g.id); }} className="text-left">
                      <p className="font-semibold text-slate-100 flex items-center gap-2">
                        {order != null && (
                          <span className="w-5 h-5 shrink-0 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center font-bold">{order}</span>
                        )}
                        {g.nom}
                      </p>
                      <p className="text-sm text-slate-400">{[g.ville, g.region].filter(Boolean).join(" · ")}</p>
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEdit(g)} className="text-blue-400 hover:text-blue-300"><Pencil size={15} /></button>
                      <button onClick={() => remove(g)} className="text-red-400 hover:text-red-300"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {g.photo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={g.photo_url} alt={g.nom} className="w-full h-28 object-cover rounded-lg mb-2" />
                  )}

                  {/* Statut rapide */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STATUT_ORDER.map((s) => (
                      <button key={s} onClick={() => setStatut(g, s)} title={STATUT_INFO[s].label}
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: STATUT_INFO[s].color, borderColor: g.statut === s ? "#fff" : "transparent" }} />
                    ))}
                    <span className="text-xs text-slate-300 self-center ms-1" style={{ color: info.color }}>{info.label}</span>
                  </div>

                  {/* Contacts + navigation */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {g.telephone && (
                      <>
                        <a href={`tel:${g.telephone}`} className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-300 px-2 py-1 rounded-full hover:bg-blue-500/25">
                          <Phone size={12} /> Appeler
                        </a>
                        <a href={waLink(g.telephone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-green-500/15 text-green-300 px-2 py-1 rounded-full hover:bg-green-500/25">
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      </>
                    )}
                    <a href={gmapsTo({ lat: g.latitude, lng: g.longitude })} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs bg-red-500/15 text-red-300 px-2 py-1 rounded-full hover:bg-red-500/25">
                      <Navigation size={12} /> Y aller
                    </a>
                  </div>

                  {g.refs_demandees && (
                    <div className="bg-[var(--surface-2)] rounded-lg px-3 py-2 mb-1.5">
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5"><ListChecks size={11} /> À apporter :</p>
                      <p className="text-xs text-slate-200 whitespace-pre-line">{g.refs_demandees}</p>
                    </div>
                  )}
                  {g.note && (
                    <p className="text-xs text-amber-200/80 flex items-start gap-1">
                      <StickyNote size={12} className="mt-0.5 shrink-0" /> {g.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100">{editing ? "Modifier le garage" : "Nouveau garage"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Nom du garage *</label>
                <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400 mb-1 block">Ville</label>
                  <input className="input" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Région</label>
                  <input className="input" list="regions-list" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                  <datalist id="regions-list">{regions.map((r) => <option key={r} value={r} />)}</datalist>
                </div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Téléphone</label>
                <input className="input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Statut</label>
                <select className="input" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as GarageStatut })}>
                  {STATUT_ORDER.map((s) => <option key={s} value={s}>{STATUT_INFO[s].label}</option>)}
                </select></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Références à apporter au prochain passage</label>
                <textarea className="input" rows={3} placeholder="Une référence par ligne…" value={form.refs_demandees}
                  onChange={(e) => setForm({ ...form, refs_demandees: e.target.value })} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Pense-bête / commentaire</label>
                <textarea className="input" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Photo de la devanture</label>
                <div className="flex items-center gap-3">
                  <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                    <Camera size={15} /> {photoBusy ? "…" : "Photo"}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
                  </label>
                  {form.photo_url && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.photo_url} alt="aperçu" className="h-14 w-14 object-cover rounded-lg" />
                      <button onClick={() => setForm({ ...form, photo_url: "" })} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5"><X size={12} /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between bg-[var(--surface-2)] rounded-lg px-3 py-2">
                <span>📍 {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</span>
                {editing && (
                  <button onClick={() => { setShowForm(false); setPlacing(editing.id); }}
                    className="text-blue-400 hover:underline flex items-center gap-1">
                    <Crosshair size={12} /> Repositionner
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
              <button onClick={save} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
