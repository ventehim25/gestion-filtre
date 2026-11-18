// Import des catalogues PDF OFFICIELS de kits de distribution Graf et Metelli (metelligroup.it → Support → Catalogues,
// « Kit Distribuzione — Graf / Metelli, Aprile 2024 » : « TIMING BELT KIT GRAF April 2024.pdf » et « … METELLI … »).
// → fiches Graf (TP…, stock 0) + voitures + dents/largeur de la courroie + numéros d'origine (OE, demande de l'utilisateur :
// « prends les numéros d'origine des kits, ça va nous servir ») ; le kit Metelli (29-…) devient une variante de marque du kit
// Graf SEULEMENT si ses voitures sont exactement les mêmes dans les deux catalogues. BIBLE §8.36. Rien d'inventé.
//
//   node scripts/import_kits_graf_metelli.mjs "<GRAF.pdf>" "<METELLI.pdf>"            (lecture + essai à blanc)
//   node scripts/import_kits_graf_metelli.mjs "<GRAF.pdf>" "<METELLI.pdf>" --ecrire [--remplacer]
import { createClient } from "@supabase/supabase-js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";
import * as lib from "./lib_voitures.mjs";
import { sansAccent, codes, ecrireDate, ch } from "./lib_voitures.mjs";

const args = process.argv.slice(2);
const [PDF_GRAF, PDF_METELLI] = args.filter((a) => !a.startsWith("--"));
const ECRIRE = args.includes("--ecrire");
const REMPLACER = args.includes("--remplacer");
if (!PDF_GRAF || !PDF_METELLI) { console.error('Usage : node scripts/import_kits_graf_metelli.mjs "<GRAF.pdf>" "<METELLI.pdf>" [--ecrire] [--remplacer]'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_CLE, { global: { fetch: lib.fetchAvecReprise } }); // coupure réseau : réessaie (lectures, effacements, upserts)
const DOSSIER = join(process.cwd(), "backups", "metelli");
mkdirSync(DOSSIER, { recursive: true });

const REF_GRAF = /^TP\d{3,4}[A-Z]?$/;
const REF_METELLI = /^29-\d{4}[A-Z]?$/;
const RE_MOTEUR = /^(.*?)\s*\(\s*(\d+)\s*kW\)\s*(?:Eng\.\s*(.*?))?\s+(\.\/\.-|\d{1,2}\/\d{2}\s*-\s*(?:\d{1,2}\/\d{2})?)\s*$/;
const RE_MODELE = /^(.*?)\s+(\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{2})\s*$/;

// ───────────── 1. Lecture d'un catalogue ─────────────
// Pages voitures : marque en haut à droite (taille 15), modèle à droite (taille 15) « Logan II MCV 10/12-1/70 »,
// ligne moteur à gauche « 1.5 dCi ( 63 kW) Eng.K9K 830, K9K 838 ./.- », puis le kit (x ≈ 53), dents × largeur (x ≈ 245), note (x ≥ 390).
// Pages « Adaptable to | <Marque> Ref » ×3 colonnes : numéro d'origine → réf. du kit (pas de constructeur indiqué).
async function lire(fichier, reRef) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(fichier)), verbosity: 0 }).promise;
  const lignes = [], oe = [], inconnus = {};
  let marque = null, modele = null, mDe = null, mA = null, moteur = null, codeOe = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const its = (await page.getTextContent()).items.filter((i) => i.str?.trim())
      .map((i) => ({ x: i.transform[4], y: i.transform[5], h: i.transform[0], f: i.fontName, s: i.str.trim() }));
    page.cleanup();
    if (its.some((i) => i.s === "Adaptable to")) {
      const yh = Math.min(...its.filter((i) => i.s === "Adaptable to").map((i) => i.y));
      const corps = its.filter((i) => i.y < yh - 2 && i.y > 30);
      for (const g of [0, 1, 2]) {
        const dansG = corps.filter((i) => (i.x < 205 ? 0 : i.x < 395 ? 1 : 2) === g).sort((a, b) => b.y - a.y || a.x - b.x);
        const rangs = [];
        for (const i of dansG) { const r = rangs.find((r) => Math.abs(r.y - i.y) < 2); if (r) r.its.push(i); else rangs.push({ y: i.y, its: [i] }); }
        for (const r of rangs) {
          const ref = r.its.find((i) => reRef.test(i.s));
          const code = r.its.find((i) => i !== ref && !reRef.test(i.s));
          if (code) codeOe = code.s;
          if (ref && codeOe) oe.push({ code: codeOe, ref: ref.s });
        }
      }
      continue;
    }
    if (!its.some((i) => /ref$/i.test(i.s) && i.y > 760) || !its.some((i) => i.s === "NOTE")) continue;
    // Marque = gros titre SANS dates (en haut OU au milieu de la page : 113 marques commencent en milieu de page) ;
    // modèle = gros titre AVEC ses dates. Avant (17/11) : un titre de marque en milieu de page était pris pour un modèle
    // → les Dacia qui suivaient restaient sous « CUPRA ».
    // Un titre peut être en plusieurs morceaux sur la même ligne : on les recolle. Marque = police du titre en haut de page.
    const corps = its.filter((i) => i.y > 30 && i.y < 765 && i.h < 14).sort((a, b) => b.y - a.y || a.x - b.x);
    const grandes = [];
    for (const i of its.filter((i) => i.h >= 14 && i.y > 30).sort((a, b) => b.y - a.y || a.x - b.x)) {
      const l = grandes.find((g) => Math.abs(g.y - i.y) < 2.5);
      if (l) { l.s += " " + i.s; l.polices.add(i.f); } else grandes.push({ y: i.y, x: i.x, s: i.s, polices: new Set([i.f]), titre: true });
    }
    const policeMarque = new Set(its.filter((i) => i.h >= 14 && i.y > 785).map((i) => i.f));
    const flux = [...grandes, ...corps].sort((a, b) => b.y - a.y || a.x - b.x);
    for (const i of flux) {
      if (i.titre) {
        const m = i.s.match(RE_MODELE);
        const estMarque = !m && (policeMarque.size ? [...i.polices].every((f) => policeMarque.has(f)) : i.s === i.s.toUpperCase());
        if (m) { modele = m[1].trim(); mDe = m[2]; mA = m[3]; moteur = null; }
        else if (estMarque) { if (i.s !== marque) { marque = i.s; modele = null; moteur = null; } }
        else { modele = i.s.trim(); mDe = null; mA = null; moteur = null; }
        continue;
      }
      if (i.x < 40 && /kW\)/.test(i.s)) {
        const m = i.s.match(RE_MOTEUR);
        if (!m) { inconnus["moteur illisible"] = (inconnus["moteur illisible"] ?? 0) + 1; moteur = null; continue; }
        const dates = m[4].match(/(\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{2})?/);
        moteur = { label: m[1].trim(), kw: Number(m[2]), codes: (m[3] ?? "").trim().replace(/^-$/, ""), de: dates?.[1] ?? mDe, a: dates ? (dates[2] ?? "1/70") : mA };
        continue;
      }
      if (i.x >= 40 && i.x < 130 && reRef.test(i.s)) {
        const meme = corps.filter((j) => Math.abs(j.y - i.y) < 2.6);
        const dim = meme.filter((j) => j.x >= 200 && j.x < 390).map((j) => j.s).join(" ");
        const note = meme.filter((j) => j.x >= 390).map((j) => j.s).join(" ");
        if (!marque || !modele || !moteur) { inconnus["kit sans voiture"] = (inconnus["kit sans voiture"] ?? 0) + 1; continue; }
        lignes.push({ page: p, marque, modele, ...moteur, ref: i.s, dim, note });
      }
    }
  }
  return { pages: doc.numPages, lignes, oe, inconnus };
}
async function lireAvecCache(fichier, reRef) {
  const cache = join(DOSSIER, `lecture-${basename(fichier).replace(/\.pdf$/i, "").replace(/\s+/g, "_")}.json`);
  if (existsSync(cache) && statSync(cache).mtimeMs > statSync(fichier).mtimeMs) return JSON.parse(readFileSync(cache, "utf8"));
  console.log(`Lecture de ${basename(fichier)}…`);
  const r = await lire(fichier, reRef);
  writeFileSync(cache, JSON.stringify(r));
  return r;
}
const G = await lireAvecCache(PDF_GRAF, REF_GRAF);
const M = await lireAvecCache(PDF_METELLI, REF_METELLI);
for (const [nom, X] of [["Graf", G], ["Metelli", M]]) console.log(`${nom} : ${X.pages} pages · ${X.lignes.length} lignes voiture → kit · ${new Set(X.lignes.map((l) => l.ref)).size} kits · ${X.oe.length} numéros d'origine · écartés`, X.inconnus);

