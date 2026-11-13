// Complète les applications Filtron coupées à 250 voitures par l'ancien robot (scrape_filtron.mjs, BIBLE §8.13).
// Source : la page produit publique du nouveau site Filtron (…/product.html/pp987/2_filtron.html), qui liste TOUTES les voitures.
//
// Les noms du nouveau site diffèrent un peu des anciens (modèle sans période « | 12- », moteur sans « (K67, F67) »,
// dates « 2012-07-01 ») : chaque voiture est rattachée à celle qui existe déjà en base (même marque, modèle, moteur,
// code moteur, date de début) pour que ses filtres restent ensemble. Sinon, une nouvelle ligne au format ancien.
// Aucun doublon : contrainte unique de la table + ignoreDuplicates.
//
//   node scripts/completer_filtron.mjs                 → essai à blanc (rien n'est écrit), filtres à 250 applications
//   node scripts/completer_filtron.mjs --ecrire        → écrit dans la base
//   node scripts/completer_filtron.mjs PP987/2 OP643/5 → seulement ces références (avec ou sans --ecrire)
//   --par-code   → une ligne par version de moteur (code moteur + date) : SEULEMENT après supabase/applications_par_code_moteur.sql
//   --tout       → toutes les références de filtres (≈ 1 h 30, poli avec le site) ; --depuis 500 pour reprendre au 500ᵉ
//   --detail     → affiche chaque ligne ajoutée
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const sb = createClient(SUPABASE_URL, SUPABASE_CLE);
const arg = (nom) => process.argv.includes(nom);
const ECRIRE = arg("--ecrire"), PAR_CODE = arg("--par-code"), TOUT = arg("--tout"), DETAIL = arg("--detail");
const iDepuis = process.argv.indexOf("--depuis");
const DEPUIS = iDepuis > 0 ? Number(process.argv[iDepuis + 1]) || 0 : 0;
const REFS = process.argv.slice(2).filter((a, i, t) => !a.startsWith("--") && t[i - 1] !== "--depuis").map((r) => r.toUpperCase().replace(/\s+/g, ""));
const CONFLIT = PAR_CODE ? "product_id,marque,modele,moteur,code_moteur,annee_debut" : "product_id,marque,modele,moteur";
// Même règle que la contrainte unique de la table
const cleUnique = (marque, modele, moteur, code, debut) => PAR_CODE ? [marque, modele, moteur ?? "", code ?? "", debut ?? ""].join("|") : [marque, modele, moteur ?? ""].join("|");
const PLAFOND = 250;
const PAGE = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

const norm = (s) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const sansParentheses = (s) => norm(s).replace(/(\s*\([^)]*\))+$/, "");
const nomModele = (modele) => { const i = modele.lastIndexOf(" | "); return norm(i > 0 ? modele.slice(0, i) : modele); };
// « 2012-07-01 » → « 07/2012 » ; « 9999-12-31 » (encore fabriquée) et « 1900-01-01 » (date inconnue chez Filtron) → ""
const dateAncienne = (iso) => { const m = (iso ?? "").match(/^(\d{4})-(\d{2})/); return !m || m[1] === "9999" || m[1] === "1900" ? "" : `${m[2]}/${m[1]}`; };

async function toutLire(table, cols) {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  const out = [];
  for (let debut = 0; debut < count; debut += PAGE * 10) {
    const lots = await Promise.all(Array.from({ length: 10 }, (_, k) => debut + k * PAGE).filter((i) => i < count)
      .map((i) => sb.from(table).select(cols).order("id").range(i, i + PAGE - 1)));
    for (const l of lots) { if (l.error) throw l.error; out.push(...l.data); }
  }
  return out;
}

async function page(reference) {
  const url = `https://filtron.eu/en/catalog/search-results/product.html/${reference.toLowerCase()}_filtron.html`;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 404) return null;
      if (r.ok) return await r.text();
      throw new Error("HTTP " + r.status);
    } catch (e) { if (essai === 2) throw e; await sleep(3000 * (essai + 1)); }
  }
}

