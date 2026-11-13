"use client";
// Catalogue par constructeur (BIBLE §8.13) : marque → modèle → moteur → filtres, comme partslink24,
// mais avec NOS données (114 000 applications Filtron). Aucun schéma ni donnée de partslink24 / partsouq.
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MARQUES_COURANTES, AUTRES_MARQUES, type MarqueVin } from "@/lib/vin";
import { COLS, grouper, annees, decouperModele, rangerParType, type Ligne, type Voiture } from "@/lib/voitures";
import VoitureCarte from "@/components/VoitureCarte";
import { ChevronRight, ChevronDown, Factory, Search } from "lucide-react";

type Modele = { marque: string; modele: string; nom: string; periode: string };
type Groupe = { marque: string; modeles: Modele[] };

const PAGE = 1000; // Supabase rend 1000 lignes maximum par requête

const propre = (s: string) => s.replace(/\s+/g, " ").trim();

// Tous les modèles d'une marque : on compte les lignes, puis on lit les pages en parallèle (Mercedes ≈ 14 500 lignes).
async function chargerModeles(motif: string): Promise<Groupe[]> {
  const { count, error } = await supabase.from("applications").select("modele", { count: "exact", head: true }).ilike("marque", motif);
  if (error) throw error;
  const pages = await Promise.all(
    Array.from({ length: Math.ceil((count ?? 0) / PAGE) }, (_, i) =>
      supabase.from("applications").select("marque, modele").ilike("marque", motif).range(i * PAGE, i * PAGE + PAGE - 1)),
  );
  const parMarque = new Map<string, Map<string, Modele>>();
  const lignes = new Map<string, number>();
  for (const p of pages) {
    if (p.error) throw p.error;
    for (const r of (p.data ?? []) as { marque: string; modele: string }[]) {
      lignes.set(r.marque, (lignes.get(r.marque) ?? 0) + 1);
      let m = parMarque.get(r.marque);
      if (!m) { m = new Map(); parMarque.set(r.marque, m); }
      if (!m.has(r.modele)) {
        const { nom, periode } = decouperModele(r.modele);
        m.set(r.modele, { marque: r.marque, modele: r.modele, nom: propre(nom), periode });
      }
    }
  }
  // La marque principale d'abord (ex. « VW (VOLKSWAGEN) »), puis les autres (« VW MARINE »…)
  return [...parMarque.entries()]
    .sort((a, b) => (lignes.get(b[0]) ?? 0) - (lignes.get(a[0]) ?? 0))
    .map(([marque, m]) => ({
      marque,
      modeles: [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" })),
    }));
}

// Toutes les motorisations d'un modèle, avec leurs filtres
async function chargerMoteurs(m: Modele): Promise<Voiture[]> {
  const rows: Ligne[] = [];
  for (let i = 0; ; i += PAGE) {
    const { data, error } = await supabase.from("applications").select(COLS).eq("marque", m.marque).eq("modele", m.modele).range(i, i + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Ligne[]));
    if (!data || data.length < PAGE) break;
  }
  return grouper(rows);
}

