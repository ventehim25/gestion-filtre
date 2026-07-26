"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Product, Equivalence, Application } from "@/types/database";
import { Car, Search, Package, Tag, Repeat, Sparkles, ChevronDown, ChevronUp, Plus, X, Barcode } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import CategoryIcon from "@/components/CategoryIcon";
import VoiceButton from "@/components/VoiceButton";

type Vehicule = {
  id: string;
  marque: string;
  modele: string;
  annee_debut: number;
  annee_fin: number | null;
  motorisation: string;
  carburant: string;
  cylindree: string | null;
};

type RefResult = Product & {
  equivalences: Equivalence[];
  compatibilites: { vehicules: Vehicule | null }[];
  applications: Application[];
};

const WMI_MAP: Record<string, string> = {
  VF1: "Renault", VF2: "Renault", VF3: "Peugeot", VF6: "Citroën", VF7: "Citroën",
  UU1: "Dacia", UU2: "Dacia",
  WVW: "Volkswagen", WV1: "Volkswagen", WV2: "Volkswagen",
  WBA: "BMW", WBS: "BMW", WBX: "BMW",
  WDB: "Mercedes", WDD: "Mercedes", WDC: "Mercedes",
  WF0: "Ford", WFO: "Ford",
  JTD: "Toyota", JTN: "Toyota", JT2: "Toyota",
  KMH: "Hyundai", KMF: "Hyundai",
  KNA: "Kia", KNM: "Kia",
  JN1: "Nissan", JN3: "Nissan",
  TMB: "Skoda", TMA: "Skoda",
  VSS: "Seat", VSE: "Seat",
  ZFA: "Fiat", ZFF: "Fiat",
  MAT: "Opel", W0L: "Opel",
  SHH: "Honda", JHM: "Honda",
  VF8: "Renault", NM0: "Ford",
};

function decodeWmi(vin: string): string | null {
  if (vin.length < 3) return null;
  return WMI_MAP[vin.substring(0, 3).toUpperCase()] ?? null;
}

// Année modèle = 10ᵉ caractère du VIN (norme ISO). Lettres => 2010+, chiffres => 2001-2009.
const YEAR_CODES: Record<string, number> = {
  "1": 2001, "2": 2002, "3": 2003, "4": 2004, "5": 2005, "6": 2006, "7": 2007, "8": 2008, "9": 2009,
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017, J: 2018, K: 2019,
  L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
};
function decodeYear(vin: string): string {
  if (vin.length < 10) return "";
  const y = YEAR_CODES[vin[9].toUpperCase()];
  return y ? String(y) : "";
}

// Affiche une liste de "tags" repliée (aperçu sur UNE ligne) avec une flèche pour
// voir tout / réduire — évite que la liste prenne toute la page.
// `previewItems` : ce qu'on montre replié (ex. une marque distincte par tag).
function CollapsibleTags({ items, previewItems, limit = 2 }: { items: React.ReactNode[]; previewItems?: React.ReactNode[]; limit?: number }) {
  const [open, setOpen] = useState(false);
  const preview = previewItems ?? items.slice(0, limit);
  const hidden = items.length - preview.length;
  return (
    <div className={open ? "flex flex-wrap items-center gap-1.5" : "flex flex-nowrap items-center gap-1.5 overflow-hidden"}>
      {open ? items : preview}
      {hidden > 0 && (
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 text-xs font-medium text-blue-500 hover:text-blue-400 inline-flex items-center gap-0.5 px-1.5 py-0.5"
        >
          {open ? <>Réduire <ChevronUp size={13} /></> : <>Voir tout (+{hidden}) <ChevronDown size={13} /></>}
        </button>
      )}
    </div>
  );
}

// Garde au plus `n` éléments, chacun d'une marque différente (pas de doublon de marque).
function distinctByMarque<T extends { marque: string }>(list: T[], n: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of list) {
    if (!seen.has(x.marque)) { seen.add(x.marque); out.push(x); if (out.length >= n) break; }
  }
  return out;
}