// ───────────── 2. Metelli = Graf ? (mêmes voitures exactement) ─────────────
const cleV = (l) => [l.marque, l.modele, l.label, l.kw, l.codes].join("|");
const voituresDe = (X) => { const m = new Map(); for (const l of X.lignes) { if (!m.has(l.ref)) m.set(l.ref, new Set()); m.get(l.ref).add(cleV(l)); } return m; };
const vG = voituresDe(G), vM = voituresDe(M);
const signature = (s) => [...s].sort().join("\n");
// Plusieurs kits Graf peuvent avoir exactement les mêmes voitures (TP104 et TP444 : deux choix pour les mêmes K9K) →
// on ne garde que le kit Graf au même numéro ; sans lui, pas d'association (le kit Metelli reste une fiche à part).
const parSignature = new Map(); for (const [ref, s] of vG) { const k = signature(s); if (!parSignature.has(k)) parSignature.set(k, []); parSignature.get(k).push(ref); }
const numero = (r) => r.replace(/^(TP|29-)0*/, "");
const metelliVersGraf = new Map(); const metelliSeuls = [];
for (const [ref, s] of vM) {
  const candidats = parSignature.get(signature(s)) ?? [];
  const g = candidats.find((c) => numero(c) === numero(ref)) ?? (candidats.length === 1 ? candidats[0] : null);
  if (g) metelliVersGraf.set(ref, g); else metelliSeuls.push(ref);
}
console.log(`Kits Metelli aux voitures identiques à un kit Graf : ${metelliVersGraf.size} / ${vM.size}` + (metelliSeuls.length ? ` · différents : ${metelliSeuls.slice(0, 10).join(", ")}` : ""));
const exPaires = [...metelliVersGraf.entries()].slice(0, 5).map(([m, g]) => `${m} = ${g}`).join(", ");
console.log("  ex.", exPaires, "· même numéro :", [...metelliVersGraf.entries()].filter(([m, g]) => m.slice(-3) === g.slice(-3)).length);

