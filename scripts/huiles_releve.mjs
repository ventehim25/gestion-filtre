// Huile moteur par code moteur (BIBLE §8.19 et §8.21) : relevé du guide des huiles Liqui Moly (données Olyslager)
// pour les marques et modèles courants au Maroc, puis ajout dans la table huiles_moteurs.
//
//   node scripts/huiles_releve.mjs collecte   → lit le guide (≈ 6 700 versions, 2 h environ, reprenable) dans backups/huiles/
//   node scripts/huiles_releve.mjs fusion     → regroupe par code moteur → backups/huiles/nouvelles.json (rien n'est envoyé)
//   node scripts/huiles_releve.mjs envoi      → ajoute les lignes nouvelles (ne remplace JAMAIS une ligne déjà en base)
//
// Règles (on ne devine jamais) :
// - viscosités : seulement celles valables pour TOUTES les voitures qui ont ce code ; si le guide donne des huiles
//   différentes selon la version (Euro 5 / Euro 6, modèle…), jusqu'à 3 « versions » au choix (colonne variante) ;
// - litres : remplissage d'entretien (avec filtre), plage min-max ; remarque si ça change beaucoup selon la voiture ;
// - marques : où le code a été relevé ; l'appli n'affiche l'huile que pour la même famille de marques
//   (« F4A » = Ford Fiesta ET moteur de camion Iveco) ;
// - les noms de famille (« XUD », « Duratec », « CVVT ») et les codes de 2 signes partagés par 2 marques sont écartés.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(ROOT, "backups", "huiles");
mkdirSync(DOSSIER, { recursive: true });
const fichier = (n) => join(DOSSIER, n);
const lire = (n, defaut) => (existsSync(fichier(n)) ? JSON.parse(readFileSync(fichier(n), "utf8")) : defaut);
const ecrire = (n, v) => writeFileSync(fichier(n), JSON.stringify(v));
const aujourdhui = new Date().toLocaleDateString("fr-FR", { timeZone: "Africa/Casablanca" });
const SOURCE = `Guide des huiles Liqui Moly, consulté le ${aujourdhui}`;

