// Génère des catalogues PDF FiltroPro "brochure pro" : un PDF par type de filtre
// (voitures), avec couverture photo, page d'intro marketing et grille produits.
// + un catalogue Bus & Camions combiné. Sans prix.
//
// PRÉREQUIS (outil local uniquement, volontairement HORS package.json) :
//   npm i -D puppeteer
// Lancement :  node scripts/generate_catalogue.mjs
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, ".catalog_imgs");
const HTML_PATH = path.join(__dirname, ".catalogue.html");
const OUT_DIR = path.join(__dirname, "..", "public");

const supabase = createClient(
  "https://wehsvgoolozqzxsgwibb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaHN2Z29vbG96cXp4c2d3aWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTA3NzYsImV4cCI6MjA5NTgyNjc3Nn0.8z624yNoX-CQirJM5VQvYyMdeOCj5jau_0BvTaMKj1c"
);

// --- Métadonnées par type (label, icône, photo de couverture, pitch marketing) ---
const TYPES = {
  filtre_huile: {
    label: "Filtres à Huile", icon: "🛢️", hero: "photo-1486262715619-67b85e0b08d3",
    pitch: "Le filtre à huile retient les impuretés et les particules métalliques en suspension dans l'huile moteur. Il protège les pièces mobiles et prolonge la durée de vie du moteur. À remplacer à chaque vidange.",
  },
  filtre_air: {
    label: "Filtres à Air", icon: "💨", hero: "photo-1486006920555-c77dcf18193c",
    pitch: "Un air propre, c'est une combustion optimale : plus de puissance, moins de consommation et un moteur préservé. Le filtre à air bloque poussières et impuretés avant l'admission.",
  },
  filtre_carburant: {
    label: "Filtres à Carburant", icon: "⛽", hero: "photo-1530046339160-ce3e530c7d2f",
    pitch: "Le filtre à carburant élimine les impuretés et l'eau présentes dans le carburant pour protéger le système d'injection. Indispensable aux moteurs diesel et essence modernes.",
  },
  filtre_habitacle: {
    label: "Filtres d'Habitacle", icon: "❄️", hero: "photo-1600880292089-90a7e086ee0c",
    pitch: "Pollen, poussières fines et mauvaises odeurs : le filtre d'habitacle purifie l'air de la cabine pour le confort et la santé de tous les passagers. À changer une fois par an.",
  },
};
// Coordonnées commerce (affichées sur couverture + pied de page)
const TEL_DISPLAY = "06 02 35 02 90";
const WA_DISPLAY = "+212 602-350290";
const SLOGAN = "Votre spécialiste du filtre auto au Maroc";

const CAT_ORDER = ["filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle", "filtre_refroidissement", "autre"];
const CAT_LABEL = {
  filtre_huile: "Filtres à huile", filtre_air: "Filtres à air", filtre_carburant: "Filtres à carburant",
  filtre_habitacle: "Filtres d'habitacle", filtre_refroidissement: "Filtres de refroidissement", autre: "Autres filtres",
};
const CAT_ICON = { filtre_huile: "🛢️", filtre_air: "💨", filtre_carburant: "⛽", filtre_habitacle: "❄️", filtre_refroidissement: "🌡️", autre: "🔧" };

