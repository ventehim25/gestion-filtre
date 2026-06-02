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

const CAT_ORDER = ["filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle", "filtre_refroidissement", "autre"];
const CAT_LABEL = {
  filtre_huile: "Filtres à huile", filtre_air: "Filtres à air", filtre_carburant: "Filtres à carburant",
  filtre_habitacle: "Filtres d'habitacle", filtre_refroidissement: "Filtres de refroidissement", autre: "Autres filtres",
};
const CAT_ICON = { filtre_huile: "🛢️", filtre_air: "💨", filtre_carburant: "⛽", filtre_habitacle: "❄️", filtre_refroidissement: "🌡️", autre: "🔧" };

// Classement voiture / bus-camion par préfixe (cf. src/lib/vehicleType.ts)
const CAMION_PREFIXES = new Set(["OM", "OR", "OT", "AM", "AD", "AE", "AG"]);
const EXCLUDE_PREFIXES = new Set(["CW", "UE"]); // filtres "autre" non pertinents
const refPrefix = (r) => (r.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
const vehKind = (r) => (CAMION_PREFIXES.has(refPrefix(r)) ? "camion" : "voiture");

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

async function downloadHeroes() {
  for (const t of Object.values(TYPES)) {
    const dest = path.join(IMG_DIR, `hero_${t.hero}.jpg`);
    await fetchToFile(`https://images.unsplash.com/${t.hero}?auto=format&fit=crop&w=1400&q=80`, dest);
    t.heroFile = fs.existsSync(dest) ? `.catalog_imgs/hero_${t.hero}.jpg` : null;
  }
  // héros générique (garage) pour le catalogue bus-camion
  const gid = "photo-1530046339160-ce3e530c7d2f";
  const gdest = path.join(IMG_DIR, `hero_${gid}.jpg`);
  await fetchToFile(`https://images.unsplash.com/${gid}?auto=format&fit=crop&w=1400&q=80`, gdest);
  return fs.existsSync(gdest) ? `.catalog_imgs/hero_${gid}.jpg` : null;
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
  .cover { position: relative; height: 297mm; color: #fff; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; page-break-after: always; overflow: hidden; }
  .cover .bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .cover .ov { position: absolute; inset: 0;
    background: linear-gradient(160deg, rgba(8,8,10,0.94) 0%, rgba(40,8,8,0.84) 52%, rgba(127,29,29,0.72) 100%); }
  .cover .c { position: relative; z-index: 1; padding: 0 24mm; }
  .cover .brand { font-size: 30px; font-weight: 800; letter-spacing: 1px; margin-top: 12px; }
  .cover .brand b { color: #f43f5e; }
  .cover .tag { letter-spacing: 6px; font-size: 11px; color: #cbd5e1; margin-top: 4px; text-transform: uppercase; }
  .cover .icon { font-size: 60px; margin: 34px 0 10px; }
  .cover h1 { font-size: 40px; font-weight: 800; margin: 6px 0; line-height: 1.05; }
  .cover .sub { color: #f0c7c7; font-size: 15px; max-width: 360px; margin: 8px auto 0; }
  .cover .line { width: 64px; height: 3px; background: #dc2626; margin: 22px auto; border-radius: 3px; }
  .cover .contact { position: relative; z-index: 1; margin-top: 20px; font-size: 13px; color: #fff;
    background: rgba(220,38,38,0.20); border: 1px solid rgba(244,63,94,0.55); border-radius: 999px; padding: 9px 20px; display: inline-block; }
  .cover .contact b { color: #fecaca; font-weight: 600; }
  .cover .meta { position: absolute; bottom: 22mm; left: 0; right: 0; color: #94a3b8; font-size: 12px; z-index: 1; }
  /* Intro marketing */
  .intro { padding: 24mm 20mm; page-break-after: always; }
  .intro .kicker { color: #dc2626; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-size: 12px; }
  .intro h2 { font-size: 26px; margin: 6px 0 14px; color: #111827; }
  .intro .pitch { font-size: 15px; color: #374151; line-height: 1.75; max-width: 560px; }
  .intro .band { margin: 22px 0; height: 150px; border-radius: 14px; background-size: cover; background-position: center; }
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

// Couverture commune
function coverHtml({ icon, title, sub, count, heroFile }) {
  const bg = heroFile ? `style="background-image:url('${heroFile}')"` : "";
  return `<div class="cover"><div class="bg" ${bg}></div><div class="ov"></div>
    <div class="c">${LOGO_SVG}
      <div class="brand">Filtro<b>Pro</b></div>
      <div class="tag">Pièces Auto · Maroc</div>
      <div class="line"></div>
      ${icon ? `<div class="icon">${icon}</div>` : ""}
      <h1>${esc(title)}</h1>
      <div class="sub">${esc(sub)}</div>
      <div class="contact">📞 <b>${TEL_DISPLAY}</b>&nbsp;&nbsp;·&nbsp;&nbsp;💬 WhatsApp <b>${WA_DISPLAY}</b></div>
    </div>
    <div class="meta">${count} références · ${today()}</div></div>`;
}

// Catalogue d'UN type (voitures) : couverture + intro marketing + grille
function buildTypeHtml(cat, products, vehMap) {
  const t = TYPES[cat];
  const list = [...products].sort((a, b) => refCompare(a.reference, b.reference));
  const cards = list.map((p) => card(p, vehMap[p.id]?.makes)).join("");
  const band = t.heroFile ? `<div class="band" style="background-image:url('${t.heroFile}')"></div>` : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>
    ${coverHtml({ icon: t.icon, title: t.label, sub: "Catalogue voitures · " + CAT_LABEL[cat].toLowerCase(), count: list.length, heroFile: t.heroFile })}
    <div class="intro">
      <div class="kicker">${t.icon} ${CAT_LABEL[cat]}</div>
      <h2>Pourquoi c'est essentiel ?</h2>
      <p class="pitch">${esc(t.pitch)}</p>
      ${band}
      <div class="benefits">
        <div class="benefit"><div class="bi">✓</div><div class="bt">Qualité d'origine</div><div class="bd">Références Filtron / MANN+HUMMEL</div></div>
        <div class="benefit"><div class="bi">🚗</div><div class="bt">Large compatibilité</div><div class="bd">${list.length} références voitures</div></div>
        <div class="benefit"><div class="bi">📍</div><div class="bt">Disponible au Maroc</div><div class="bd">Livraison & conseil</div></div>
      </div>
    </div>
    <div class="chapter first">
      <div class="chead"><div class="cicon">${t.icon}</div><div><h2>${CAT_LABEL[cat]}</h2><p>${list.length} références disponibles</p></div></div>
      <div class="grid">${cards}</div>
    </div>
  </body></html>`;
}

// Catalogue multi-sections (bus-camion) : couverture + sommaire + chapitres
function buildMultiHtml({ title, sub, heroFile }, byCat, vehMap) {
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
    ${coverHtml({ icon: "🚚", title, sub, count: total, heroFile })}
    <div class="toc"><h2>Sommaire</h2>${toc}</div>
    ${chapters}</body></html>`;
}

async function renderPdf(browser, html, outFile, footer) {
  fs.writeFileSync(HTML_PATH, html);
  const page = await browser.newPage();
  await page.goto("file://" + HTML_PATH.replace(/\\/g, "/"), { waitUntil: "networkidle0", timeout: 180000 });
  const out = path.join(OUT_DIR, outFile);
  await page.pdf({
    path: out, format: "A4", printBackground: true,
    margin: { top: "12mm", bottom: "14mm", left: "8mm", right: "8mm" },
    displayHeaderFooter: true, headerTemplate: "<div></div>",
    footerTemplate: `<div style="width:100%;font-size:8px;color:#9ca3af;padding:0 12mm;display:flex;justify-content:space-between;">
      <span>${footer} · Tél ${TEL_DISPLAY} · WhatsApp ${WA_DISPLAY}</span><span class="pageNumber"></span></div>`,
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
  console.log(">>> Téléchargement des photos de couverture…");
  const busHero = await downloadHeroes();

  const voitures = products.filter((p) => vehKind(p.reference) === "voiture");
  const camions = products.filter((p) => vehKind(p.reference) === "camion");

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
    await renderPdf(browser, buildTypeHtml(cat, list, vehMap), FILES[cat], `FiltroPro — ${TYPES[cat].label} (voitures)`);
  }

  // Catalogue Bus & Camions combiné
  if (camions.length) {
    const byCat = {};
    for (const p of camions) (byCat[p.categorie] ??= []).push(p);
    for (const c of Object.keys(byCat)) byCat[c].sort((a, b) => refCompare(a.reference, b.reference));
    await renderPdf(browser, buildMultiHtml(
      { title: "Filtres Bus & Camions", sub: "Poids lourds · bus · utilitaires", heroFile: busHero },
      byCat, vehMap), "catalogue-bus-camion.pdf", "FiltroPro — Bus & Camions");
  }

  await browser.close();
  console.log(`\n=== TERMINÉ ===`);
}

export { TYPES, loadAll, downloadHeroes, buildTypeHtml };

// N'exécute main() que si lancé directement (pas à l'import par un script de preview)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
