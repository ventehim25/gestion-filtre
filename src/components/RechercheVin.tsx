"use client";
// Bloc « VIN ou code moteur » (docs/VIN_ANALYSE.md, étape 1) — inspiré de partslink24 sans copier ses données.
// - Code moteur (lu sur le moteur, ex. « K9K 612 ») → voitures + leurs filtres, directement (données Filtron).
// - VIN déjà confirmé (table vin_connus) → 🟢 les filtres s'affichent sans rien choisir.
// - VIN de la même famille qu'un VIN confirmé (8 premiers caractères) → 🟠 proposition à confirmer.
// - VIN inconnu → 🔴 on connaît la marque, le vendeur tape le code moteur ou le modèle, puis « C'est cette voiture »
//   retient le VIN pour la prochaine fois. Le VIN seul ne donne JAMAIS le moteur : on ne devine pas.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { VinConnu } from "@/types/database";
import { nettoyerVin, vinValide, constructeur, anneeProbable, familleVin, ressembleCodeMoteur, motifsCodeMoteur, MARQUES_COURANTES, AUTRES_MARQUES, type MarqueVin } from "@/lib/vin";
import { COLS, grouper, type Ligne, type Voiture } from "@/lib/voitures";
import VoitureCarte from "@/components/VoitureCarte";
import { Search, ScanLine } from "lucide-react";

type Niveau = "vert" | "orange" | "rouge" | null;
const MAX_VOITURES = 30;

type Resultat = { voitures: Voiture[]; note: string | null };

async function parCode(motifs: string[], motifMarque?: string): Promise<Voiture[]> {
  let q = supabase.from("applications").select(COLS).or(motifs.map((m) => `code_moteur.ilike.${m}`).join(","));
  if (motifMarque) q = q.ilike("marque", motifMarque);
  const { data } = await q.limit(600);
  return grouper((data ?? []) as unknown as Ligne[]);
}

// Code moteur d'abord (le plus précis), sinon modèle / motorisation (tous les mots doivent correspondre).
// Les codes Filtron sont écrits de plusieurs façons (« K9K », « K9K 872 », « K9K700 », « K9K-722 », « K9K 790/792 ») :
// si la variante exacte n'existe pas, on montre le moteur de base (« K9K ») avec un avertissement à vérifier.
async function chercherVoitures(texte: string, motifMarque?: string): Promise<Resultat> {
  const t = texte.trim();
  if (t.length < 2) return { voitures: [], note: null };
  if (ressembleCodeMoteur(t)) {
    const exact = await parCode(motifsCodeMoteur(t), motifMarque);
    if (exact.length) return { voitures: exact, note: null };
    const compact = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const base = compact.slice(0, 3);
    if (compact.length > 3 && /[A-Z]/.test(base) && /\d/.test(base)) {
      const vs = await parCode([`%${base}%`], motifMarque);
      if (vs.length) return { voitures: vs, note: `🟠 La variante « ${t.toUpperCase()} » n'est pas listée dans les données Filtron : voici les voitures avec le moteur ${base}. Vérifie le modèle et l'année avant de vendre.` };
    }
  }
  const toks = t.split(/\s+/).map((s) => s.replace(/[^a-z0-9./]/gi, "")).filter((s) => s.length >= 2);
  if (!toks.length) return { voitures: [], note: null };
  const main = [...toks].sort((a, b) => b.length - a.length)[0];
  let q = supabase.from("applications").select(COLS).or(`modele.ilike.%${main}%,moteur.ilike.%${main}%,code_moteur.ilike.%${main}%`);
  if (motifMarque) q = q.ilike("marque", motifMarque);
  const { data } = await q.limit(800);
  const rows = ((data ?? []) as unknown as Ligne[]).filter((a) => {
    const hay = `${a.marque} ${a.modele} ${a.moteur ?? ""} ${a.code_moteur ?? ""}`.toLowerCase();
    return toks.every((tk) => hay.includes(tk.toLowerCase()));
  });
  return { voitures: grouper(rows), note: null };
}

// La voiture exacte enregistrée pour un VIN confirmé, avec ses filtres
async function voitureDe(vc: VinConnu): Promise<Voiture> {
  let q = supabase.from("applications").select(COLS).eq("marque", vc.marque).eq("modele", vc.modele);
  q = vc.moteur ? q.eq("moteur", vc.moteur) : q.is("moteur", null);
  q = vc.code_moteur ? q.eq("code_moteur", vc.code_moteur) : q.is("code_moteur", null);
  const { data } = await q.limit(200);
  const g = grouper((data ?? []) as unknown as Ligne[]);
  return g[0] ?? { cle: vc.vin, marque: vc.marque, modele: vc.modele, moteur: vc.moteur, code_moteur: vc.code_moteur, annee_debut: vc.annee_debut, annee_fin: vc.annee_fin, puissance: vc.puissance, filtres: [] };
}