// ───────────── 3. Fiches Graf (+ Metelli seul s'il n'a pas de jumeau) ─────────────
const plusFrequent = (arr) => { const m = new Map(); for (const x of arr) if (x) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""; };
const normDents = (s) => s.trim().replace(/\s*[/x×X-]\s*/i, "/").replace(/\s+/g, "").replace(",", ".");
const dentsValides = (s) => /^\d{2,3}\/\d{1,2}(\.\d)?$/.test(s);
function fichesDe(X, marque, refs) {
  const out = new Map();
  for (const ref of refs) {
    const ls = X.lignes.filter((l) => l.ref === ref);
    const dimBrut = plusFrequent(ls.map((l) => l.dim.split(",")[0].split(" / ")[0].trim()));
    const dents = normDents(dimBrut);
    out.set(ref, { reference: ref, marque, dimensions: dentsValides(dents) ? dents : null, dimTexte: plusFrequent(ls.map((l) => l.dim)) });
  }
  return out;
}
const fiches = fichesDe(G, "Graf", [...vG.keys()]);
for (const [ref, f] of fichesDe(M, "Metelli", metelliSeuls)) fiches.set(ref, f);
console.log(`${fiches.size} fiches (Graf ${[...fiches.values()].filter((f) => f.marque === "Graf").length}, Metelli seul ${metelliSeuls.length}) · avec dents/largeur : ${[...fiches.values()].filter((f) => f.dimensions).length} · ex.`, [...fiches.values()].slice(0, 3).map((f) => `${f.reference} = ${f.dimensions} (« ${f.dimTexte} »)`).join(" ; "));

// Numéros d'origine (marque « OE » : le catalogue ne dit pas quel constructeur) — Graf, et Metelli pour les kits Metelli seuls
const oe = new Map();
const ajouterOe = (ref, code) => { if (!fiches.has(ref)) return; if (!oe.has(ref)) oe.set(ref, new Set()); oe.get(ref).add(code); };
for (const p of G.oe) ajouterOe(p.ref, p.code);
for (const p of M.oe) ajouterOe(metelliVersGraf.get(p.ref) ?? p.ref, p.code);
console.log(`Numéros d'origine : ${[...oe.values()].reduce((s, x) => s + x.size, 0)} sur ${oe.size} kits`);

