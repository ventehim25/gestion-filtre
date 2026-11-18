// Ajouter à une fiche une liste d'équivalences donnée par l'utilisateur (capture d'un catalogue : « BREMBO : P85126… »).
//   node scripts/ajouter_equivalences.mjs <réf. de la fiche ou d'une de ses équivalences> <liste.json> [--ecrire]
// liste.json = { "BREMBO": ["P85126", …], "LPR": ["05P2067"], … } — recopié tel quel, rien d'inventé.
// Les marques connues de l'appli gardent leur nom (Bosch, TRW, Brembo…) ; les marques de freinage absentes sont
// ajoutées au métier de la pièce (réglage « marques_filtres ») pour devenir de vraies variantes (prix / stock à la réception).
// Sans --ecrire : essai à blanc (montre ce qui serait ajouté). Jamais de doublon (même réf. sans espaces sur la fiche).
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const [refFiche, fichier] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ECRIRE = process.argv.includes("--ecrire");
if (!refFiche || !fichier) { console.log("node scripts/ajouter_equivalences.mjs <réf> <liste.json> [--ecrire]"); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_CLE);
const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const rx = (q) => "^" + norm(q).split("").join("[^a-zA-Z0-9]*") + "$";

// Noms des marques dans l'appli (src/lib/brands.ts) ; le reste : nom propre (« ROADHOUSE » → « Roadhouse »)
const NOMS = {
  BOSCH: "Bosch", TRW: "TRW", BREMBO: "Brembo", FERODO: "Ferodo", ATE: "ATE", TEXTAR: "Textar", JURID: "Jurid", VALEO: "Valeo",
  DELPHI: "Delphi", MINTEX: "Mintex", BENDIX: "Bendix", ICER: "ICER", LPR: "Lpr", METELLI: "Metelli", "FEBI BILSTEIN": "Febi", FEBI: "Febi",
  "BLUE PRINT": "Blue Print", SBS: "SBS", APEC: "Apec", GIRLING: "Girling", HELLA: "Hella", PAGID: "Pagid", RAICAM: "Raicam",
  REMSA: "Remsa", ROADHOUSE: "Roadhouse", TRUSTING: "Trusting", WVA: "WVA",
};
const nomApp = (m) => NOMS[m.trim().toUpperCase()] ?? m.trim().toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());

// 1) La fiche : par sa référence, sinon par une de ses équivalences
let fiche = (await sb.from("products").select("id, reference, marque, categorie").filter("reference", "imatch", rx(refFiche)).limit(2)).data?.[0];
if (!fiche) {
  const e = (await sb.from("equivalences").select("product_id, marque, reference").filter("reference", "imatch", rx(refFiche)).limit(5)).data ?? [];
  const ids = [...new Set(e.map((x) => x.product_id))];
  if (ids.length > 1) { console.log("Plusieurs fiches ont cette référence :", e); process.exit(1); }
  if (ids.length) fiche = (await sb.from("products").select("id, reference, marque, categorie").eq("id", ids[0]).single()).data;
}
if (!fiche) { console.log("Fiche introuvable pour", refFiche); process.exit(1); }
const metier = ["plaquette_frein", "disque_frein", "machoire_frein", "tambour_frein", "kit_frein"].includes(fiche.categorie) ? "freinage" : null;
console.log(`Fiche : ${fiche.marque ?? ""} ${fiche.reference} (${fiche.categorie})`);

// 2) Ce qui existe déjà sur la fiche
const deja = new Set(((await sb.from("equivalences").select("reference").eq("product_id", fiche.id)).data ?? []).map((e) => norm(e.reference)));
const liste = JSON.parse(readFileSync(fichier, "utf8"));
const aAjouter = [];
for (const [marque, refs] of Object.entries(liste)) for (const r of refs) {
  const ref = String(r).trim();
  if (!ref || deja.has(norm(ref)) || norm(ref) === norm(fiche.reference)) continue;
  deja.add(norm(ref));
  aAjouter.push({ product_id: fiche.id, marque: nomApp(marque), reference: ref, stock: 0 });
}
console.log(`${aAjouter.length} à ajouter :`, aAjouter.map((e) => `${e.marque} ${e.reference}`).join(", "));

// 3) Marques absentes de la liste de l'appli → ajoutées au métier (comme « ➕ Nouvelle marque… »)
const { data: reg } = await sb.from("reglages").select("valeur").eq("cle", "marques_filtres").maybeSingle();
const stockees = Array.isArray(reg?.valeur) ? reg.valeur.map((x) => (typeof x === "string" ? { nom: x, metiers: [] } : x)) : [];
const DEPART = readFileSync(new URL("../src/lib/brands.ts", import.meta.url), "utf8");
const connues = (m) => new RegExp(`"${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i").test(DEPART);
const nouvelles = [];
for (const m of [...new Set(aAjouter.map((e) => e.marque))]) {
  if (m === "WVA" || connues(m)) continue;
  const e = stockees.find((a) => a.nom.toLowerCase() === m.toLowerCase());
  if (e && (e.metiers.length === 0 || !metier || e.metiers.includes(metier))) continue;
  if (e) e.metiers.push(metier); else stockees.push({ nom: m, metiers: metier ? [metier] : [] });
  nouvelles.push(m);
}
console.log("Marques ajoutées à la liste" + (metier ? ` (${metier})` : "") + " :", nouvelles.join(", ") || "aucune");

if (!ECRIRE) { console.log("Essai à blanc : ajoute --ecrire pour enregistrer."); process.exit(0); }
if (nouvelles.length) {
  const { error } = await sb.from("reglages").upsert({ cle: "marques_filtres", valeur: stockees }, { onConflict: "cle" });
  if (error) throw error;
}
if (aAjouter.length) {
  const { error } = await sb.from("equivalences").insert(aAjouter);
  if (error) throw error;
}
const { count } = await sb.from("equivalences").select("id", { count: "exact", head: true }).eq("product_id", fiche.id);
console.log(`Enregistré ✓ — la fiche ${fiche.reference} a maintenant ${count} équivalences.`);
