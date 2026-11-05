// Robot de prospection B2B — OpenStreetMap (API Overpass, licence ODbL = réutilisation légale).
// Collecte les entreprises marocaines susceptibles d'acheter filtres + huile :
// magasins de pièces, garages/vidange, flottes (livraison/logistique), location,
// auto-écoles, poids lourds, stations-service, pneus, lavages.
// Uniquement les données publiées dans OSM — rien n'est inventé ; champ vide = inconnu.
//
// Lancer : node scripts/scrape_prospects_osm.mjs
// Sortie  : docs/prospects/osm/prospects_osm.csv (local, gitignoré) + RESUME.md
// Quotidien : tâche Windows « FiltroPro-Prospection » -> scripts/prospects_quotidien.cmd (colonne premiere_vue = nouveaux)
// Note    : Google Maps / DirectInfo / Charika ne sont PAS scrapés (CGU) — compléter à la main.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const UA = "FiltroPro-prospection/1.0";
const OUT_DIR = "docs/prospects/osm";
const CSV = `${OUT_DIR}/prospects_osm.csv`; // gitignoré (dépôt public = pas de contacts sur GitHub)
const today = new Date().toISOString().slice(0, 10);

// Passage quotidien : on garde la date de première détection de chaque point
const firstSeen = new Map();
if (existsSync(CSV)) {
  const [head, ...lines] = readFileSync(CSV, "utf8").replace(/^﻿/, "").split("\n");
  const h = head.split(";");
  const iSrc = h.indexOf("source"), iFs = h.indexOf("premiere_vue");
  for (const l of lines) {
    const cells = l.match(/"(?:[^"]|"")*"/g)?.map((c) => c.slice(1, -1).replace(/""/g, '"')) || [];
    if (cells[iSrc]) firstSeen.set(cells[iSrc], iFs >= 0 && cells[iFs] ? cells[iFs] : today);
  }
}

// Segment -> filtres OSM (ordre = priorité commerciale validée avec ChatGPT le 05/11/2026)
const SEGMENTS = [
  { key: "1-pieces", label: "Magasin pièces auto / sous-grossiste", tags: ['["shop"="car_parts"]', '["shop"="motorcycle_parts"]'] },
  { key: "2-garage", label: "Garage / centre de vidange", tags: ['["shop"="car_repair"]', '["craft"="car_repair"]', '["service:vehicle:oil_change"="yes"]'] },
  { key: "3-flotte", label: "Flotte livraison / logistique / transport", tags: ['["office"="logistics"]', '["office"="moving_company"]', '["office"="courier"]', '["amenity"="bus_station"]["operator"]'] },
  { key: "4-location", label: "Location de voitures", tags: ['["amenity"="car_rental"]'] },
  { key: "5-autoecole", label: "Auto-école", tags: ['["amenity"="driving_school"]', '["shop"="driving_school"]'] },
  { key: "6-poidslourd", label: "Poids lourds (garage/vente camion)", tags: ['["shop"="truck"]', '["shop"="truck_repair"]', '["craft"="truck_repair"]'] },
  { key: "7-station", label: "Station-service", tags: ['["amenity"="fuel"]'] },
  { key: "8-pneus", label: "Pneus", tags: ['["shop"="tyres"]'] },
  { key: "9-lavage", label: "Lavage auto", tags: ['["amenity"="car_wash"]'] },
];

async function overpass(query) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });
    if (res.ok) return (await res.json()).elements;
    console.warn(`Overpass HTTP ${res.status} (essai ${attempt})`);
    await new Promise((r) => setTimeout(r, 15000 * attempt));
  }
  throw new Error("Overpass indisponible");
}

const AREA = 'area["ISO3166-1"="MA"][admin_level=2]->.ma;';

// Villes/bourgs pour rattacher chaque point à la ville la plus proche
console.log("Villes…");
const places = (await overpass(`[out:json][timeout:120];${AREA}node["place"~"^(city|town)$"](area.ma);out tags center;`))
  .filter((p) => p.tags?.name)
  .map((p) => ({ name: p.tags["name:fr"] || p.tags.name, lat: p.lat, lon: p.lon }));

