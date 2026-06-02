// Génère un catalogue PDF FiltroPro : un chapitre par type de filtre, avec photos.
// Sans prix. Télécharge des vignettes Scene7 en local (reprenable) puis rend en PDF
// via Puppeteer. Sortie : public/catalogue-filtropro.pdf
//
// PRÉREQUIS (outil local uniquement, volontairement HORS package.json pour ne pas
// alourdir les déploiements Vercel) :  npm i -D puppeteer
// Lancement :  node scripts/generate_catalogue.mjs
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, ".catalog_imgs");
const HTML_PATH = path.join(__dirname, ".catalogue.html");
const OUT_DIR = path.join(__dirname, "..", "public");

const supabase = createClient(
  "https://wehsvgoolozqzxsgwibb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaHN2Z29vbG96cXp4c2d3aWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTA3NzYsImV4cCI6MjA5NTgyNjc3Nn0.8z624yNoX-CQirJM5VQvYyMdeOCj5jau_0BvTaMKj1c"
);

const CAT_ORDER = ["filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle", "filtre_refroidissement", "autre"];
const CAT_LABEL = {
  filtre_huile: "Filtres à huile",
  filtre_air: "Filtres à air",
  filtre_carburant: "Filtres à carburant",
  filtre_habitacle: "Filtres d'habitacle",
  filtre_refroidissement: "Filtres de refroidissement",
  autre: "Autres filtres",
};
const CAT_ICON = {
  filtre_huile: "🛢️", filtre_air: "💨", filtre_carburant: "⛽",
  filtre_habitacle: "❄️", filtre_refroidissement: "🌡️", autre: "🔧",
};