export default function RecherchePage() {
  const { t } = useLang();
  const [tab, setTab] = useState<"ref" | "smart" | "vehicule">("ref");

  // ---------- Recherche rapide véhicule (texte libre sur les applications) ----------
  const [smartQ, setSmartQ] = useState("");
  const [smartRes, setSmartRes] = useState<{ product: Product; app: Application }[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartDone, setSmartDone] = useState(false);

  async function smartSearch(raw: string) {
    const toks = raw.trim().split(/\s+/).map(s => s.replace(/[^a-z0-9./]/gi, "")).filter(s => s.length >= 2);
    if (toks.length === 0) { setSmartRes([]); setSmartDone(false); return; }
    setSmartLoading(true); setSmartDone(true);
    const main = [...toks].sort((a, b) => b.length - a.length)[0];
    const { data } = await supabase.from("applications")
      .select("*, products(*)")
      .or(`marque.ilike.%${main}%,modele.ilike.%${main}%,moteur.ilike.%${main}%,code_moteur.ilike.%${main}%`)
      .limit(1000);
    const rows = (data ?? []) as unknown as (Application & { products: Product | null })[];
    const matched = rows.filter(a => {
      const hay = `${a.marque} ${a.modele} ${a.moteur ?? ""} ${a.code_moteur ?? ""} ${a.annee_debut ?? ""} ${a.annee_fin ?? ""} ${a.puissance ?? ""}`.toLowerCase();
      return toks.every(tk => hay.includes(tk.toLowerCase()));
    });
    const seen = new Set<string>();
    const out: { product: Product; app: Application }[] = [];
    for (const a of matched) {
      if (a.products && !seen.has(a.product_id)) { seen.add(a.product_id); out.push({ product: a.products, app: a }); }
    }
    setSmartRes(out.slice(0, 80));
    setSmartLoading(false);
  }

  // Recherche initiale depuis l'accueil (?q= / ?tab=)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const tb = sp.get("tab");
    const qp = sp.get("q");
    if (tb === "vehicule") setTab("vehicule");
    if (qp) { setTab("ref"); setRefQuery(qp.toUpperCase()); searchRef(qp); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      filtre_huile: t("filterOil"), filtre_air: t("filterAir"),
      filtre_carburant: t("filterFuel"), filtre_habitacle: t("filterCabin"),
      filtre_refroidissement: t("filterCooling"), huile_moteur: t("motorOil"), autre: t("other"),
    };
    return map[cat] ?? cat;
  };

  const catColor = (cat: string) => {
    const map: Record<string, string> = {
      filtre_huile: "bg-amber-100 text-amber-700",
      filtre_air: "bg-sky-100 text-sky-700",
      filtre_carburant: "bg-rose-100 text-rose-700",
      filtre_habitacle: "bg-emerald-100 text-emerald-700",
      huile_moteur: "bg-orange-100 text-orange-700",
    };
    return map[cat] ?? "bg-slate-100 text-slate-600";
  };

  // ---------- Recherche par référence ----------
  const [refQuery, setRefQuery] = useState("");
  const [refResults, setRefResults] = useState<RefResult[]>([]);
  const [refLoading, setRefLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // ---------- Registre « j'ai pas » (Bible §4.12) : noter la demande perdue en 1 tap ----------
  const [missedNoted, setMissedNoted] = useState<string | null>(null);
  async function noteMissing() {
    const ref = refQuery.trim().toUpperCase().replace(/\s+/g, "");
    if (!ref) return;
    let failed = false;
    try {
      const { error } = await supabase.from("demandes_manquees").insert({ reference: ref });
      failed = !!error;
    } catch { failed = true; }
    if (failed) {
      // Hors-ligne ou table absente → file locale, resynchronisée au prochain chargement
      const q: { reference: string }[] = JSON.parse(localStorage.getItem("fp_demandes") ?? "[]");
      q.push({ reference: ref });
      localStorage.setItem("fp_demandes", JSON.stringify(q));
    }
    setMissedNoted(ref);
  }
  useEffect(() => {
    // Resynchronise les demandes notées hors-ligne
    (async () => {
      try {
        const q: { reference: string }[] = JSON.parse(localStorage.getItem("fp_demandes") ?? "[]");
        if (!q.length || (typeof navigator !== "undefined" && !navigator.onLine)) return;
        const { error } = await supabase.from("demandes_manquees").insert(q.map(d => ({ reference: d.reference })));
        if (!error) localStorage.removeItem("fp_demandes");
      } catch { /* silencieux */ }
    })();
  }, []);
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  function toggleDetails(id: string) { setOpenDetails(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  // ---------- Ajout rapide d'une référence (depuis cette page) ----------
  const ADD_CATS = ["filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle", "filtre_refroidissement", "huile_moteur", "autre"];
  const ADD_BRANDS = ["Filtron", "Flag", "Filtrex", "Mann", "Wix", "Bosch", "Champion", "Purflux", "Mahle", "Hengst", "UFI", "Fram", "Misfat", "Wunder", "OE", "Castrol", "Pemko", "Fanfaro", "Mannol", "Motul", "Total", "Kansler"];
  const emptyAdd = { reference: "", marque: "Filtron", filtronRef: "", categorie: "filtre_huile", prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 2, code_barre: "" };
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [addSaving, setAddSaving] = useState(false);
  const [addScan, setAddScan] = useState(false);
  function openAdd() { setAddForm({ ...emptyAdd, reference: refQuery.trim().toUpperCase() }); setShowAdd(true); }
  async function saveNew() {
    const ref = addForm.reference.trim();
    if (!ref) { alert("Référence obligatoire."); return; }
    const { filtronRef, ...prod } = addForm;
    const fref = (filtronRef || "").trim();
    setAddSaving(true);

    // Marque ≠ Filtron + réf Filtron renseignée → rattacher comme variante sous le Filtron existant
    if (prod.marque !== "Filtron" && fref) {
      const { data: parents } = await supabase.from("products").select("id, reference").ilike("reference", fref).limit(1);
      const parent = parents?.[0];
      if (parent) {
        const { error } = await supabase.from("equivalences").insert({
          product_id: parent.id, marque: prod.marque, reference: ref,
          prix: prod.prix_vente > 0 ? prod.prix_vente : null,
          prix_achat: prod.prix_achat > 0 ? prod.prix_achat : null,
          stock: prod.stock || 0,
          ...(prod.code_barre?.trim() ? { code_barre: prod.code_barre.trim() } : {}),
        });
        setAddSaving(false);
        if (error) { alert("Erreur : " + error.message); return; }
        setShowAdd(false);
        setRefQuery(parent.reference); searchRef(parent.reference);
        return;
      }
      alert(`Filtron « ${fref} » introuvable — la référence est créée comme fiche indépendante.`);
    }

    // Empêche de créer une fiche en double (même référence, casse/espaces différents)
    const normRef = ref.toUpperCase().replace(/\s+/g, "");
    const loose = "%" + normRef.split("").join("%") + "%";
    const { data: candidates } = await supabase.from("products").select("id, reference").ilike("reference", loose).limit(20);
    const dup = (candidates ?? []).find(c => c.reference.toUpperCase().replace(/\s+/g, "") === normRef);
    if (dup) {
      setAddSaving(false);
      alert(`« ${ref} » existe déjà sous « ${dup.reference} ». Va dans Produits, ouvre cette fiche et ajoute la marque dans « Variantes de marque » au lieu de créer un doublon.`);
      return;
    }

    // Sinon : créer un produit (Filtron, ou marque sans réf Filtron connue)
    const payload = { ...prod, reference: ref, nom_fr: "", nom_ar: "", notes: "", prix_promo: null };
    const { error } = await supabase.from("products").insert(payload);
    setAddSaving(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setShowAdd(false);
    setRefQuery(ref); searchRef(ref);
  }

  async function searchRef(raw: string) {
    const q = raw.trim();
    if (q.length < 2) { setRefResults([]); setSearched(false); return; }
    setRefLoading(true);
    setSearched(true);
    // On enlève les espaces et on cherche le numéro N'IMPORTE OÙ dans la référence,
    // en tolérant les espaces dans la réf stockée (wl 7510 ↔ wl7510).
    // -> permet aussi de taper juste "540" pour trouver OP540, AP540, etc.
    const clean = q.replace(/\s+/g, "");
    const loose = "%" + clean.replace(/[%_]/g, "").split("").join("%") + "%";
    const sel = "*, equivalences(*), applications(*), compatibilites(vehicules(*))";
    const [{ data: direct }, { data: eqMatches }] = await Promise.all([
      supabase.from("products").select(sel).ilike("reference", loose).limit(60),
      supabase.from("equivalences").select("product_id").ilike("reference", loose).limit(60),
    ]);
    let all = [...((direct as unknown as RefResult[]) ?? [])];
    const ids = [...new Set((eqMatches ?? []).map((e: { product_id: string }) => e.product_id))]
      .filter(id => !all.some(p => p.id === id));
    if (ids.length) {
      const { data: viaEq } = await supabase.from("products").select(sel).in("id", ids).limit(60);
      all = [...all, ...((viaEq as unknown as RefResult[]) ?? [])];
    }
    all.sort((a, b) => a.reference.localeCompare(b.reference, undefined, { numeric: true, sensitivity: "base" }));
    setRefResults(all);
    setRefLoading(false);
  }

  // ---------- Recherche par véhicule ----------
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [vin, setVin] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [engineFilter, setEngineFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [selectedVehicule, setSelectedVehicule] = useState<Vehicule | null>(null);
  const [compatibles, setCompatibles] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("vehicules").select("*").order("marque").then(({ data }) => setVehicules(data ?? []));
  }, []);

  const vinDetected = decodeWmi(vin);
  const vinYear = decodeYear(vin);
  useEffect(() => {
    if (vinDetected) {
      setMakeFilter(vinDetected); setModelFilter(""); setEngineFilter(""); setFuelFilter("");
      setYearFilter(vinYear || "");
    }
  }, [vinDetected, vinYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const makes = [...new Set(vehicules.map(v => v.marque))].sort();
  const models = [...new Set(vehicules.filter(v => !makeFilter || v.marque === makeFilter).map(v => v.modele))].sort();
  const filteredByMakeModel = vehicules.filter(v => (!makeFilter || v.marque === makeFilter) && (!modelFilter || v.modele === modelFilter));
  const years = [...new Set(filteredByMakeModel.flatMap(v => {
    const arr: number[] = [];
    for (let y = v.annee_debut; y <= (v.annee_fin ?? 2026); y++) arr.push(y);
    return arr;
  }))].sort((a, b) => b - a);
  const filteredByYear = filteredByMakeModel.filter(v => !yearFilter || (v.annee_debut <= +yearFilter && (!v.annee_fin || v.annee_fin >= +yearFilter)));
  const engines = [...new Set(filteredByYear.map(v => v.motorisation))].sort();
  const matchingVehicules = filteredByYear.filter(v => (!engineFilter || v.motorisation === engineFilter) && (!fuelFilter || v.carburant === fuelFilter));

  async function searchCompatibles() {
    if (matchingVehicules.length === 0) return;
    setLoading(true);
    const { data } = await supabase.from("compatibilites").select("product_id, products(*)").in("vehicule_id", matchingVehicules.map(v => v.id));
    const unique: Record<string, Product> = {};
    (data ?? []).forEach((row: { product_id: string; products: unknown }) => {
      if (row.products && !unique[row.product_id]) unique[row.product_id] = row.products as Product;
    });
    setCompatibles(Object.values(unique));
    setSelectedVehicule(matchingVehicules[0] ?? null);
    setLoading(false);
  }

  return (
    <div>
      <Header title="vehicleSearch" />

      {/* Onglets */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("ref")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "ref" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
          <Tag size={16} /> {t("tabByRef")}
        </button>
        <button onClick={() => setTab("smart")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "smart" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
          <Sparkles size={16} /> Recherche rapide
        </button>
        <button onClick={() => setTab("vehicule")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "vehicule" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
          <Car size={16} /> {t("tabByVehicle")}
        </button>
      </div>

      {/* ============ ONGLET RÉFÉRENCE ============ */}
      {tab === "ref" && (
        <>
          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Tag size={18} /> {t("refSearchTitle")}
              </h3>
              <button onClick={openAdd} className="btn-secondary flex items-center gap-1.5 text-sm shrink-0">
                <Plus size={15} /> Ajouter une référence
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  className="input ps-10 text-lg font-mono uppercase"
                  placeholder="Tape ou dis juste le numéro (ex : 540, 82, 1175…)"
                  value={refQuery}
                  onChange={e => { const v = e.target.value.toUpperCase(); setRefQuery(v); searchRef(v); }}
                />
              </div>
              <VoiceButton className="w-12 rounded-lg" onResult={(txt) => { const v = txt.replace(/\s+/g, "").toUpperCase(); setRefQuery(v); searchRef(v); }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">Pas besoin de dire « OP » ou « AP » — juste le numéro, et choisis dans la liste.</p>
          </div>

          {refLoading && <p className="text-center text-slate-400 py-6">{t("loading")}</p>}

          {!refLoading && searched && refResults.length === 0 && (
            <div className="card p-10 text-center text-slate-400">
              <Search size={40} className="mx-auto mb-3 opacity-20" />
              <p className="mb-4">{t("noRefFound")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={openAdd} className="btn-primary inline-flex items-center gap-1.5">
                  <Plus size={16} /> Ajouter « {refQuery.trim().toUpperCase()} »
                </button>
                {/* Bible §4.12 : le client demande, je n'ai pas → noter la demande (1 tap) */}
                {missedNoted === refQuery.trim().toUpperCase().replace(/\s+/g, "") ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm font-medium">✓ Demande notée</span>
                ) : (
                  <button onClick={noteMissing} className="btn-secondary inline-flex items-center gap-1.5">
                    ❌ J&apos;ai pas (noter la demande)
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3">« Noter la demande » = à la 3ᵉ demande, l&apos;app te dira de la stocker (Réappro → Demandé).</p>
            </div>
          )}

          <div className="space-y-3">
            {refResults.map(p => {
              const vehs = (p.compatibilites ?? []).map(c => c.vehicules).filter(Boolean) as Vehicule[];
              const apps = p.applications ?? [];
              const appPreview = distinctByMarque(apps, 2);
              const vehPreview = distinctByMarque(vehs, 2);
              // Références que TU as enregistrées (avec un prix), pas les OE auto
              const regEquivs = (p.equivalences ?? []).filter(e => (e.prix ?? null) !== null);
              return (
                <div key={p.id} className="card p-4 flex gap-4">
                  <FilterImage reference={p.reference} categorie={p.categorie} imageUrl={p.image_url} wid={200} className="h-20 w-20 rounded-lg object-contain bg-white shrink-0 self-start border border-slate-700/60 p-1" />
                  <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded ${catColor(p.categorie)}`}><CategoryIcon categorie={p.categorie} size={14} /> {categoryLabel(p.categorie)}</span>
                      <div className="text-xl font-bold font-mono text-slate-800 mt-1">{p.reference}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{p.prix_vente} MAD</div>
                      <div className="mt-1.5 flex justify-end"><StockBadge stock={p.stock} stockMin={p.stock_min} /></div>
                    </div>
                  </div>

                  {(p.dimensions || apps.length > 0 || vehs.length > 0) && (
                    <button onClick={() => toggleDetails(p.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-400">
                      {openDetails.has(p.id)
                        ? <>Masquer les détails <ChevronUp size={14} /></>
                        : <>Dimensions & véhicules{apps.length > 0 ? ` (${apps.length})` : vehs.length > 0 ? ` (${vehs.length})` : ""} <ChevronDown size={14} /></>}
                    </button>
                  )}

                  {openDetails.has(p.id) && p.dimensions && <div className="text-xs text-slate-500 mt-2">📐 {p.dimensions}</div>}

                  {openDetails.has(p.id) && (apps.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5"><Car size={13} /> {t("vehiclesFit")} <span className="text-slate-300 font-normal">({apps.length})</span></div>
                      <CollapsibleTags
                        items={apps.map((a) => (
                          <span key={a.id} className="shrink-0 whitespace-nowrap text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            <strong>{a.marque}</strong> {a.modele}{a.moteur ? ` · ${a.moteur}` : ""}
                            {a.annee_debut ? ` · ${a.annee_debut}${a.annee_fin ? `→${a.annee_fin}` : ""}` : ""}
                          </span>
                        ))}
                        previewItems={appPreview.map((a) => (
                          <span key={a.id} className="shrink-0 whitespace-nowrap text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            <strong>{a.marque}</strong> {a.modele}{a.moteur ? ` · ${a.moteur}` : ""}
                            {a.annee_debut ? ` · ${a.annee_debut}${a.annee_fin ? `→${a.annee_fin}` : ""}` : ""}
                          </span>
                        ))}
                      />
                    </div>
                  ) : vehs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5"><Car size={13} /> {t("vehiclesFit")} <span className="text-slate-300 font-normal">({vehs.length})</span></div>
                      <CollapsibleTags
                        items={vehs.map((v, i) => (
                          <span key={i} className="shrink-0 whitespace-nowrap text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {v.marque} {v.modele} · {v.motorisation}
                          </span>
                        ))}
                        previewItems={vehPreview.map((v, i) => (
                          <span key={i} className="shrink-0 whitespace-nowrap text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {v.marque} {v.modele} · {v.motorisation}
                          </span>
                        ))}
                      />
                    </div>
                  ))}

                  {regEquivs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2"><Repeat size={13} /> {t("equivalents")}</div>
                      <div className="space-y-1.5">
                        {regEquivs.map(e => (
                          <div key={e.id} className="flex items-center justify-between gap-3 bg-[var(--surface-2)] rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <span className="font-mono text-xl font-bold text-slate-100">{e.reference}</span>
                              <span className="ms-2 text-xs text-indigo-300">{e.marque}</span>
                            </div>
                            <div className="text-right shrink-0">
                              {e.prix ? <div className="text-sm font-bold text-blue-400">{e.prix} MAD</div> : null}
                              <div className="mt-1 flex justify-end"><StockBadge stock={e.stock ?? 0} stockMin={0} /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ============ ONGLET RECHERCHE RAPIDE ============ */}
      {tab === "smart" && (
        <>
          <div className="card p-5 mb-4">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Sparkles size={18} /> Trouvez le filtre par véhicule</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input autoFocus className="input ps-10 text-lg"
                  placeholder="Ex : Clio 1.5 dci · Logan · Golf 1.9 tdi…"
                  value={smartQ}
                  onChange={e => setSmartQ(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") smartSearch(smartQ); }} />
              </div>
              <VoiceButton className="w-12 rounded-lg" onResult={(txt) => { setSmartQ(txt); smartSearch(txt); }} />
              <button onClick={() => smartSearch(smartQ)} className="btn-primary px-5">OK</button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Tape ou dicte une marque / modèle / moteur. Recherche dans les vraies applications Filtron.</p>
          </div>

          {smartLoading && <p className="text-center text-slate-400 py-6">{t("loading")}</p>}
          {!smartLoading && smartDone && smartRes.length === 0 && (
            <div className="card p-10 text-center text-slate-400"><Car size={40} className="mx-auto mb-3 opacity-20" /><p>{t("noCompatible")}</p></div>
          )}
          <div className="space-y-3">
            {smartRes.map(({ product: p, app: a }) => (
              <div key={p.id} className="card p-4 flex gap-4">
                <FilterImage reference={p.reference} categorie={p.categorie} imageUrl={p.image_url} wid={200} className="h-20 w-20 rounded-lg object-contain bg-white shrink-0 self-start border border-slate-700/60 p-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded ${catColor(p.categorie)}`}><CategoryIcon categorie={p.categorie} size={14} /> {categoryLabel(p.categorie)}</span>
                      <div className="text-xl font-bold font-mono text-slate-800 mt-1">{p.reference}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{p.prix_vente} MAD</div>
                      <div className="mt-1.5 flex justify-end"><StockBadge stock={p.stock} stockMin={p.stock_min} /></div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5 px-2 py-1 rounded">
                    <Car size={13} /> {a.marque} {a.modele}{a.moteur ? ` · ${a.moteur}` : ""}{a.annee_debut ? ` · ${a.annee_debut}${a.annee_fin ? `→${a.annee_fin}` : ""}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============ ONGLET VÉHICULE ============ */}
      {tab === "vehicule" && (
        <>
          <div className="card p-5 mb-4">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Car size={18} /> {t("searchByVin")}</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input ps-9 font-mono uppercase" placeholder={t("vinPlaceholder")} value={vin} maxLength={17} onChange={e => setVin(e.target.value.toUpperCase())} />
            </div>
            {vinDetected && (
              <p className="mt-2 text-sm text-green-400 bg-green-500/10 px-3 py-1.5 rounded-md inline-flex items-center gap-2">
                <Car size={14} /> <strong>{t("vinDetected")} :</strong> {vinDetected}{vinYear ? ` · ${vinYear}` : ""}
                <span className="text-slate-400 text-xs">— choisissez le modèle</span>
              </p>
            )}
          </div>

          <div className="card p-5 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("make")}</label>
                <select className="input" value={makeFilter} onChange={e => { setMakeFilter(e.target.value); setModelFilter(""); setEngineFilter(""); setFuelFilter(""); setYearFilter(""); }}>
                  <option value="">{t("allMakes")}</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("model")}</label>
                <select className="input" value={modelFilter} onChange={e => { setModelFilter(e.target.value); setEngineFilter(""); setFuelFilter(""); setYearFilter(""); }}>
                  <option value="">{t("allModels")}</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("year")}</label>
                <select className="input" value={yearFilter} onChange={e => { setYearFilter(e.target.value); setEngineFilter(""); }}>
                  <option value="">{t("allYears")}</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("engine")}</label>
                <select className="input" value={engineFilter} onChange={e => setEngineFilter(e.target.value)}>
                  <option value="">{t("allEngines")}</option>
                  {engines.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("fuel")}</label>
                <select className="input" value={fuelFilter} onChange={e => setFuelFilter(e.target.value)}>
                  <option value="">{t("allFuels")}</option>
                  <option value="diesel">{t("diesel")}</option>
                  <option value="essence">{t("essence")}</option>
                  <option value="hybride">{t("hybride")}</option>
                </select>
              </div>
            </div>

            {matchingVehicules.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2 mb-3">
                <span className="text-sm text-blue-700">
                  <strong>{matchingVehicules.length}</strong> véhicule{matchingVehicules.length > 1 ? "s" : ""}
                  {makeFilter && ` — ${makeFilter}${modelFilter ? ` ${modelFilter}` : ""}${yearFilter ? ` (${yearFilter})` : ""}${engineFilter ? ` ${engineFilter}` : ""}`}
                </span>
              </div>
            )}

            <button onClick={searchCompatibles} disabled={matchingVehicules.length === 0 || loading} className="btn-primary flex items-center gap-2 disabled:opacity-40">
              <Package size={16} /> {loading ? t("loading") : t("compatibleProducts")}
            </button>
          </div>

          {selectedVehicule !== null && (
            <div className="card overflow-x-auto">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Car size={16} className="text-blue-600" />
                <span className="font-semibold text-slate-700">{t("compatibleProducts")}</span>
                <span className="text-slate-400 text-sm">— {compatibles.length}</span>
              </div>
              {compatibles.length === 0 ? (
                <p className="text-center text-slate-400 py-10">{t("noCompatible")}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{[t("reference"), t("category"), t("sellPrice"), t("stock")].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compatibles.map(p => (
                      <tr key={p.id} className={p.stock <= p.stock_min ? "bg-red-50" : "hover:bg-slate-50"}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.reference}</td>
                        <td className="px-4 py-3 text-slate-600">{categoryLabel(p.categorie)}</td>
                        <td className="px-4 py-3 font-medium text-blue-600">{p.prix_vente} MAD</td>
                        <td className="px-4 py-3"><span className={`font-semibold ${p.stock <= p.stock_min ? "text-red-600" : "text-green-600"}`}>{p.stock}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ====== Modal : ajouter une référence ====== */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Plus size={18} /> Ajouter une référence</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">{t("reference")} *</label>
                <input autoFocus className="input font-mono uppercase" value={addForm.reference} onChange={e => setAddForm({ ...addForm, reference: e.target.value.toUpperCase() })} /></div>
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Marque</label>
                <select className="input" value={addForm.marque} onChange={e => setAddForm({ ...addForm, marque: e.target.value })}>
                  {ADD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select></div>
              {addForm.marque !== "Filtron" && (
                <div className="col-span-2"><label className="text-xs text-amber-400 mb-1 block">Référence Filtron équivalente <span className="text-slate-500 font-normal">(pour rattacher sous le Filtron)</span></label>
                  <input className="input font-mono uppercase" placeholder="ex : OE667/6 — laisse vide si aucune" value={addForm.filtronRef} onChange={e => setAddForm({ ...addForm, filtronRef: e.target.value.toUpperCase() })} /></div>
              )}
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">{t("category")}</label>
                <select className="input" value={addForm.categorie} onChange={e => setAddForm({ ...addForm, categorie: e.target.value })}>
                  {ADD_CATS.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("buyPrice")} (MAD)</label>
                <input type="number" className="input" value={addForm.prix_achat || ""} placeholder="0" onChange={e => setAddForm({ ...addForm, prix_achat: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("sellPrice")} (MAD)</label>
                <input type="number" className="input" value={addForm.prix_vente || ""} placeholder="0" onChange={e => setAddForm({ ...addForm, prix_vente: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("stock")}</label>
                <input type="number" className="input" value={addForm.stock || ""} placeholder="0" onChange={e => setAddForm({ ...addForm, stock: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Stock min</label>
                <input type="number" className="input" value={addForm.stock_min} onChange={e => setAddForm({ ...addForm, stock_min: +e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Code-barres <span className="text-slate-500 font-normal">(de cette boîte)</span></label>
                <div className="flex gap-2">
                  <input className="input font-mono flex-1" placeholder="scanne ou tape le code" value={addForm.code_barre} onChange={e => setAddForm({ ...addForm, code_barre: e.target.value })} />
                  <button type="button" onClick={() => setAddScan(true)} className="btn-secondary shrink-0 flex items-center gap-1.5"><Barcode size={16} /> Scanner</button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Pour ajouter les marques équivalentes (prix/stock par marque), édite ensuite la fiche dans Produits.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={saveNew} disabled={addSaving} className="btn-primary disabled:opacity-50">{addSaving ? "…" : t("save")}</button>
            </div>
          </div>
        </div>
      )}

      {addScan && <BarcodeScanner onScan={(c) => { setAddForm(f => ({ ...f, code_barre: c.trim() })); setAddScan(false); }} onClose={() => setAddScan(false)} />}
    </div>
  );
}