function nearestCity(lat, lon) {
  let best = null, bd = Infinity;
  for (const p of places) {
    const d = (p.lat - lat) ** 2 + ((p.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best ? best.name : "";
}

// Normalise un numéro marocain -> "+212 6 xx xx xx xx" ; renvoie aussi le lien WhatsApp si mobile
function normPhone(raw) {
  const out = [];
  for (const part of String(raw || "").split(/[;,/]| ou /)) {
    let d = part.replace(/[^\d+]/g, "");
    if (!d) continue;
    if (d.startsWith("+212")) d = d.slice(4);
    else if (d.startsWith("00212")) d = d.slice(5);
    else if (d.startsWith("212") && d.length === 12) d = d.slice(3);
    if (d.startsWith("0")) d = d.slice(1);
    if (d.length !== 9) { out.push({ tel: part.trim(), wa: "" }); continue; }
    out.push({ tel: "0" + d.replace(/(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5"), wa: /^[67]/.test(d) ? `https://wa.me/212${d}` : "" });
  }
  return out;
}

// E-mail générique (contact@, info@…) = OK ; nominatif = donnée perso (loi 09-08) -> à manier avec prudence
const GENERIC = /^(contact|info|infos|commercial|commerciale|vente|ventes|sales|service|services|admin|administration|direction|accueil|bonjour|hello|support|reservation|reservations|booking|rental|location|agence|office|mail|atelier|garage|pieces|parts)[\d._-]*@/i;

const seen = new Set();
const rows = [];
for (const seg of SEGMENTS) {
  console.log(`Segment ${seg.label}…`);
  const body = seg.tags.map((t) => `nwr${t}(area.ma);`).join("");
  const els = await overpass(`[out:json][timeout:180];${AREA}(${body});out tags center;`);
  for (const e of els) {
    const id = `${e.type}/${e.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const t = e.tags || {};
    const name = t.name || t["name:fr"] || t["name:ar"] || t.brand || t.operator || "";
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    const phones = normPhone([t.phone, t["contact:phone"], t["contact:mobile"], t.mobile, t["contact:whatsapp"]].filter(Boolean).join(";"));
    const email = t.email || t["contact:email"] || "";
    rows.push({
      segment: seg.label,
      nom: name,
      nom_ar: t["name:ar"] && t["name:ar"] !== name ? t["name:ar"] : "",
      marque_reseau: t.brand || "",
      ville: t["addr:city"] || nearestCity(lat, lon),
      adresse: [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] || t["addr:district"], t["addr:postcode"]].filter(Boolean).join(" "),
      telephone: [...new Set(phones.map((p) => p.tel))].join(" / "),
      whatsapp: phones.find((p) => p.wa)?.wa || "",
      email,
      email_type: email ? (GENERIC.test(email) ? "générique" : "nominatif ? (09-08)") : "",
      site: t.website || t["contact:website"] || "",
      facebook: t["contact:facebook"] || t.facebook || "",
      horaires: t.opening_hours || "",
      lat: lat?.toFixed(6) ?? "",
      lon: lon?.toFixed(6) ?? "",
      maps: lat != null ? `https://www.google.com/maps?q=${lat},${lon}` : "",
      source: `https://www.openstreetmap.org/${id}`,
      premiere_vue: firstSeen.get(`https://www.openstreetmap.org/${id}`) || today,
    });
  }
  await new Promise((r) => setTimeout(r, 5000)); // politesse envers le serveur public
}

// Tri : segment, puis ceux qui ont un contact en premier, puis ville
const score = (r) => (r.telephone ? 2 : 0) + (r.email ? 1 : 0);
rows.sort((a, b) => a.segment.localeCompare(b.segment) || score(b) - score(a) || a.ville.localeCompare(b.ville));

mkdirSync(OUT_DIR, { recursive: true });
const cols = Object.keys(rows[0]);
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
writeFileSync(CSV, "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n"));

// Résumé par segment et par ville
const bySeg = {};
for (const r of rows) {
  const s = (bySeg[r.segment] ??= { total: 0, nomme: 0, tel: 0, wa: 0, email: 0, villes: {} });
  s.total++; if (r.nom) s.nomme++; if (r.telephone) s.tel++; if (r.whatsapp) s.wa++; if (r.email) s.email++;
  s.villes[r.ville] = (s.villes[r.ville] || 0) + 1;
}
let md = `# Prospects OSM — résumé\n\n> Généré le ${today} par \`scripts/scrape_prospects_osm.mjs\` (OpenStreetMap, ODbL). Fichier complet : [prospects_osm.csv](prospects_osm.csv) (ouvrable dans Excel, séparateur « ; »).\n> Données telles que publiées dans OSM : à **vérifier** avant démarchage. Les e-mails « nominatif ? » sont des données personnelles (loi 09-08) : pas d'envoi en masse.\n\n`;
md += `| Segment | Points | Avec nom | Téléphone | WhatsApp | E-mail | Top villes |\n|---|---|---|---|---|---|---|\n`;
for (const [seg, s] of Object.entries(bySeg)) {
  const top = Object.entries(s.villes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, n]) => `${v} (${n})`).join(", ");
  md += `| ${seg} | ${s.total} | ${s.nomme} | ${s.tel} | ${s.wa} | ${s.email} | ${top} |\n`;
}
md += `\n**Total : ${rows.length} points · ${rows.filter((r) => r.telephone).length} avec téléphone · ${rows.filter((r) => r.email).length} avec e-mail.**\n`;
const nouveaux = firstSeen.size ? rows.filter((r) => !firstSeen.has(r.source)) : [];
md += `\n**Nouveaux depuis le dernier passage : ${nouveaux.length}** (${nouveaux.filter((r) => r.telephone).length} avec téléphone) — colonne \`premiere_vue\` = ${today} dans le CSV.\n`;
writeFileSync(`${OUT_DIR}/RESUME.md`, md);
console.log(md);