// Classement voiture / bus-camion par préfixe (cf. src/lib/vehicleType.ts)
const CAMION_PREFIXES = new Set(["OM", "OR", "OT", "AM", "AR", "AD", "AE", "AG"]);
const refPrefix = (r) => (r.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
const vehKind = (r) => (CAMION_PREFIXES.has(refPrefix(r)) ? "camion" : "voiture");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tri naturel par référence
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

// Pool de téléchargement concurrent (reprenable : saute les fichiers déjà présents)
async function downloadThumbs(products, concurrency = 12) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
  const todo = products.filter((p) => p.image_url && !fs.existsSync(path.join(IMG_DIR, p.id + ".jpg")));
  console.log(`>>> ${todo.length} vignettes à télécharger (${products.length - todo.length} déjà en cache)`);
  let i = 0, ok = 0, fail = 0;
  async function worker() {
    while (i < todo.length) {
      const p = todo[i++];
      const url = `${p.image_url}?wid=260&fmt=jpeg&qlt=82&bgc=ffffff`;
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        fs.writeFileSync(path.join(IMG_DIR, p.id + ".jpg"), buf);
        ok++;
      } catch {
        fail++;
      }
      if ((ok + fail) % 100 === 0) console.log(`   ...${ok + fail}/${todo.length} (ok:${ok} fail:${fail})`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`>>> Vignettes prêtes (ok:${ok} fail:${fail})`);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const LOGO_SVG = `<svg width="84" height="84" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    : `<div class="noimg">📷</div>`;
  const m = makes && makes.length ? `<div class="makes">${esc(makes.slice(0, 4).join(" · "))}${makes.length > 4 ? " +" + (makes.length - 4) : ""}</div>` : "";
  return `<div class="card"><div class="ph">${img}</div><div class="ref">${esc(p.reference)}</div>${m}</div>`;
}

function buildHtml(byCat, vehMap, meta) {
  const cats = CAT_ORDER.filter((c) => byCat[c] && byCat[c].length);
  const total = cats.reduce((s, c) => s + byCat[c].length, 0);
  const today = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" });

  const toc = cats.map((c) =>
    `<div class="tocrow"><span>${CAT_ICON[c]} ${CAT_LABEL[c]}</span><span class="dots"></span><span>${byCat[c].length} réf.</span></div>`
  ).join("");

  const chapters = cats.map((c) => {
    const rows = byCat[c].map((p) => card(p, vehMap[p.id]?.makes)).join("");
    return `<section class="chapter">
      <div class="chead"><div class="cicon">${CAT_ICON[c]}</div>
        <div><h2>${CAT_LABEL[c]}</h2><p>${byCat[c].length} références disponibles</p></div></div>
      <div class="grid">${rows}</div>
    </section>`;
  }).join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; color: #1a1a1a; }
  /* Couverture */
  .cover { height: 297mm; background: linear-gradient(135deg, #1a1a1a 0%, #2a0a0a 55%, #7f1d1d 130%);
    color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; page-break-after: always; }
  .cover .brand { font-size: 46px; font-weight: 800; letter-spacing: 1px; margin-top: 18px; }
  .cover .brand b { color: #f43f5e; }
  .cover .tag { letter-spacing: 6px; font-size: 12px; color: #cbd5e1; margin-top: 6px; text-transform: uppercase; }
  .cover h1 { font-size: 30px; font-weight: 700; margin: 40px 0 6px; }
  .cover .sub { color: #e2b3b3; font-size: 15px; }
  .cover .meta { position: absolute; bottom: 24mm; color: #94a3b8; font-size: 12px; }
  .cover .line { width: 70px; height: 3px; background: #dc2626; margin: 22px auto; border-radius: 3px; }
  /* Sommaire */
  .toc { padding: 26mm 20mm; page-break-after: always; }
  .toc h2 { font-size: 22px; border-bottom: 3px solid #dc2626; padding-bottom: 8px; }
  .tocrow { display: flex; align-items: baseline; gap: 8px; margin: 14px 0; font-size: 15px; }
  .tocrow .dots { flex: 1; border-bottom: 2px dotted #cbd5e1; }
  /* Chapitres */
  .chapter { page-break-before: always; padding: 0 8mm; }
  .chead { display: flex; align-items: center; gap: 14px; padding: 14px 10px; margin-bottom: 12px;
    background: linear-gradient(90deg, #1a1a1a, #7f1d1d); color: #fff; border-radius: 10px; }
  .chead .cicon { font-size: 30px; }
  .chead h2 { margin: 0; font-size: 20px; }
  .chead p { margin: 2px 0 0; font-size: 12px; color: #f0c7c7; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px; text-align: center;
    page-break-inside: avoid; background: #fff; }
  .card .ph { height: 92px; display: flex; align-items: center; justify-content: center; background: #fff; }
  .card img { max-height: 92px; max-width: 100%; object-fit: contain; }
  .card .noimg { font-size: 28px; color: #cbd5e1; }
  .card .ref { font-family: 'Consolas', monospace; font-weight: 700; font-size: 12px; margin-top: 4px; color: #111; }
  .card .makes { font-size: 8.5px; color: #6b7280; margin-top: 2px; line-height: 1.2;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
</style></head><body>
  <div class="cover">
    ${LOGO_SVG}
    <div class="brand">Filtro<b>Pro</b></div>
    <div class="tag">Pièces Auto · Maroc</div>
    <div class="line"></div>
    <h1>${esc(meta.title)}</h1>
    <div class="sub">${esc(meta.sub)}</div>
    <div class="meta">${total} références · ${today}</div>
  </div>
  <div class="toc"><h2>Sommaire</h2>${toc}</div>
  ${chapters}
</body></html>`;
}

async function main() {
  console.log(">>> Chargement des produits…");
  const products = await loadAll("products", "id, reference, categorie, image_url");
  console.log(`>>> ${products.length} produits`);

  console.log(">>> Chargement des véhicules compatibles…");
  let vehMap = {};
  try {
    const veh = await loadAll("product_vehicles", "product_id, makes, nb");
    veh.forEach((v) => { vehMap[v.product_id] = { makes: v.makes ?? [] }; });
  } catch (e) { console.log("   (vue product_vehicles indisponible, on continue sans)", e.message); }

  await downloadThumbs(products);

  // Sépare voitures / bus-camions, puis groupe + tri par catégorie
  function groupByCat(list) {
    const byCat = {};
    for (const p of list) (byCat[p.categorie] ??= []).push(p);
    for (const c of Object.keys(byCat)) byCat[c].sort((a, b) => refCompare(a.reference, b.reference));
    return byCat;
  }
  const voitures = products.filter((p) => vehKind(p.reference) === "voiture");
  const camions = products.filter((p) => vehKind(p.reference) === "camion");
  console.log(`>>> Voitures: ${voitures.length} · Bus-camions: ${camions.length}`);

  const jobs = [
    { list: voitures, file: "catalogue-voitures.pdf", footer: "FiltroPro — Catalogue Voitures",
      title: "Catalogue Filtres Voitures", sub: "Filtres à huile · air · carburant · habitacle" },
    { list: camions, file: "catalogue-bus-camion.pdf", footer: "FiltroPro — Catalogue Bus & Camions",
      title: "Catalogue Filtres Bus & Camions", sub: "Poids lourds · bus · utilitaires" },
  ];

  console.log(">>> Rendu PDF (Puppeteer)…");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const job of jobs) {
    if (!job.list.length) { console.log(`   (${job.file} : aucune référence, ignoré)`); continue; }
    fs.writeFileSync(HTML_PATH, buildHtml(groupByCat(job.list), vehMap, { title: job.title, sub: job.sub }));
    const page = await browser.newPage();
    await page.goto("file://" + HTML_PATH.replace(/\\/g, "/"), { waitUntil: "networkidle0", timeout: 180000 });
    const out = path.join(OUT_DIR, job.file);
    await page.pdf({
      path: out, format: "A4", printBackground: true,
      margin: { top: "12mm", bottom: "14mm", left: "8mm", right: "8mm" },
      displayHeaderFooter: true, headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%;font-size:8px;color:#9ca3af;padding:0 12mm;display:flex;justify-content:space-between;">
        <span>${job.footer}</span><span class="pageNumber"></span></div>`,
    });
    await page.close();
    const mb = (fs.statSync(out).size / 1048576).toFixed(1);
    console.log(`   ✓ ${job.file} (${job.list.length} réf · ${mb} Mo)`);
  }
  await browser.close();
  console.log(`\n=== TERMINÉ ===`);
}
main().catch((e) => { console.error(e); process.exit(1); });