// ───────────── 4. Voitures ↔ Filtron ─────────────
const dateK = (s) => { const m = (s ?? "").match(/^(\d{1,2})\/(\d{2})$/); if (!m) return null; const a = Number(m[2]); if (a === 70 && Number(m[1]) === 1) return null; return (a >= 50 ? 1900 + a : 2000 + a) * 100 + Number(m[1]); };
const marqueCatalogue = (m) => m.replace(/\s+(LCV|HCV|TRUCK|BUS)$/i, "").trim();
const CAMIONS = { VOLVO: "VOLVO CARS" };
const lignesKits = [...G.lignes, ...M.lignes.filter((l) => metelliSeuls.includes(l.ref))];
const filtron = new Map();
for (const mc of new Set(lignesKits.map((l) => marqueCatalogue(l.marque)))) {
  const mf = CAMIONS[mc] ?? await lib.marqueFiltron(sb, mc);
  const voitures = (await lib.voituresFiltron(sb, mf)).voitures;
  for (const a of lib.AUSSI[sansAccent(mc)] ?? []) voitures.push(...(await lib.voituresFiltron(sb, a)).voitures);
  filtron.set(mc, { marque: mf, voitures });
}
function remarque(l) {
  const n = [];
  if (/\bBIO\b/.test(l.dim)) n.push("courroie baignant dans l'huile");
  if (/ \/ /.test(l.dim)) n.push(`2 courroies : ${l.dim.replace(/,.*$/, "")}`);
  if (/screw|vite/i.test(l.dim)) n.push("avec vis");
  if (l.note) n.push(l.note.replace(/-Ch\b/g, "sans climatisation").replace(/\+Ch\b/g, "avec climatisation").replace(/\s+/g, " ").trim());
  return n.join(" · ");
}
const apps = new Map();
let exactes = 0, famille = 0, catalogue = 0;
function ajouter(ref, c, rem) {
  const k = [ref, c.marque, c.modele, c.moteur ?? "", c.code_moteur ?? "", c.annee_debut ?? ""].join("|");
  const ex = apps.get(k);
  if (ex) { if (rem && !ex.remarques.includes(rem)) ex.remarques.push(rem); return; }
  apps.set(k, { ref, ...c, remarques: rem ? [rem] : [] });
}
for (const l of lignesKits) {
  const mc = marqueCatalogue(l.marque);
  const { marque: mf, voitures } = filtron.get(mc);
  const d = dateK(l.de) ?? 0, f = dateK(l.a) ?? 999912, cv = ch(l.kw);
  const { trouvees, famille: parFamille } = lib.memesVoitures(voitures, { modele: l.modele, codesMoteur: codes(l.codes), cv, d, f });
  const rem = [parFamille ? `moteur ${l.codes}` : "", remarque(l)].filter(Boolean).join(" · ");
  if (trouvees.length) {
    if (parFamille) famille++; else exactes++;
    for (const v of trouvees) ajouter(l.ref, { marque: v.marque, modele: v.modele, moteur: v.moteur, code_moteur: v.code_moteur, annee_debut: v.annee_debut, annee_fin: v.annee_fin, puissance: v.puissance }, rem);
  } else {
    catalogue++;
    ajouter(l.ref, { marque: mf, modele: l.modele, moteur: l.label, code_moteur: l.codes || null, annee_debut: ecrireDate(d || null), annee_fin: f === 999912 ? "" : ecrireDate(f), puissance: String(cv) }, rem);
  }
}
const tot = exactes + famille + catalogue;
console.log(`Voitures : ${exactes} reliées (code exact), ${famille} par la famille, ${catalogue} avec le nom du catalogue (${Math.round((exactes + famille) * 100 / tot)} % reliées) → ${apps.size} liens`);
console.log("Exemples Logan :", [...apps.values()].filter((a) => /Logan/.test(a.modele) && /K9K/.test(a.code_moteur ?? "")).slice(0, 5).map((a) => `${a.ref} (${fiches.get(a.ref)?.dimensions}) → ${a.modele} · ${a.moteur} · ${a.code_moteur} · ${a.puissance} ch${a.remarques.length ? " · " + a.remarques.join(" / ") : ""}`));

if (!ECRIRE) { console.log("\nEssai à blanc : rien n'est écrit. Ajouter --ecrire pour enregistrer."); process.exit(0); }