export default function CatalogueMarques() {
  const [marque, setMarque] = useState<MarqueVin | null>(null);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [modele, setModele] = useState<Modele | null>(null);
  const [moteurs, setMoteurs] = useState<Voiture[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const cacheModeles = useRef(new Map<string, Groupe[]>());
  const cacheMoteurs = useRef(new Map<string, Voiture[]>());

  async function choisirMarque(m: MarqueVin) {
    setMarque(m); setModele(null); setMoteurs([]); setOuvert(null); setFiltre(""); setErreur(null);
    const deja = cacheModeles.current.get(m.motif);
    if (deja) { setGroupes(deja); return; }
    setGroupes([]); setChargement(true);
    try {
      const g = await chargerModeles(m.motif);
      cacheModeles.current.set(m.motif, g);
      setGroupes(g);
    } catch {
      setErreur("Impossible de charger les modèles. Vérifie la connexion et réessaie.");
    }
    setChargement(false);
  }

  async function choisirModele(m: Modele) {
    setModele(m); setOuvert(null); setErreur(null);
    const cle = `${m.marque}|${m.modele}`;
    const deja = cacheMoteurs.current.get(cle);
    if (deja) { setMoteurs(deja); if (deja.length === 1) setOuvert(deja[0].cle); return; }
    setMoteurs([]); setChargement(true);
    try {
      const vs = await chargerMoteurs(m);
      cacheMoteurs.current.set(cle, vs);
      setMoteurs(vs);
      if (vs.length === 1) setOuvert(vs[0].cle);
    } catch {
      setErreur("Impossible de charger les moteurs. Vérifie la connexion et réessaie.");
    }
    setChargement(false);
  }

  function retour(niveau: "marques" | "modeles") {
    setErreur(null); setOuvert(null);
    if (niveau === "marques") { setMarque(null); setGroupes([]); setModele(null); setMoteurs([]); setFiltre(""); }
    else { setModele(null); setMoteurs([]); }
  }

  const f = filtre.trim().toLowerCase();
  const groupesVus = groupes
    .map((g) => ({ ...g, modeles: f ? g.modeles.filter((m) => m.nom.toLowerCase().includes(f)) : g.modeles }))
    .filter((g) => g.modeles.length > 0);
  const nbModeles = groupes.reduce((n, g) => n + g.modeles.length, 0);
  const typesMoteur = rangerParType(moteurs);

  const puce = "px-3 py-1.5 rounded-lg text-sm border border-slate-600 text-slate-200 hover:border-blue-500 hover:bg-blue-600/10 transition-colors";

  return (
    <div className="card p-5 mb-4">
      <h3 className="font-semibold text-slate-700 mb-1 flex items-center gap-2"><Factory size={18} /> Catalogue par marque</h3>
      <p className="text-xs text-slate-400 mb-3">Choisis la marque, puis le modèle, puis le moteur : les filtres exacts s&apos;affichent avec le prix et le stock.</p>

      {/* Fil d'Ariane : Marques › Dacia › Logan II / MCV II */}
      {marque && (
        <nav aria-label="Étapes" className="flex flex-wrap items-center gap-1 text-sm mb-3">
          <button className="text-blue-400 hover:underline" onClick={() => retour("marques")}>Marques</button>
          <ChevronRight size={14} className="text-slate-500" />
          {modele
            ? <button className="text-blue-400 hover:underline" onClick={() => retour("modeles")}>{marque.nom}</button>
            : <span className="font-semibold">{marque.nom}</span>}
          {modele && (<>
            <ChevronRight size={14} className="text-slate-500" />
            <span className="font-semibold">{modele.nom}</span>
            {modele.periode && <span className="text-slate-400">({modele.periode})</span>}
          </>)}
        </nav>
      )}

      {erreur && <p className="text-sm px-3 py-2 rounded-lg bg-red-500/15 text-red-300 mb-3">{erreur}</p>}

      {/* 1. Les marques */}
      {!marque && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {MARQUES_COURANTES.map((m) => (
              <button key={m.nom} className={`${puce} font-semibold`} onClick={() => choisirMarque(m)}>{m.nom}</button>
            ))}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Autres marques</p>
            <div className="flex flex-wrap gap-1.5">
              {AUTRES_MARQUES.map((m) => (
                <button key={m.nom} className={puce} onClick={() => choisirMarque(m)}>{m.nom}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {chargement && <p className="text-sm text-slate-400">Chargement…</p>}

      {/* 2. Les modèles de la marque */}
      {marque && !modele && !chargement && groupes.length > 0 && (
        <>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <label htmlFor="filtre-modele" className="sr-only">Chercher un modèle</label>
            <input id="filtre-modele" className="input ps-9" autoComplete="off" placeholder={`Chercher parmi les ${nbModeles} modèles ${marque.nom} (ex. Logan, Clio, 208…)`}
              value={filtre} onChange={(e) => setFiltre(e.target.value)} />
          </div>
          <div className="space-y-4">
            {groupesVus.map((g) => (
              <div key={g.marque}>
                {groupes.length > 1 && <p className="text-xs uppercase tracking-wide text-slate-400 mb-1.5">{g.marque}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {g.modeles.map((m) => (
                    <button key={m.modele} onClick={() => choisirModele(m)}
                      className="flex items-baseline justify-between gap-2 text-start px-3 py-2 rounded-lg bg-slate-800/40 hover:bg-blue-600/15 transition-colors">
                      <span className="min-w-0 truncate">{m.nom}</span>
                      {m.periode && <span className="text-xs text-slate-400 shrink-0">{m.periode}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groupesVus.length === 0 && <p className="text-sm text-slate-400">Aucun modèle ne contient « {filtre} ».</p>}
          </div>
        </>
      )}
      {marque && !modele && !chargement && !erreur && groupes.length === 0 && (
        <p className="text-sm text-slate-400">Aucun modèle {marque.nom} dans les données Filtron.</p>
      )}

      {/* 3. Les moteurs du modèle → 4. leurs filtres */}
      {modele && !chargement && moteurs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">{moteurs.length} moteur{moteurs.length > 1 ? "s" : ""}, rangés par type puis du plus ancien au plus récent : choisis celui de la voiture (code moteur sur le moteur ou la carte grise).</p>
          {typesMoteur.map((t) => (
            <div key={t.cle} className="space-y-2">
              {typesMoteur.length > 1 && (
                <p className="pt-2 text-xs uppercase tracking-wide text-slate-400">
                  {t.cyl ? `Moteur ${t.cyl}` : "Autres moteurs"}
                  {t.base && <span className="ms-2 font-mono normal-case text-amber-300/80">{t.base}</span>}
                </p>
              )}
          {t.voitures.map((v) => {
            const enStock = v.filtres.filter((x) => x.stock > 0).length;
            const estOuvert = ouvert === v.cle;
            return (
              <div key={v.cle}>
                <button onClick={() => setOuvert(estOuvert ? null : v.cle)} aria-expanded={estOuvert}
                  className={`w-full flex items-center gap-3 text-start px-3 py-2.5 rounded-lg border transition-colors ${estOuvert ? "border-blue-500 bg-blue-600/10" : "border-slate-700/60 hover:border-slate-500"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {v.moteur || "Moteur non précisé"}
                      {v.code_moteur && <span className="ms-2 font-mono text-sm text-amber-300">{v.code_moteur}</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {[v.puissance && `${v.puissance} ch`, annees(v)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-end text-xs shrink-0">
                    <div>{v.filtres.length} filtre{v.filtres.length > 1 ? "s" : ""}</div>
                    <div className={enStock ? "text-green-400" : "text-slate-500"}>{enStock} en stock</div>
                  </div>
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${estOuvert ? "rotate-180" : ""}`} />
                </button>
                {estOuvert && <div className="mt-2"><VoitureCarte v={v} /></div>}
              </div>
            );
          })}
            </div>
          ))}
        </div>
      )}
      {modele && !chargement && !erreur && moteurs.length === 0 && (
        <p className="text-sm text-slate-400">Aucun moteur trouvé pour ce modèle.</p>
      )}
    </div>
  );
}