// ---------------------------------------------------------------- 1. COLLECTE
const BASE = "https://www.liqui-moly.com/fr/fr";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", Accept: "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(p) {
  for (let e = 0; e < 4; e++) {
    try { const r = await fetch(BASE + p, { headers: UA }); if (r.ok) return await r.json(); if (r.status === 404) return null; throw new Error("HTTP " + r.status); }
    catch (err) { await sleep(3000 * (e + 1)); if (e === 3) throw err; }
  }
}
const CIBLES = [
  ["Dacia", /^(Logan|Sandero|Duster|Dokker|Lodgy|Jogger)/],
  ["Renault", /^(Clio|M[eé]gane|Kangoo|Symbol|Thalia|Captur|Kadjar|Express|Trafic|Master|Fluence|Sc[eé]nic|Laguna|Koleos|Twingo|Austral|Arkana|Taliant)/],
  ["Peugeot", /^(106|107|108|205|206|207|208|2008|301|306|307|308|3008|405|406|407|5008|508|Partner|Rifter|Expert|Boxer|Bipper|Landtrek)/],
  ["Citro", /^(C1|C2|C3|C4|C5|C-[EÉ]lys[eé]e|Berlingo|Jumpy|Jumper|Saxo|Xsara|Nemo|SpaceTourer)/],
  ["Fiat", /^(Tipo|Panda|Punto|Grande Punto|Dobl|Fiorino|500|Ducato|Palio|Siena|Albea|Uno|Linea|Bravo|Qubo|Strada|Scudo)/],
  ["Volkswagen", /^(Polo|Golf|Passat|Tiguan|Touareg|Caddy|Jetta|T-Roc|T-Cross|Touran|Transporter|Multivan|Amarok|Crafter|Up|Bora|Vento|Sharan|Arteon|Taigo)/],
  ["Skoda", /^(Octavia|Fabia|Superb|Kodiaq|Karoq|Rapid|Kamiq|Scala|Yeti)/],
  ["Seat", /^(Ibiza|Le[oó]n|Arona|Ateca|Toledo|C[oó]rdoba|Altea|Tarraco)/],
  ["Audi", /^(A1|A3|A4|A5|A6|Q2|Q3|Q5|Q7)\b/],
  ["Hyundai", /^(i10|i20|i30|Accent|Elantra|Tucson|Santa F|Creta|H-1|H1|ix35|Atos|Getz|Kona|Bayon|Grand i10|Verna|Matrix|Staria)/],
  ["Kia", /^(Picanto|Rio|Sportage|Ceed|Cee.d|Cerato|Sorento|Soul|Stonic|Carens|Pegas|Seltos|Niro|K2500|K2700)/],
  ["Toyota", /^(Yaris|Corolla|Auris|RAV ?4|Land Cruiser|Hilux|C-HR|Avensis|Prado|Hiace|Fortuner|Rush|Aygo|Starlet|Proace)/],
  ["Mercedes", /(W176|W177|W169|W245|W246|W202|W203|W204|W205|W206|W210|W211|W212|W213|W124|W201|Vito|Viano|Sprinter|Citan|CLA|GLA|GLC|X156|X253|W166|W164|ML|GLE|190)/],
  ["BMW", /(E46|E90|E91|F30|F31|G20|E39|E60|F10|G30|E87|F20|F40|E84|F48|E83|F25|G01|E70|F15|G05)/],
  ["Ford", /^(Fiesta|Focus|Kuga|Ranger|Transit|EcoSport|Fusion|Mondeo|C-Max|B-Max|Puma|Ka\b|Tourneo)/],
  ["Opel", /^(Corsa|Astra|Insignia|Combo|Mokka|Meriva|Zafira|Vectra|Crossland|Grandland|Vivaro|Movano)/],
  ["Nissan", /^(Micra|Qashqai|Juke|X-Trail|Navara|Note|Sunny|Almera|Pathfinder|NP300|Pick ?up|Kicks|Tiida|Primastar|NV200|Terrano)/],
  ["Mitsubishi", /^(L200|L 200|Pajero|ASX|Outlander|Lancer|Colt|Space Star|Attrage|Triton)/],
  ["Suzuki", /^(Swift|Celerio|Alto|Vitara|Grand Vitara|S-Presso|Dzire|Jimny|Baleno|SX4|Ignis|Ertiga)/],
  ["Honda", /^(Civic|CR-V|Jazz|Accord|HR-V|City)/],
  ["Mazda", /^(2|3|6|CX-3|CX-5|BT-50)\b/],
  ["Isuzu", /^(D-?Max)/i],
  ["Land Rover", /(Evoque|Discovery|Defender|Range Rover)/],
  ["Jeep", /^(Renegade|Compass|Cherokee|Grand Cherokee|Wrangler)/],
  ["MG", /^(ZS|HS|MG ?3|MG ?5|RX5)/],
  ["Chery", /^(Tiggo|Arrizo|QQ)/],
  ["Chevrolet", /^(Aveo|Spark|Cruze|Optra|Captiva|Lacetti|Sail)/],
  ["SsangYong", /^(Rexton|Korando|Kyron|Tivoli|Actyon)/],
  ["Volvo", /^(XC40|XC60|XC90|S60|V40)/],
];

// Une version : code moteur, viscosités citées, quantité d'entretien (jamais la « capacité filtre » seule)
async function lireVersion(t) {
  const j = await json("/rest/V1/recommendations/" + t.ty); const r = Array.isArray(j) ? j[0] : j;
  if (!r) return { vt: t.nom, code: "", visc: [] };
  const comps = Array.isArray(r.components) ? r.components : Object.values(r.components || {});
  const m = comps.find((c) => /^Moteur/i.test(c.name)) || {};
  const prods = (Array.isArray(m.products) ? m.products : Object.values(m.products || {})).map((p) => (p.name || "").replace(/­/g, ""));
  const visc = [...new Set(prods.map((p) => p.match(/\b(\d{1,2})W-?(\d{2})\b/)).filter(Boolean).map((x) => x[1] + "W-" + x[2]))];
  const caps = Object.values(m.capacities || {}).flat().filter((c) => /Capacit/i.test(c.item) && !/filtre/i.test(c.item));
  const c = caps.find((k) => /entretien|avec filtre/i.test(k.condition || ""));
  const vals = (c ? [c] : caps).flatMap((k) => String(k.value).split("-").map((x) => Number(String(x).replace(",", ".").trim()))).filter((n) => n > 0);
  return { vt: (r.vehicle_type || t.nom).replace(" (EU)", ""), code: m.code || "", visc, lmin: vals.length ? Math.min(...vals) : null, lmax: vals.length ? Math.max(...vals) : null };
}