function lireApplications(html) {
  const dec = (v) => { try { return decodeURIComponent(v.replace(/\+/g, " ")); } catch { return v; } };
  const vus = new Map();
  for (const m of html.matchAll(/data-g-binding-params="([^"]+)"[^>]*data-g-binding-application-link/g)) {
    const p = Object.fromEntries(new URLSearchParams(dec(m[1]).replace(/^\?/, "")).entries());
    for (const k of Object.keys(p)) p[k] = (p[k] ?? "").replace(/\s+/g, " ").trim();
    if (p.vehicleMake && p.vehicleModel && p.vehicleTypeId) vus.set(p.vehicleTypeId, p); // bureau + tablette : même liste deux fois
  }
  return [...vus.values()];
}

async function main() {
  console.log(ECRIRE ? ">>> MODE ÉCRITURE" : ">>> ESSAI À BLANC (rien n'est écrit ; ajouter --ecrire)");
  const produits = await toutLire("products", "id, reference, categorie");
  const apps = await toutLire("applications", "id, product_id, marque, modele, moteur, code_moteur, annee_debut, annee_fin");
  console.log(`${produits.length} produits, ${apps.length} applications en base`);

  // Index des voitures déjà connues (toutes références confondues)
  const exact = new Map(), sansDate = new Map(), parNom = new Map(), modeles = new Map(), dejaParProduit = new Map(), nbParProduit = new Map();
  for (const a of apps) {
    const nom = [a.marque, nomModele(a.modele), sansParentheses(a.moteur)].join("|");
    const base = `${nom}|${norm(a.code_moteur)}`;
    const v = { modele: a.modele, moteur: a.moteur, code_moteur: a.code_moteur, annee_debut: a.annee_debut, annee_fin: a.annee_fin };
    exact.set(`${base}|${a.annee_debut}`, v);
    const s = sansDate.get(base) ?? new Map(); s.set(`${a.modele}|${a.moteur}|${a.code_moteur}`, v); sansDate.set(base, s);
    // Même motorisation écrite autrement (« 1.5 dCi » sur le site = « 1.5 dCi (HS) » en base), quel que soit le code
    const n = parNom.get(nom) ?? new Map(); n.set(`${a.modele}|${a.moteur}`, { modele: a.modele, moteur: a.moteur }); parNom.set(nom, n);
    const mm = modeles.get(`${a.marque}|${nomModele(a.modele)}`) ?? new Set(); mm.add(a.modele); modeles.set(`${a.marque}|${nomModele(a.modele)}`, mm);
    const d = dejaParProduit.get(a.product_id) ?? new Set(); d.add(cleUnique(a.marque, a.modele, a.moteur, a.code_moteur, a.annee_debut)); dejaParProduit.set(a.product_id, d);
    nbParProduit.set(a.product_id, (nbParProduit.get(a.product_id) ?? 0) + 1);
  }

  const vusRef = new Set();
  const cibles = produits.filter((p) => {
    const ref = p.reference.toUpperCase().replace(/\s+/g, "");
    if (vusRef.has(ref)) return false;
    const ok = REFS.length ? REFS.includes(ref)
      : TOUT ? p.categorie.startsWith("filtre_")
      : (nbParProduit.get(p.id) ?? 0) >= PLAFOND;
    if (ok) vusRef.add(ref);
    return ok;
  });
  console.log(`${cibles.length} références à compléter${DEPUIS ? ` (reprise au n° ${DEPUIS + 1})` : ""} · règle ${PAR_CODE ? "une ligne par version de moteur" : "une ligne par motorisation"}\n`);

  const total = { page: 0, nouvelles: 0, rattachees: 0, nouvellesVoitures: 0, ecrites: 0, absentes: 0, erreurs: 0 };
  for (let i = DEPUIS; i < cibles.length; i++) {
    const p = cibles[i];
    try {
      const html = await page(p.reference);
      await sleep(1500); // poli avec le site Filtron
      if (!html) { total.absentes++; console.log(`[${i + 1}/${cibles.length}] ${p.reference} : page introuvable`); continue; }
      const neuves = lireApplications(html);
      // Période d'un modèle inconnu, au format ancien (« 13- », « 10-18 ») : de sa 1re à sa dernière année sur la page
      const periodes = new Map();
      for (const n of neuves) {
        const k = `${n.vehicleMake}|${norm(n.vehicleModel)}`;
        const d = Number(n.vehicleManufacturedFrom.slice(0, 4)) || 9999, f = Number(n.vehicleManufacturedTo.slice(0, 4)) || 9999;
        const per = periodes.get(k) ?? { d: 9999, f: 0 }; per.d = Math.min(per.d, d); per.f = Math.max(per.f, f); periodes.set(k, per);
      }
      const deja = dejaParProduit.get(p.id) ?? new Set();
      const lignes = [];
      let rattachees = 0, nouvellesVoitures = 0; const nouvelle = [];
      for (const n of neuves) {
        const base = [n.vehicleMake, norm(n.vehicleModel), sansParentheses(n.vehicleName), norm(n.engineCode)].join("|");
        const debut = dateAncienne(n.vehicleManufacturedFrom);
        let v = exact.get(`${base}|${debut}`);
        if (!v) { const s = sansDate.get(base); if (s && s.size === 1) v = [...s.values()][0]; }
        let modele, moteur, code, dDebut = debut, dFin = dateAncienne(n.vehicleManufacturedTo);
        const memeNom = v ? null : parNom.get([n.vehicleMake, norm(n.vehicleModel), sansParentheses(n.vehicleName)].join("|"));
        // Voiture déjà connue : on reprend exactement ses noms ET ses dates (même ligne de catalogue)
        if (v) { ({ modele, moteur } = v); code = v.code_moteur; dDebut = v.annee_debut ?? debut; dFin = v.annee_fin ?? dFin; rattachees++; }
        else if (memeNom && memeNom.size === 1) { ({ modele, moteur } = [...memeNom.values()][0]); code = n.engineCode; rattachees++; }
        else {
          const connus = modeles.get(`${n.vehicleMake}|${norm(n.vehicleModel)}`);
          if (connus && connus.size === 1) modele = [...connus][0];
          else {
            const per = periodes.get(`${n.vehicleMake}|${norm(n.vehicleModel)}`);
            const aa = (x) => String(x).slice(2);
            modele = `${n.vehicleModel} | ${aa(per.d)}-${per.f >= 9999 ? "" : aa(per.f)}`;
          }
          moteur = n.vehicleName; code = n.engineCode; nouvellesVoitures++;
        }
        const ligne = {
          product_id: p.id, marque: n.vehicleMake.slice(0, 80), modele: modele.slice(0, 120), moteur: (moteur ?? "").slice(0, 120),
          code_moteur: (code ?? "").slice(0, 60), annee_debut: (dDebut ?? "").slice(0, 20), annee_fin: (dFin ?? "").slice(0, 20),
          puissance: (n.bhp === "-" ? "" : n.bhp ?? "").slice(0, 20),
        };
        const cle = cleUnique(ligne.marque, ligne.modele, ligne.moteur, ligne.code_moteur, ligne.annee_debut);
        if (deja.has(cle)) continue;
        deja.add(cle);
        lignes.push(ligne); nouvelle.push(!v && !(memeNom && memeNom.size === 1));
      }
      if (DETAIL) lignes.forEach((l, k) => console.log(`      ${nouvelle[k] ? "+ NOUVELLE" : "= rattachée"} ${l.marque} | ${l.modele} | ${l.moteur} | ${l.code_moteur} | ${l.annee_debut} → ${l.annee_fin} | ${l.puissance} ch`));
      total.page += neuves.length; total.nouvelles += lignes.length; total.rattachees += rattachees; total.nouvellesVoitures += nouvellesVoitures;
      if (ECRIRE && lignes.length) {
        for (let k = 0; k < lignes.length; k += 500) {
          const { error } = await sb.from("applications").upsert(lignes.slice(k, k + 500), { onConflict: CONFLIT, ignoreDuplicates: true });
          if (error) throw error;
        }
        total.ecrites += lignes.length;
      }
      console.log(`[${i + 1}/${cibles.length}] ${p.reference.padEnd(10)} ${p.categorie.padEnd(17)} site:${String(neuves.length).padStart(4)}  base:${String(nbParProduit.get(p.id) ?? 0).padStart(4)}  +${lignes.length} (rattachées ${rattachees}, nouvelles voitures ${nouvellesVoitures})`);
    } catch (e) {
      total.erreurs++;
      console.log(`[${i + 1}/${cibles.length}] ${p.reference} ERREUR : ${e.message}`);
    }
  }
  console.log("\n=== TERMINÉ ===", total);
}
main();