// ───────────── 5. Écriture ─────────────
const refs = [...fiches.keys()];
const existantes = new Map();
for (let i = 0; i < refs.length; i += 100) {
  const { data, error } = await sb.from("products").select("id, reference, marque").in("reference", refs.slice(i, i + 100));
  if (error) throw error;
  for (const p of data) existantes.set(p.reference, p);
}
const nouvelles = [], conflits = [];
for (const f of fiches.values()) {
  const p = existantes.get(f.reference);
  if (p) { if (sansAccent(p.marque) === sansAccent(f.marque)) f.id = p.id; else conflits.push(f.reference); continue; }
  nouvelles.push(f);
}
const creees = [];
for (let i = 0; i < nouvelles.length; i += 200) {
  const { data, error } = await sb.from("products").insert(nouvelles.slice(i, i + 200).map((f) => ({
    reference: f.reference, marque: f.marque, categorie: "kit_distribution", nom_fr: `Kit de distribution ${f.marque}`, nom_ar: `طقم التوزيع ${f.marque}`,
    dimensions: f.dimensions, prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 1,
    notes: `Catalogue officiel ${f.marque} (PDF « ${basename(f.marque === "Graf" ? PDF_GRAF : PDF_METELLI)} »)`,
  }))).select("id, reference");
  if (error) throw new Error(`fiches : ${error.message}`);
  for (const p of data) { fiches.get(p.reference).id = p.id; creees.push(p); }
}
console.log(`Fiches : ${creees.length} créées, ${fiches.size - creees.length - conflits.length} déjà là, ${conflits.length} laissées (autre marque)`);
const ids = [...fiches.values()].filter((f) => f.id).map((f) => f.id);
const dejaEq = new Set();
for (let i = 0; i < ids.length; i += 150) {
  const { data, error } = await sb.from("equivalences").select("product_id, marque, reference").in("product_id", ids.slice(i, i + 150));
  if (error) throw error;
  for (const e of data) dejaEq.add(`${e.product_id}|${e.marque}|${e.reference}`);
}
const eq = [];
for (const [m, g] of metelliVersGraf) { const id = fiches.get(g)?.id; if (id && !dejaEq.has(`${id}|Metelli|${m}`)) eq.push({ product_id: id, marque: "Metelli", reference: m, prix: null, prix_achat: null, stock: 0 }); }
for (const [ref, set] of oe) { const id = fiches.get(ref)?.id; if (!id) continue; for (const c of set) if (!dejaEq.has(`${id}|OE|${c}`)) eq.push({ product_id: id, marque: "OE", reference: c, prix: null, prix_achat: null, stock: 0 }); }
// upsert « ignorer les doublons » : la liste dejaEq (par paquets limités à 1000 lignes) peut être incomplète
for (let i = 0; i < eq.length; i += 500) { const { error } = await sb.from("equivalences").upsert(eq.slice(i, i + 500), { onConflict: "product_id,marque,reference", ignoreDuplicates: true }); if (error) throw new Error(`équivalences : ${error.message}`); }
console.log(`Équivalences : ${eq.length} ajoutées (variantes Metelli ${eq.filter((e) => e.marque === "Metelli").length}, numéros d'origine ${eq.filter((e) => e.marque === "OE").length})`);
if (REMPLACER) {
  let n = 0;
  for (let i = 0; i < ids.length; i += 150) { const { error, count } = await sb.from("applications").delete({ count: "exact" }).in("product_id", ids.slice(i, i + 150)); if (error) throw error; n += count ?? 0; }
  console.log(`--remplacer : ${n} anciens liens effacés`);
}
const aEcrire = [...apps.values()].filter((a) => fiches.get(a.ref)?.id).map((a) => ({
  product_id: fiches.get(a.ref).id, marque: a.marque, modele: a.modele, moteur: a.moteur, code_moteur: a.code_moteur,
  annee_debut: a.annee_debut, annee_fin: a.annee_fin, puissance: a.puissance, remarque: a.remarques.join(" — ou — ") || null,
}));
let ecrites = 0;
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error, count } = await sb.from("applications").upsert(aEcrire.slice(i, i + 500), { onConflict: "product_id,marque,modele,moteur,code_moteur,annee_debut", ignoreDuplicates: true, count: "exact" });
  if (error) throw new Error(`voitures : ${error.message}`);
  ecrites += count ?? 0;
}
console.log(`Voitures : ${ecrites} liens écrits (sur ${aEcrire.length})`);
writeFileSync(join(DOSSIER, `${new Date().toISOString().slice(0, 10)}-kits-graf-metelli.json`), JSON.stringify({ creees, conflits, equivalences: eq.length, liens: aEcrire.length, ecrites }, null, 1));
