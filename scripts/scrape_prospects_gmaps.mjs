// Robot de prospection B2B — Google Maps via l'API OFFICIELLE Google Places (New) « Text Search ».
// Légal (contrairement au scraping de la page Google Maps), quota gratuit mensuel par SKU.
// Chaque passage traite les N recherches suivantes (segment × ville), en tournant, puis
// enrichit avec l'e-mail public trouvé sur le site de l'entreprise (page d'accueil + /contact).
//
// Clé : GOOGLE_MAPS_API_KEY dans .env.local (gitignoré).
// Lancer : node scripts/scrape_prospects_gmaps.mjs [nbRequetes=30]
// Sortie : docs/prospects/gmaps/prospects_gmaps.csv (local, gitignoré) + RESUME.md + etat.json
// Budget : 30 requêtes/jour ≈ 900/mois, sous le quota gratuit « Text Search Enterprise » (vérifier
//          https://developers.google.com/maps/billing-and-pricing/pricing).
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { scoreProspect, pushProspects } from "./prospect_score.mjs";

const OUT_DIR = "docs/prospects/gmaps";
const CSV = `${OUT_DIR}/prospects_gmaps.csv`;
const STATE = `${OUT_DIR}/etat.json`;
const MAX_REQ = Number(process.argv[2] || 30);
const today = new Date().toISOString().slice(0, 10);

let KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY && existsSync(".env.local")) {
  KEY = readFileSync(".env.local", "utf8").match(/^GOOGLE_MAPS_API_KEY\s*=\s*"?([^"\r\n]+)/m)?.[1];
}
if (!KEY) {
  console.log("GOOGLE_MAPS_API_KEY absente de .env.local — robot Google Maps ignoré.");
  process.exit(0);
}

// Ordre = priorité (STRATEGIE_B2B.md) ; villes du nord d'abord
const SEGMENTS = [
  ["Magasin pièces auto / sous-grossiste", "magasin pièces auto"],
  ["Magasin pièces auto / sous-grossiste", "grossiste pièces détachées automobile"],
  ["Garage / centre de vidange", "centre vidange"],
  ["Garage / centre de vidange", "garage mécanique automobile"],
  ["Flotte livraison / logistique / transport", "société de transport de marchandises"],
  ["Flotte livraison / logistique / transport", "société de livraison"],
  ["Location de voitures", "location de voiture"],
  ["Auto-école", "auto-école"],
  ["Poids lourds (garage/vente camion)", "garage poids lourds"],
];
const VILLES = ["Tanger", "Tétouan", "M'diq", "Fnideq", "Martil", "Larache", "Ksar El Kébir", "Asilah",
  "Chefchaouen", "Al Hoceïma", "Kénitra", "Rabat", "Salé", "Casablanca", "Fès", "Meknès", "Oujda",
  "Nador", "Marrakech", "Agadir"];
const QUERIES = VILLES.flatMap((v) => SEGMENTS.map(([seg, q]) => ({ seg, ville: v, q: `${q} ${v}` })));

const FIELDS = ["id", "displayName", "formattedAddress", "nationalPhoneNumber", "internationalPhoneNumber",
  "websiteUri", "googleMapsUri", "location", "businessStatus", "primaryTypeDisplayName", "rating", "userRatingCount"]
  .map((f) => "places." + f).join(",") + ",nextPageToken";

async function searchText(textQuery, pageToken) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify({ textQuery, languageCode: "fr", regionCode: "MA", pageSize: 20, ...(pageToken && { pageToken }) }),
  });
  if (!res.ok) throw new Error(`Places API HTTP ${res.status} : ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function normPhone(raw) {
  let d = String(raw || "").replace(/[^\d+]/g, "");
  if (!d) return { tel: "", wa: "" };
  if (d.startsWith("+212")) d = d.slice(4);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 9) return { tel: String(raw), wa: "" };
  return { tel: "0" + d.replace(/(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5"), wa: /^[67]/.test(d) ? `https://wa.me/212${d}` : "" };
}

// E-mail publié sur le site de l'entreprise (générique = OK ; nominatif = donnée perso, loi 09-08)
const GENERIC = /^(contact|info|infos|commercial|commerciale|vente|ventes|sales|service|services|admin|administration|direction|accueil|bonjour|hello|support|reservation|reservations|booking|rental|location|agence|office|mail|atelier|garage|pieces|parts)[\d._-]*@/i;
const SOCIAL = /facebook\.com|instagram\.com|wa\.me|whatsapp|linktr\.ee|google\./i;
async function emailFromSite(url) {
  if (!url || SOCIAL.test(url)) return "";
  const found = new Set();
  for (const u of [url, new URL("/contact", url).href]) {
    try {
      const html = await (await fetch(u, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "FiltroPro-prospection/1.0" } })).text();
      for (const m of html.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]*[a-z]{2,}/gi)) {
        const e = m[0].toLowerCase();
        if (!/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/sentry|wixpress|example\./.test(e)) found.add(e);
      }
    } catch { /* site injoignable : on passe */ }
    if (found.size) break;
  }
  return [...found].sort((a, b) => GENERIC.test(b) - GENERIC.test(a))[0] || "";
}