async function collecte() {
  const brut = lire("brut.json", {});
  let aLire = lire("a_lire.json", null);
  if (!aLire) {
    const makes = { 1: await json("/rest/V1/olyslager/makes/1"), 2: await json("/rest/V1/olyslager/makes/2") }; // voitures, utilitaires
    aLire = []; const vus = new Set();
    for (const [marque, re] of CIBLES) {
      for (const cat of [1, 2]) {
        const mk = (makes[cat] ?? []).find((m) => m.make_name.toLowerCase().startsWith(marque.toLowerCase()) && /\(EU\)/.test(m.make_name))
          ?? (makes[cat] ?? []).find((m) => m.make_name.toLowerCase().startsWith(marque.toLowerCase()) && !/USA|CAN|Japan|Australia/i.test(m.make_name));
        if (!mk) continue;
        const modeles = ((await json("/rest/V1/olyslager/models/" + mk.id)) ?? []).filter((m) => re.test(m.name) && (m.year_end == null || m.year_end >= 1995));
        for (const mo of modeles) {
          for (const t of (await json("//rest/V1/olyslager/types/" + mo.id)) ?? []) {
            if (t.fuel_id !== 1 && t.fuel_id !== 2) continue; // essence, diesel
            if (t.year_end != null && t.year_end < 1995) continue;
            const k = `${marque}|${t.cylinder_c_c}|${t.power_k_w}|${t.fuel_id}|${t.year_start}`; // un moteur distinct = une lecture
            if (vus.has(k)) continue; vus.add(k);
            aLire.push({ ty: t.id, nom: t.name, marque });
          }
          await sleep(250);
        }
        console.log(`${marque} (cat ${cat}) : ${modeles.length} modèles · total à lire ${aLire.length}`);
      }
    }
    ecrire("a_lire.json", aLire);
  }
  const reste = aLire.filter((t) => !brut[t.ty]);
  console.log(`à lire : ${reste.length} (déjà lus ${aLire.length - reste.length})`);
  let i = 0, faits = 0;
  async function ouvrier() {
    while (i < reste.length) {
      const t = reste[i++];
      try { brut[t.ty] = await lireVersion(t); } catch (e) { console.log("  ⚠", t.nom, e.message); }
      if (++faits % 50 === 0) { ecrire("brut.json", brut); console.log(`… ${faits}/${reste.length}`); }
      await sleep(400);
    }
  }
  await Promise.all([ouvrier(), ouvrier()]);
  ecrire("brut.json", brut);
  console.log("=== collecte terminée ===", Object.keys(brut).length, "versions lues");
}