// Classement voiture / bus-camion (cf. src/lib/vehicleType.ts — garder synchro)
const CAMION_PREFIXES = new Set(["OM", "OR", "OT", "AM", "AD", "AE", "AG", "PK"]);
const EXCLUDE_PREFIXES = new Set(["CW", "UE"]); // filtres "autre" non pertinents
const HEAVY_KEYWORDS = [
  "TRUCK", "BUS", "TRACTOR", "TRACTEUR", "DENNIS", "DEUTZ", "ERF", "SCANIA",
  "IVECO", "DAF", "KAMAZ", "LIEBHERR", "CASE-IH", "CASE IH", "NEW HOLLAND",
  "CLAAS", "FENDT", "JOHN DEERE", "MASSEY", "VALTRA", "ZETOR", "URSUS", "LANDINI",
  "JELCZ", "AUTOSAN", "KRAZ", "MAZ", "URAL", "TATRA", "LIAZ", "AVIA", "MULTICAR",
  "MANITOU", "MAGNI", "EVOBUS", "SETRA", "NEOPLAN", "SOLARIS", "VAN HOOL",
  "IRISBUS", "VDL", "BOVA", "BREDA", "MENARINI", "BELL EQUIPMENT", "JCB",
  "CATERPILLAR", "KOMATSU", "TEREX", "BOMAG", "DOOSAN", "KUBOTA", "YANMAR",
  "STEYR", "TEMSA", "OTOKAR", "BUMAR", "AGRIFULL", "ANTONIO CARRARO", "AKERMAN",
  "ANDORIA", "HANOMAG", "ASHOK LEYLAND", "AUWAERTER", "BUESSING", "AGRIA",
  "AEBI", "AMMANN", "BAUTZ",
];
const refPrefix = (r) => (r.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
const isHeavyMake = (m) => { const u = (m || "").toUpperCase(); return HEAVY_KEYWORDS.some((k) => u.includes(k)); };
function pmIsCamion(r) {
  const m = r.toUpperCase().match(/^PM\s*(\d+)(?:\/(\d+))?/);
  if (!m) return false;
  const num = +m[1], variant = m[2] ? +m[2] : 0;
  return num >= 800 && (num < 815 || (num === 815 && variant === 0));
}
function classifyKind(reference, makes) {
  if (CAMION_PREFIXES.has(refPrefix(reference))) return "camion";
  if (pmIsCamion(reference)) return "camion";
  if (makes && makes.length) {
    const heavy = makes.filter(isHeavyMake).length;
    if (heavy > 0 && heavy >= makes.length - heavy) return "camion";
  }
  return "voiture";
}

function refCompare(a, b) {
  const parse = (r) => {
    const m = r.toUpperCase().match(/^([A-Z]+)\s*(\d+)(?:\/(\d+))?(.*)$/);
    return m ? [m[1], parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : 0, m[4] || ""] : [r.toUpperCase(), 0, 0, ""];
  };
  const ka = parse(a), kb = parse(b);
  return ka[0].localeCompare(kb[0]) || ka[1] - kb[1] || ka[2] - kb[2] || ka[3].localeCompare(kb[3]);
}

async function loadAll(table, cols) {
  const out = [];
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.from(table).select(cols).range(i * 1000, i * 1000 + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function fetchToFile(url, dest) {
  if (fs.existsSync(dest)) return true;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    return true;
  } catch { return false; }
}

async function downloadThumbs(products, concurrency = 12) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
  const todo = products.filter((p) => p.image_url && !fs.existsSync(path.join(IMG_DIR, p.id + ".jpg")));
  console.log(`>>> ${todo.length} vignettes à télécharger (${products.length - todo.length} déjà en cache)`);
  let i = 0, ok = 0, fail = 0;
  async function worker() {
    while (i < todo.length) {
      const p = todo[i++];
      const got = await fetchToFile(`${p.image_url}?wid=260&fmt=jpeg&qlt=82&bgc=ffffff`, path.join(IMG_DIR, p.id + ".jpg"));
      got ? ok++ : fail++;
      if ((ok + fail) % 100 === 0) console.log(`   ...${ok + fail}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`>>> Vignettes prêtes (ok:${ok} fail:${fail})`);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const LOGO_SVG = `<svg width="72" height="72" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
    <stop stop-color="#f43f5e"/><stop offset="0.6" stop-color="#dc2626"/><stop offset="1" stop-color="#7f1d1d"/>
  </linearGradient></defs>
  <path d="M24 2.5 41.55 12.75 V33.25 L24 43.5 6.45 33.25 V12.75 Z" fill="url(#g)" stroke="#000" stroke-opacity="0.12" stroke-width="1"/>
  <g stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none">
    <path d="M13 18 C 19.5 13.5, 28.5 13.5, 35 18"/><path d="M13 24 C 19.5 19.5, 28.5 19.5, 35 24"/><path d="M13 30 C 19.5 25.5, 28.5 25.5, 35 30"/>
  </g><circle cx="35" cy="18" r="2.1" fill="#fff"/></svg>`;
const LOGO_DATAURI = "data:image/svg+xml;base64," + Buffer.from(LOGO_SVG).toString("base64");

function card(p, makes) {
  const hasImg = p.image_url && fs.existsSync(path.join(IMG_DIR, p.id + ".jpg"));
  const img = hasImg
    ? `<img src=".catalog_imgs/${p.id}.jpg" alt="${esc(p.reference)}"/>`
    : `<div class="noimg"><div class="nosign">🚫</div><span>Photo non disponible</span></div>`;
  const m = makes && makes.length
    ? `<div class="makes">${esc(makes.slice(0, 4).join(" · "))}${makes.length > 4 ? " +" + (makes.length - 4) : ""}</div>` : "";
  return `<div class="card"><div class="ph">${img}</div><div class="ref">${esc(p.reference)}</div>${m}</div>`;
}

const STYLE = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; color: #1f2937; }
  /* Couverture */
  .cover { position: relative; height: 297mm; color: #fff;
    background: linear-gradient(162deg, #0a0a0c 0%, #2a0808 58%, #7f1d1d 125%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; page-break-after: always; overflow: hidden; }
  .cover .c { position: relative; z-index: 1; padding: 0 22mm; }
  .cover .brand { font-size: 30px; font-weight: 800; letter-spacing: 1px; margin-top: 12px; }
  .cover .brand b { color: #f43f5e; }
  .cover .tag { letter-spacing: 6px; font-size: 11px; color: #cbd5e1; margin-top: 4px; text-transform: uppercase; }
  .cover .line { width: 64px; height: 3px; background: #dc2626; margin: 20px auto; border-radius: 3px; }
  .cover .picto { width: 60px; height: 60px; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.95; margin: 4px 0 6px; }
  .cover .icon { font-size: 56px; margin: 4px 0 6px; }
  .cover h1 { font-size: 38px; font-weight: 800; margin: 4px 0; line-height: 1.05; }
  .cover .sub { color: #f0c7c7; font-size: 14px; max-width: 360px; margin: 8px auto 0; }
  .cover .photo { width: 152mm; margin: 28px auto 0; border-radius: 14px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 12px 34px rgba(0,0,0,0.55); }
  .cover .pmontage { display: grid; grid-template-columns: repeat(5, 1fr); background: #fff; }
  .cover .pmontage > div { padding-top: 100%; background-size: contain; background-repeat: no-repeat;
    background-position: center; background-color: #fff; border: 1px solid #f1f1f1; }
  .cover .contact { position: relative; z-index: 1; margin-top: 22px; font-size: 13px; color: #fff;
    background: rgba(220,38,38,0.20); border: 1px solid rgba(244,63,94,0.55); border-radius: 999px; padding: 9px 20px; display: inline-block; }
  .cover .contact b { color: #fecaca; font-weight: 600; }
  .cover .meta { position: absolute; bottom: 16mm; left: 0; right: 0; color: #94a3b8; font-size: 12px; z-index: 1; }
  /* Intro marketing */
  .intro { padding: 24mm 20mm; page-break-after: always; }
  .intro .kicker { color: #dc2626; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-size: 12px; }
  .intro h2 { font-size: 26px; margin: 6px 0 14px; color: #111827; }
  .intro .pitch { font-size: 15px; color: #374151; line-height: 1.75; max-width: 560px; }
  .intro .band { margin: 22px 0; height: 120px; border-radius: 14px; overflow: hidden;
    display: grid; grid-template-columns: repeat(8, 1fr); border: 1px solid #e5e7eb; }
  .intro .band > div { background-size: cover; background-position: center; background-color: #fff; }
  .benefits { display: flex; gap: 12px; }
  .benefit { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 12px; text-align: center; }
  .benefit .bi { font-size: 22px; }
  .benefit .bt { font-weight: 700; font-size: 13px; margin-top: 6px; color: #111827; }
  .benefit .bd { font-size: 11px; color: #6b7280; margin-top: 3px; line-height: 1.3; }
  /* Sommaire (bus-camion multi-sections) */
  .toc { padding: 24mm 20mm; page-break-after: always; }
  .toc h2 { font-size: 22px; border-bottom: 3px solid #dc2626; padding-bottom: 8px; }
  .tocrow { display: flex; align-items: baseline; gap: 8px; margin: 13px 0; font-size: 15px; }
  .tocrow .dots { flex: 1; border-bottom: 2px dotted #cbd5e1; }
  /* Chapitres / grille */
  .chapter { page-break-before: always; padding: 0 8mm; }
  .chapter.first { page-break-before: avoid; }
  .chead { display: flex; align-items: center; gap: 14px; padding: 13px 16px; margin-bottom: 12px;
    background: linear-gradient(90deg, #111111, #7f1d1d); color: #fff; border-radius: 10px; }
  .chead .cicon { font-size: 28px; }
  .chead h2 { margin: 0; font-size: 19px; }
  .chead p { margin: 2px 0 0; font-size: 12px; color: #f0c7c7; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .card { border: 1px solid #e5e7eb; border-top: 3px solid #dc2626; border-radius: 8px; padding: 7px 6px;
    text-align: center; page-break-inside: avoid; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  .card .ph { height: 92px; display: flex; align-items: center; justify-content: center; background: #fff; }
  .card img { max-height: 92px; max-width: 100%; object-fit: contain; }
  .card .noimg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; height: 92px; }
  .card .noimg .nosign { font-size: 30px; line-height: 1; }
  .card .noimg span { font-size: 7.5px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
  .card .ref { font-family: 'Consolas', monospace; font-weight: 700; font-size: 12px; margin-top: 5px; color: #111; }
  .card .makes { font-size: 8.5px; color: #6b7280; margin-top: 2px; line-height: 1.2;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
`;

const today = () => new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" });

// Sélectionne n photos de filtres (cache) réparties dans la liste, pour la mosaïque
function pickImgs(products, n) {
  const imgs = products
    .filter((p) => p.image_url && fs.existsSync(path.join(IMG_DIR, p.id + ".jpg")))
    .map((p) => `.catalog_imgs/${p.id}.jpg`);
  if (!imgs.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) out.push(imgs[(i * 13) % imgs.length]);
  return out;
}
function montage(imgs, cls) {
  return `<div class="${cls}">${imgs.map((s) => `<div style="background-image:url('${s}')"></div>`).join("")}</div>`;
}

// Couverture commune : fond dégradé sombre + emoji type + mosaïque ORIGINALE
// (nos propres photos produits) encadrée — contenu maison, pas d'image copiée.
function coverHtml({ icon, title, sub, count, coverImgs }) {
  const ic = icon ? `<div class="icon">${icon}</div>` : "";
  const photo = coverImgs && coverImgs.length ? `<div class="photo">${montage(coverImgs, "pmontage")}</div>` : "";
  return `<div class="cover">
    <div class="c">${LOGO_SVG}
      <div class="brand">Filtro<b>Pro</b></div>
      <div class="tag">Pièces Auto · Maroc</div>
      <div class="line"></div>
      ${ic}
      <h1>${esc(title)}</h1>
      <div class="sub">${esc(sub)}</div>
      ${photo}
      <div class="contact">📞 <b>${TEL_DISPLAY}</b>&nbsp;&nbsp;·&nbsp;&nbsp;💬 WhatsApp <b>${WA_DISPLAY}</b></div>
    </div>
    <div class="meta">${count} références · ${today()}</div></div>`;
}

// Page d'intro marketing (réutilisée par tous les catalogues par type)
function introHtml(cat, count, stripImgs) {
  const t = TYPES[cat];
  const band = stripImgs && stripImgs.length ? montage(stripImgs, "band") : "";
  return `<div class="intro">
    <div class="kicker">${t.icon} ${CAT_LABEL[cat]}</div>
    <h2>Pourquoi c'est essentiel ?</h2>
    <p class="pitch">${esc(t.pitch)}</p>
    ${band}
    <div class="benefits">
      <div class="benefit"><div class="bi">✓</div><div class="bt">Qualité d'origine</div><div class="bd">Références Filtron / MANN+HUMMEL</div></div>
      <div class="benefit"><div class="bi">🚗</div><div class="bt">Large compatibilité</div><div class="bd">${count} références voitures</div></div>
      <div class="benefit"><div class="bi">📍</div><div class="bt">Disponible au Maroc</div><div class="bd">Tél ${TEL_DISPLAY}</div></div>
    </div>
  </div>`;
}

// Catalogue d'UN type (voitures) : couverture + intro marketing + grille
function buildTypeHtml(cat, products, vehMap) {
  const t = TYPES[cat];
  const list = [...products].sort((a, b) => refCompare(a.reference, b.reference));
  const cards = list.map((p) => card(p, vehMap[p.id]?.makes)).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>
    ${coverHtml({ icon: t.icon, title: t.label, sub: "Catalogue voitures · " + CAT_LABEL[cat].toLowerCase(), count: list.length, coverImgs: pickImgs(products, 15) })}
    ${introHtml(cat, list.length, pickImgs(products, 8))}
    <div class="chapter first">
      <div class="chead"><div class="cicon">${t.icon}</div><div><h2>${CAT_LABEL[cat]}</h2><p>${list.length} références disponibles</p></div></div>
      <div class="grid">${cards}</div>
    </div>
  </body></html>`;
}

// Titres des séries de filtres à huile (sous-sections)
const OIL_TITLES = {
  OP: "Filtres à huile vissables — série OP",
  OE: "Filtres à huile cartouche — série OE",
  OC: "Filtres à huile — série OC",
};

// Catalogue Huile : filtré (sans OK651/4-2X, sans réfs finissant par A, uniquement
// celles ayant un type véhicule) et découpé en sous-sections titrées par série (OP en tête).
function buildOilHtml(products, vehMap) {
  const cat = "filtre_huile";
  const t = TYPES[cat];
  const list = products.filter((p) =>
    p.reference.toUpperCase() !== "OK651/4-2X" &&
    !/A$/i.test(p.reference) &&
    (vehMap[p.id]?.makes?.length > 0)
  );
  const byPre = {};
  for (const p of list) (byPre[refPrefix(p.reference)] ??= []).push(p);
  const order = ["OP", "OE", "OC", "OH", "OK"].filter((x) => byPre[x]);
  for (const k of Object.keys(byPre)) if (!order.includes(k)) order.push(k);

  const sections = order.map((pre, i) => {
    const items = byPre[pre].sort((a, b) => refCompare(a.reference, b.reference));
    const title = OIL_TITLES[pre] || `Filtres à huile — série ${pre}`;
    const cards = items.map((p) => card(p, vehMap[p.id]?.makes)).join("");
    return `<div class="chapter${i === 0 ? " first" : ""}"><div class="chead"><div class="cicon">${t.icon}</div>
      <div><h2>${title}</h2><p>${items.length} références</p></div></div>
      <div class="grid">${cards}</div></div>`;
  }).join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>
    ${coverHtml({ icon: t.icon, title: t.label, sub: "Catalogue voitures · filtres à huile", count: list.length, coverImgs: pickImgs(list, 15) })}
    ${introHtml(cat, list.length, pickImgs(list, 8))}
    ${sections}
  </body></html>`;
}

// Catalogue multi-sections (bus-camion) : couverture + sommaire + chapitres
function buildMultiHtml({ title, sub }, byCat, vehMap) {
  const cats = CAT_ORDER.filter((c) => byCat[c] && byCat[c].length);
  const total = cats.reduce((s, c) => s + byCat[c].length, 0);
  const toc = cats.map((c) => `<div class="tocrow"><span>${CAT_ICON[c]} ${CAT_LABEL[c]}</span><span class="dots"></span><span>${byCat[c].length} réf.</span></div>`).join("");
  const chapters = cats.map((c) => {
    const cards = byCat[c].map((p) => card(p, vehMap[p.id]?.makes)).join("");
    return `<div class="chapter"><div class="chead"><div class="cicon">${CAT_ICON[c]}</div>
      <div><h2>${CAT_LABEL[c]}</h2><p>${byCat[c].length} références disponibles</p></div></div>
      <div class="grid">${cards}</div></div>`;
  }).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>
    ${coverHtml({ icon: "🚚", title, sub, count: total, coverImgs: pickImgs(cats.flatMap((c) => byCat[c]), 15) })}
    <div class="toc"><h2>Sommaire</h2>${toc}</div>
    ${chapters}</body></html>`;
}

async function renderPdf(browser, html, outFile) {
  fs.writeFileSync(HTML_PATH, html);
  const page = await browser.newPage();
  await page.goto("file://" + HTML_PATH.replace(/\\/g, "/"), { waitUntil: "networkidle0", timeout: 180000 });
  const out = path.join(OUT_DIR, outFile);
  await page.pdf({
    path: out, format: "A4", printBackground: true,
    margin: { top: "12mm", bottom: "15mm", left: "8mm", right: "8mm" },
    displayHeaderFooter: true, headerTemplate: "<div></div>",
    footerTemplate: `<div style="width:100%;font-size:8px;color:#9ca3af;padding:0 12mm;display:flex;align-items:center;justify-content:space-between;">
      <span style="display:flex;align-items:center;gap:5px;"><img src="${LOGO_DATAURI}" style="height:12px;width:12px;"/><b style="color:#dc2626;">FiltroPro</b> &nbsp;·&nbsp; ${SLOGAN} &nbsp;·&nbsp; Tél ${TEL_DISPLAY} &nbsp;·&nbsp; WhatsApp ${WA_DISPLAY}</span>
      <span class="pageNumber"></span></div>`,
  });
  await page.close();
  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`   ✓ ${outFile} (${mb} Mo)`);
}

async function main() {
  console.log(">>> Chargement des produits…");
  let products = await loadAll("products", "id, reference, categorie, image_url");
  products = products.filter((p) => !EXCLUDE_PREFIXES.has(refPrefix(p.reference)));
  console.log(`>>> ${products.length} produits (après exclusion ${[...EXCLUDE_PREFIXES].join(",")})`);

  console.log(">>> Chargement des véhicules compatibles…");
  const vehMap = {};
  try {
    const veh = await loadAll("product_vehicles", "product_id, makes, nb");
    veh.forEach((v) => { vehMap[v.product_id] = { makes: v.makes ?? [] }; });
  } catch (e) { console.log("   (vue product_vehicles indisponible)", e.message); }

  await downloadThumbs(products);

  const voitures = products.filter((p) => classifyKind(p.reference, vehMap[p.id]?.makes) === "voiture");
  const camions = products.filter((p) => classifyKind(p.reference, vehMap[p.id]?.makes) === "camion");

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(">>> Rendu PDF (Puppeteer)…");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });

  // Un PDF par type (voitures)
  const FILES = {
    filtre_huile: "catalogue-huile.pdf", filtre_air: "catalogue-air.pdf",
    filtre_carburant: "catalogue-carburant.pdf", filtre_habitacle: "catalogue-habitacle.pdf",
  };
  for (const cat of Object.keys(TYPES)) {
    const list = voitures.filter((p) => p.categorie === cat);
    if (!list.length) { console.log(`   (${cat} : aucune réf, ignoré)`); continue; }
    const html = cat === "filtre_huile" ? buildOilHtml(list, vehMap) : buildTypeHtml(cat, list, vehMap);
    await renderPdf(browser, html, FILES[cat]);
  }

  // Catalogue Bus & Camions combiné
  if (camions.length) {
    const byCat = {};
    for (const p of camions) (byCat[p.categorie] ??= []).push(p);
    for (const c of Object.keys(byCat)) byCat[c].sort((a, b) => refCompare(a.reference, b.reference));
    await renderPdf(browser, buildMultiHtml(
      { title: "Filtres Bus & Camions", sub: "Poids lourds · bus · utilitaires" },
      byCat, vehMap), "catalogue-bus-camion.pdf");
  }

  await browser.close();
  console.log(`\n=== TERMINÉ ===`);
}

export { TYPES, loadAll, buildTypeHtml, buildOilHtml };

// N'exécute main() que si lancé directement (pas à l'import par un script de preview)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