// --- CSV existant (fusion par place id, conservation de premiere_vue) ---
const cols = ["score", "segment", "nom", "ville_recherche", "adresse", "telephone", "whatsapp", "email", "email_type", "site",
  "categorie_google", "note", "nb_avis", "statut", "lat", "lon", "maps", "place_id", "premiere_vue", "derniere_vue", "score_detail"];
const rows = new Map();
if (existsSync(CSV)) {
  const [head, ...lines] = readFileSync(CSV, "utf8").replace(/^﻿/, "").split("\n");
  const h = head.split(";");
  for (const l of lines) {
    const cells = l.match(/"(?:[^"]|"")*"/g)?.map((c) => c.slice(1, -1).replace(/""/g, '"')) || [];
    const r = Object.fromEntries(h.map((k, i) => [k, cells[i] ?? ""]));
    if (r.place_id) rows.set(r.place_id, r);
  }
}
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { next: 0, cycles: 0 };

// --- Passage du jour ---
let used = 0, nouveaux = 0;
while (used < MAX_REQ) {
  const { seg, ville, q } = QUERIES[state.next];
  let pageToken;
  for (let page = 0; page < 3 && used < MAX_REQ; page++) {
    const data = await searchText(q, pageToken);
    used++;
    for (const p of data.places || []) {
      const old = rows.get(p.id);
      const ph = normPhone(p.nationalPhoneNumber || p.internationalPhoneNumber);
      const email = old?.email || (await emailFromSite(p.websiteUri));
      if (!old) nouveaux++;
      rows.set(p.id, {
        segment: old?.segment || seg,
        nom: p.displayName?.text || "",
        ville_recherche: old?.ville_recherche || ville,
        adresse: p.formattedAddress || "",
        telephone: ph.tel,
        whatsapp: ph.wa,
        email,
        email_type: email ? (GENERIC.test(email) ? "générique" : "nominatif ? (09-08)") : "",
        site: p.websiteUri || "",
        categorie_google: p.primaryTypeDisplayName?.text || "",
        note: p.rating ?? "",
        nb_avis: p.userRatingCount ?? "",
        statut: p.businessStatus || "",
        lat: p.location?.latitude ?? "",
        lon: p.location?.longitude ?? "",
        maps: p.googleMapsUri || "",
        place_id: p.id,
        premiere_vue: old?.premiere_vue || today,
        derniere_vue: today,
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 2000)); // le jeton de page suivante n'est valide qu'après un court délai
  }
  console.log(`✓ ${q}`);
  state.next = (state.next + 1) % QUERIES.length;
  if (state.next === 0) state.cycles++;
}

// --- Écriture ---
mkdirSync(OUT_DIR, { recursive: true });
const all = [...rows.values()].filter((r) => r.statut !== "CLOSED_PERMANENTLY");
for (const r of all) Object.assign(r, scoreProspect({ ...r, categorie: r.categorie_google }));
all.sort((a, b) => b.score - a.score || a.ville_recherche.localeCompare(b.ville_recherche));
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
writeFileSync(CSV, "﻿" + [cols.join(";"), ...all.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n"));

// Page /prospects
await pushProspects(all.map((r) => ({
  id: "gmaps:" + r.place_id, source: "gmaps", segment: r.segment, nom: r.nom, ville: r.ville_recherche,
  adresse: r.adresse || null, telephone: r.telephone || null, whatsapp: r.whatsapp || null,
  email: r.email || null, email_type: r.email_type || null, site: r.site || null, categorie: r.categorie_google || null,
  note_google: r.note === "" ? null : +r.note, nb_avis: r.nb_avis === "" ? null : +r.nb_avis,
  lat: r.lat === "" ? null : +r.lat, lon: r.lon === "" ? null : +r.lon, maps_url: r.maps || null,
  source_url: r.maps || null, score: r.score, score_detail: r.score_detail,
  premiere_vue: r.premiere_vue, derniere_vue: r.derniere_vue,
})));
state.derniere_execution = today;
writeFileSync(STATE, JSON.stringify(state, null, 2));

const bySeg = {};
for (const r of all) {
  const s = (bySeg[r.segment] ??= { total: 0, tel: 0, wa: 0, email: 0 });
  s.total++; if (r.telephone) s.tel++; if (r.whatsapp) s.wa++; if (r.email) s.email++;
}
let md = `# Prospects Google Maps — résumé\n\n> Mis à jour le ${today} par \`scripts/scrape_prospects_gmaps.mjs\` (API Google Places officielle). Contacts : \`prospects_gmaps.csv\` (local, non publié).\n> Progression : recherche ${state.next}/${QUERIES.length} (cycle ${state.cycles + 1}). À vérifier avant démarchage ; e-mails « nominatif ? » = pas d'envoi en masse (loi 09-08).\n\n`;
md += `| Segment | Entreprises | Téléphone | WhatsApp | E-mail |\n|---|---|---|---|---|\n`;
for (const [seg, s] of Object.entries(bySeg)) md += `| ${seg} | ${s.total} | ${s.tel} | ${s.wa} | ${s.email} |\n`;
md += `\n**Total : ${all.length} · nouveaux aujourd'hui : ${nouveaux} · requêtes API utilisées : ${used}.**\n`;
writeFileSync(`${OUT_DIR}/RESUME.md`, md);
console.log(md);