// ---------------------------------------------------------------- 2. FUSION
// « DV4C, DV4TD » → 2 codes ; « ARL (PD) » → ARL ; « M 274.920 » → M274920 + M274 ; « DuraTorq F6JA » → F6JA ; « 4 EC1 » → 4EC1
function codes(brutCode) {
  return brutCode.split(/,/).flatMap((part) => {
    const p = part.replace(/\(.*?\)/g, "").trim().toUpperCase().replace(/^([A-Z]) (\d)/, "$1$2").replace(/^(\d{1,2}) ([A-Z]{1,3}\d*)$/, "$1$2");
    const toks = p.split(/[\s/]+/).map((t) => t.replace(/[^A-Z0-9]/g, "")).filter(Boolean);
    const c = toks.find((t) => /[A-Z]/.test(t) && /\d/.test(t) && t.length >= 2 && !/^\d+V$/.test(t)) // pas « 16V »
      ?? toks.find((t) => /^[A-Z]{3,4}$/.test(t) && !/^(PD|DPF|FAP|TDI|TSI|CDI|HDI|DCI|CRDI|VVT|GDI|MPI|TCE|SCE|PF|EU|SOHC|DOHC|VTEC|TFSI|FSI|CRD|JTD|JTDM|TDCI|DID|VVTI)$/.test(t)) ?? "";
    if (!c) return [];
    const famille = p.match(/^(OM|M)(\d{3})\.\d/); // Mercedes « OM640.940 » : aussi rangé sous « OM640 » (Filtron écrit souvent « OM 640 »)
    return famille ? [c, famille[1] + famille[2]] : [c];
  });
}
const FAMILLE = { Volkswagen: "VAG", Skoda: "VAG", Seat: "VAG", Audi: "VAG", Renault: "RN", Dacia: "RN", Nissan: "RN", Peugeot: "PSA", Citro: "PSA", Hyundai: "HK", Kia: "HK", Ford: "FM", Mazda: "FM", Volvo: "FM", Opel: "GM", Chevrolet: "GM" };
// noms de famille ou de technique, pas des codes précis (un « XUD » couvre plusieurs moteurs différents)
const EXCLUS = new Set(["BETA", "CTDI", "CVVT", "CVVL", "FORD", "SMPI", "SRT", "TGDI", "UII", "VCDI", "XUD", "PUMA", "FED", "MZR", "MZCD", "MZI", "MCCD", "DURATEC16V", "SKYACTIVG1", "4G63MIVEC"]);
const NOM = { Citro: "Citroën", Mercedes: "Mercedes-Benz" };
const inter = (a, b) => a.filter((v) => b.includes(v));
const marquesDe = (vs) => [...new Set(vs.map((v) => v.marque).filter(Boolean).map((m) => NOM[m] ?? m))].sort();
const annee = (vt, i) => { const m = vt.match(/\((\d{4})-\s*(\d{4})?\s*\)\s*$/); return m ? (i === 0 ? m[1] : m[2] ?? "") : ""; };
const modeleDe = (vt) => vt.replace(/^(Volkswagen \(VW\)|Mercedes-Benz|Land Rover|Chevrolet \(Daewoo\)|\S+)\s+/, "").split(/\s+(?=\d)/)[0].trim(); // « Kia Sportage 2.0 CRDi » → « Sportage »

function ligne(code, variante, vs, visc) {
  const lmins = vs.map((v) => v.lmin).filter(Boolean), lmaxs = vs.map((v) => v.lmax || v.lmin).filter(Boolean);
  const lmin = lmins.length ? Math.min(...lmins) : null, lmax = lmaxs.length ? Math.max(...lmaxs) : null;
  const n = vs.length;
  return {
    code, variante, description: vs[0].vt + (n > 1 ? ` (+ ${n - 1} autre${n > 2 ? "s" : ""} version${n > 2 ? "s" : ""})` : ""),
    viscosites: visc, litres_min: lmin, litres_max: lmax, source: SOURCE, marques: marquesDe(vs),
    remarque: lmin && lmax && lmax > lmin * 1.35 ? "Quantité différente selon la voiture : vérifier sur la jauge." : null,
  };
}
// Huiles différentes selon la version : groupes de voitures qui ont au moins une huile en commun (le plus gros d'abord)
function groupes(vs) {
  const freq = new Map(); for (const v of vs) { const k = v.visc.join(","); freq.set(k, (freq.get(k) ?? 0) + 1); }
  const gs = [];
  for (const v of [...vs].sort((a, b) => freq.get(b.visc.join(",")) - freq.get(a.visc.join(",")))) {
    const g = gs.find((x) => inter(x.visc, v.visc).length);
    if (g) { g.visc = inter(g.visc, v.visc); g.vs.push(v); } else gs.push({ visc: [...v.visc], vs: [v] });
  }
  return gs;
}
function libelle(vs) { // « Sportage, i30, Tucson… (2004-2012) », « 500, Panda Euro 6 (2013-2023) »
  const noms = [...new Set(vs.map((v) => modeleDe(v.vt)))];
  const euro = ["Euro 4", "Euro 5", "Euro 6"].find((e) => vs.every((v) => v.vt.includes(e)));
  const debut = Math.min(...vs.map((v) => Number(annee(v.vt, 0)) || 9999));
  const fins = vs.map((v) => annee(v.vt, 1)); const fin = fins.some((f) => !f) ? "" : String(Math.max(...fins.map(Number)));
  return `${noms.slice(0, 3).join(", ")}${noms.length > 3 ? "…" : ""}${euro ? " " + euro : ""}${debut < 9999 ? ` (${debut}-${fin})` : ""}`;
}