export default function RechercheVin() {
  const [q, setQ] = useState("");
  const [precision, setPrecision] = useState("");
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [niveau, setNiveau] = useState<Niveau>(null);
  const [confirme, setConfirme] = useState<VinConnu | null>(null);
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Marque choisie à la main (comme partslink24) : facultative, elle passe avant la marque lue dans le VIN
  const [marqueManuelle, setMarqueManuelle] = useState<MarqueVin | null>(null);

  const net = nettoyerVin(q);
  const estVin = vinValide(net);
  const vinEnCours = !estVin && net.length >= 9 && net.length < 17 && /^[A-HJ-NPR-Z0-9]+$/.test(net) && !ressembleCodeMoteur(q);
  const marqueVin = estVin ? constructeur(net) : null;
  const marque = marqueManuelle ?? marqueVin;
  const annee = estVin ? anneeProbable(net) : null;

  // Saisie principale : VIN ou code moteur / modèle
  useEffect(() => {
    setMessage(null); setNote(null);
    const t = q.trim();
    if (!estVin && t.length < 3) { setVoitures([]); setNiveau(null); setConfirme(null); return; }
    if (vinEnCours) { setVoitures([]); setNiveau(null); setConfirme(null); return; }
    let actif = true;
    const id = setTimeout(async () => {
      setChargement(true);
      try {
        if (estVin) {
          setPrecision("");
          const { data: exact } = await supabase.from("vin_connus").select("*").eq("vin", net).maybeSingle();
          if (!actif) return;
          if (exact) {
            const v = await voitureDe(exact as VinConnu);
            if (!actif) return;
            setConfirme(exact as VinConnu); setNiveau("vert"); setVoitures([v]);
            return;
          }
          setConfirme(null);
          const { data: fam } = await supabase.from("vin_connus").select("*").eq("famille", familleVin(net)).limit(20);
          if (!actif) return;
          const distincts = new Map<string, VinConnu>();
          for (const r of (fam ?? []) as VinConnu[]) distincts.set([r.marque, r.modele, r.moteur ?? "", r.code_moteur ?? ""].join("|"), r);
          if (distincts.size) {
            const vs = await Promise.all([...distincts.values()].slice(0, 5).map(voitureDe));
            if (!actif) return;
            setNiveau("orange"); setVoitures(vs);
          } else {
            setNiveau("rouge"); setVoitures([]);
          }
        } else {
          setNiveau(null); setConfirme(null);
          const r = await chercherVoitures(t, marqueManuelle?.motif);
          if (actif) { setVoitures(r.voitures); setNote(r.note); }
        }
      } finally {
        if (actif) setChargement(false);
      }
    }, 350);
    return () => { actif = false; clearTimeout(id); };
  }, [q, estVin, vinEnCours, net, marqueManuelle]);

  // VIN inconnu (ou probable) : le vendeur précise avec le code moteur ou le modèle
  useEffect(() => {
    if (!estVin || niveau === "vert") return;
    const t = precision.trim();
    if (t.length < 2) return;
    let actif = true;
    const id = setTimeout(async () => {
      setChargement(true);
      const r = await chercherVoitures(t, marque?.motif);
      if (actif) { setVoitures(r.voitures); setNote(r.note); setNiveau("rouge"); setChargement(false); }
    }, 350);
    return () => { actif = false; clearTimeout(id); };
  }, [precision, estVin, niveau, marque?.motif]);

  async function retenir(v: Voiture) {
    const ligne = { vin: net, marque: v.marque, modele: v.modele, moteur: v.moteur, code_moteur: v.code_moteur, annee_debut: v.annee_debut, annee_fin: v.annee_fin, puissance: v.puissance };
    const { data, error } = await supabase.from("vin_connus").upsert(ligne).select().maybeSingle();
    if (error) {
      setMessage(/vin_connus|schema cache|Could not find/i.test(error.message) ? "⚠️ La mémoire des VIN n'est pas encore installée (supabase/vin_connus.sql)." : `⚠️ ${error.message}`);
      return;
    }
    setConfirme((data as VinConnu) ?? null); setNiveau("vert"); setVoitures([v]); setPrecision("");
    setMessage("✅ VIN retenu : la prochaine fois, ses filtres s'afficheront directement.");
  }

  async function oublier() {
    await supabase.from("vin_connus").delete().eq("vin", net);
    setConfirme(null); setNiveau("rouge"); setVoitures([]);
    setMessage("VIN oublié. Choisis la bonne voiture ci-dessous.");
  }

  const pastille: Record<Exclude<Niveau, null>, { classe: string; texte: string }> = {
    vert: { classe: "bg-green-500/15 text-green-400", texte: "🟢 Confirmé : ce VIN a déjà été vendu pour cette voiture." },
    orange: { classe: "bg-amber-500/15 text-amber-300", texte: "🟠 Probable : même début de VIN qu'une voiture déjà confirmée. Vérifie le moteur, puis confirme." },
    rouge: { classe: "bg-red-500/15 text-red-300", texte: "🔴 Moteur pas encore connu pour ce VIN : tape le code moteur (sur le moteur) ou le modèle." },
  };

  return (
    <div className="card p-5 mb-4">
      <h3 className="font-semibold text-slate-700 mb-1 flex items-center gap-2"><ScanLine size={18} /> VIN ou code moteur</h3>
      <p className="text-xs text-slate-400 mb-3">Le code moteur (sur le moteur, ex. « K9K 612 ») donne les filtres exacts. Un VIN confirmé une fois est reconnu ensuite tout seul.</p>

      {/* 1. La marque (facultatif, comme partslink24) — reconnue toute seule si le VIN est connu */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3" role="group" aria-label="Marque">
        <span className="text-xs text-slate-400 me-1">Marque :</span>
        <button type="button" onClick={() => setMarqueManuelle(null)}
          className={`px-2.5 py-1 rounded-full text-xs border ${!marqueManuelle ? "bg-blue-600 border-blue-600 text-white" : "border-slate-600 text-slate-300"}`}>
          {marqueVin && !marqueManuelle ? `Auto : ${marqueVin.nom}` : "Toutes"}
        </button>
        {MARQUES_COURANTES.map((m) => (
          <button key={m.nom} type="button" onClick={() => setMarqueManuelle(marqueManuelle?.nom === m.nom ? null : m)}
            className={`px-2.5 py-1 rounded-full text-xs border ${marqueManuelle?.nom === m.nom ? "bg-blue-600 border-blue-600 text-white" : "border-slate-600 text-slate-300"}`}>
            {m.nom}
          </button>
        ))}
        <select aria-label="Autres marques" className="text-xs rounded-full border border-slate-600 bg-transparent px-2 py-1 text-slate-300"
          value={AUTRES_MARQUES.some((m) => m.nom === marqueManuelle?.nom) ? marqueManuelle!.nom : ""}
          onChange={(e) => setMarqueManuelle(AUTRES_MARQUES.find((m) => m.nom === e.target.value) ?? null)}>
          <option value="">Autres marques…</option>
          {AUTRES_MARQUES.map((m) => <option key={m.nom} value={m.nom}>{m.nom}</option>)}
        </select>
      </div>

      {/* 2. Le VIN ou le code moteur */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <label htmlFor="vin-ou-code" className="sr-only">VIN ou code moteur</label>
        <input id="vin-ou-code" className="input ps-10 text-lg font-mono uppercase" autoComplete="off" spellCheck={false}
          placeholder="VIN (17 caractères) ou code moteur (K9K 612)"
          value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} />
      </div>

      {vinEnCours && <p className="mt-2 text-xs text-slate-400">VIN : {net.length}/17 caractères</p>}

      {estVin && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-slate-300">
            VIN valide · <b>{marqueVin ? marqueVin.nom : `constructeur inconnu (${net.slice(0, 3)})`}</b>
            {marqueVin?.detail ? ` · ${marqueVin.detail}` : ""}
            {!marqueVin && !marqueManuelle ? <span className="text-amber-300"> · choisis la marque ci-dessus</span> : null}
            {marqueManuelle && marqueManuelle.nom !== marqueVin?.nom ? <span className="text-slate-400"> · marque choisie : {marqueManuelle.nom}</span> : null}
            {annee ? <span className="text-slate-400"> · année probable {annee} (à vérifier, certaines marques ne l&apos;indiquent pas)</span> : null}
          </p>
          {niveau && <p className={`text-sm px-3 py-2 rounded-lg ${pastille[niveau].classe}`}>{pastille[niveau].texte}</p>}
          {niveau !== "vert" && (
            <input className="input font-mono uppercase" placeholder={`Code moteur ou modèle${marque ? ` (${marque.nom})` : ""} : ex. K9K 612, Logan…`}
              aria-label="Code moteur ou modèle" value={precision} onChange={(e) => setPrecision(e.target.value.toUpperCase())} />
          )}
          {niveau === "vert" && confirme && (
            <button className="text-xs text-slate-400 underline" onClick={oublier}>Ce n&apos;est pas la bonne voiture</button>
          )}
        </div>
      )}

      {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
      {note && !chargement && <p className="mt-2 text-sm px-3 py-2 rounded-lg bg-amber-500/15 text-amber-300">{note}</p>}
      {chargement && <p className="mt-3 text-sm text-slate-400">Recherche…</p>}

      {!chargement && voitures.length > 0 && (
        <div className="mt-4 space-y-3">
          {voitures.length > MAX_VOITURES && <p className="text-xs text-slate-400">{voitures.length} voitures trouvées : précise (code moteur complet, modèle) pour réduire la liste.</p>}
          {voitures.slice(0, MAX_VOITURES).map((v) => (
            <VoitureCarte key={v.cle} v={v} action={estVin && niveau !== "vert"
              ? <button className="btn-primary text-sm shrink-0" onClick={() => retenir(v)}>✅ C&apos;est cette voiture</button>
              : null} />
          ))}
        </div>
      )}

      {!chargement && !vinEnCours && q.trim().length >= 3 && !estVin && voitures.length === 0 && (
        <p className="mt-3 text-sm text-slate-400">Aucune voiture trouvée. Essaie le code moteur complet (ex. « K9K 612 ») ou le modèle (ex. « Logan 1.5 dCi »).</p>
      )}
    </div>
  );
}