async function fusion() {
  const brut = lire("brut.json", {}); const aLire = lire("a_lire.json", []);
  const marqueDe = new Map(aLire.map((t) => [String(t.ty), t.marque]));
  const sb = await client();
  const existants = new Set();
  for (let a = 0; ; a += 1000) {
    const { data, error } = await sb.from("huiles_moteurs").select("code").range(a, a + 999);
    if (error) throw error; data.forEach((r) => existants.add(r.code.toUpperCase())); if (data.length < 1000) break;
  }
  const parCode = new Map();
  for (const [ty, r] of Object.entries(brut)) {
    if (!r.code || !r.visc?.length) continue;
    for (const c of new Set(codes(r.code))) { const l = parCode.get(c) ?? []; l.push({ ...r, marque: marqueDe.get(ty) }); parCode.set(c, l); }
  }
  const dejaMarques = {}; const nouvelles = []; const e = { deja: 0, plusieurs: 0, trop: 0, ecartes: [] };
  for (const [code, vs] of parCode) {
    if (existants.has(code)) { e.deja++; dejaMarques[code] = marquesDe(vs); continue; }
    if (EXCLUS.has(code) || (code.length < 3 && !/^\d[A-Z]$/.test(code))) { e.ecartes.push(code); continue; } // « 2L » (Toyota) accepté
    if (code.length <= 2 && new Set(vs.map((v) => FAMILLE[v.marque] ?? v.marque)).size > 1) { e.ecartes.push(code + "(2 marques)"); continue; }
    const commun = vs.reduce((a, v) => inter(a, v.visc), vs[0].visc);
    if (commun.length) { nouvelles.push(ligne(code, "", vs, commun)); continue; }
    const gs = groupes(vs);
    if (gs.length > 3) { e.trop++; continue; }
    const libs = gs.map((g) => libelle(g.vs));
    gs.forEach((g, i) => nouvelles.push(ligne(code, libs.indexOf(libs[i]) === i ? libs[i] : `${libs[i]} · ${g.visc[0]}`, g.vs, g.visc)));
    e.plusieurs++;
  }
  nouvelles.sort((a, b) => a.code.localeCompare(b.code) || a.variante.localeCompare(b.variante));
  ecrire("nouvelles.json", nouvelles); ecrire("deja_marques.json", dejaMarques);
  console.log(`codes relevés ${parCode.size} · lignes nouvelles ${nouvelles.length} · déjà en base ${e.deja} · à plusieurs versions ${e.plusieurs} · trop de versions ${e.trop} · écartés ${e.ecartes.join(",")}`);
}

// ---------------------------------------------------------------- 3. ENVOI
async function client() {
  const { createClient } = await import("@supabase/supabase-js");
  const { SUPABASE_URL, SUPABASE_CLE } = await import("./cle_supabase.mjs");
  return createClient(SUPABASE_URL, SUPABASE_CLE);
}
async function envoi() {
  const sb = await client();
  const nouvelles = lire("nouvelles.json", []); const dejaM = lire("deja_marques.json", {});
  let ajout = 0;
  for (let i = 0; i < nouvelles.length; i += 500) {
    const { error, count } = await sb.from("huiles_moteurs").upsert(nouvelles.slice(i, i + 500), { onConflict: "code,variante", ignoreDuplicates: true, count: "exact" });
    if (error) throw error; ajout += count ?? 0;
  }
  let maj = 0; // lignes déjà en base sans marques : celles du relevé
  for (const [code, marques] of Object.entries(dejaM)) {
    const { data, error } = await sb.from("huiles_moteurs").update({ marques }).eq("code", code).is("marques", null).select("code");
    if (error) throw error; maj += data.length;
  }
  console.log(`lignes ajoutées ${ajout} / ${nouvelles.length} · lignes complétées (marques) ${maj}`);
}

const etape = process.argv[2];
if (etape === "collecte") await collecte();
else if (etape === "fusion") await fusion();
else if (etape === "envoi") await envoi();
else console.log("Usage : node scripts/huiles_releve.mjs collecte | fusion | envoi");
