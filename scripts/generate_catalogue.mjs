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
    pitch: "Le filtre à huile retient les impuretés et les particules métalliques en suspension dans l'huile moteur. Il protège les pièces mobiles et prolonge la durée de vie du moteur.",
    tip: "À remplacer à chaque vidange (environ 10 000 à 15 000 km).",
  },
  filtre_air: {
    label: "Filtres à Air", icon: "💨", hero: "photo-1486006920555-c77dcf18193c",
    pitch: "Un air propre, c'est une combustion optimale : plus de puissance, moins de consommation et un moteur préservé. Le filtre à air bloque poussières et impuretés avant l'admission.",
    tip: "À contrôler à chaque révision et remplacer environ tous les 20 000 km (plus souvent en zone poussiéreuse).",
  },
  filtre_carburant: {
    label: "Filtres à Carburant", icon: "⛽", hero: "photo-1530046339160-ce3e530c7d2f",
    pitch: "Le filtre à carburant élimine les impuretés et l'eau présentes dans le carburant pour protéger le système d'injection. Indispensable aux moteurs diesel et essence modernes.",
    tip: "À remplacer environ tous les 20 000 à 40 000 km — sur diesel, plus fréquemment.",
  },
  filtre_habitacle: {
    label: "Filtres d'Habitacle", icon: "❄️", hero: "photo-1756195343297-3311a8289044",
    pitch: "Pollen, poussières fines et mauvaises odeurs : le filtre d'habitacle purifie l'air de la cabine pour le confort et la santé de tous les passagers.",
    tip: "À remplacer une fois par an ou tous les 15 000 km.",
  },
};
// Libellés des séries (préfixes) + ordre d'affichage par catégorie
const SERIES_LABEL = {
  OP: "Vissables (OP)", OE: "Cartouche (OE)", OC: "Série OC", OH: "Série OH", OK: "Série OK",
  AP: "Panneau (AP)", AK: "À boîtier (AK)", AR: "Cylindriques (AR)", AS: "Série AS",
  PP: "Vissables gazole (PP)", PE: "Cartouche (PE)", PM: "Série PM", PS: "Séparateurs (PS)", PW: "Série PW",
  K: "Habitacle (K)",
};
const PREF_ORDER = {
  filtre_huile: ["OP", "OE", "OC", "OH", "OK"],
  filtre_air: ["AP", "AK", "AR"],
  filtre_carburant: ["PP", "PE", "PM", "PS", "PW"],
  filtre_habitacle: ["K"],
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

// Photos de couverture (scènes auto, licence libre Unsplash — AUCUN filtre dessus).
async function downloadHeroes() {
  for (const t of Object.values(TYPES)) {
    const dest = path.join(IMG_DIR, `hero_${t.hero}.jpg`);
    await fetchToFile(`https://images.unsplash.com/${t.hero}?auto=format&fit=crop&w=1600&q=80`, dest);
    t.heroFile = fs.existsSync(dest) ? `.catalog_imgs/hero_${t.hero}.jpg` : null;
  }
  const gid = "photo-1606577924006-27d39b132ae2"; // disque de frein / atelier (bus-camion)
  const gdest = path.join(IMG_DIR, `hero_${gid}.jpg`);
  await fetchToFile(`https://images.unsplash.com/${gid}?auto=format&fit=crop&w=1600&q=80`, gdest);
  return fs.existsSync(gdest) ? `.catalog_imgs/hero_${gid}.jpg` : null;
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
  :root { --c: #dc2626; --d: #7f1d1d; }  /* couleur d'accent par type (surchargée par doc) */
  /* Couverture */
  /* Hauteur = zone imprimable (297mm - marges haut 12mm - bas 15mm) pour éviter
     un débordement qui créait une page vide après la couverture. */
  .cover { position: relative; height: 268mm; color: #fff; background: #0a0a0c;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; page-break-after: always; overflow: hidden; }
  .cover .bg { position: absolute; inset: 0; background-size: cover; background-position: center;
    filter: contrast(1.08) brightness(0.92) saturate(1.05); }
  .cover .ov { position: absolute; inset: 0;
    background:
      radial-gradient(130% 80% at 50% 30%, rgba(0,0,0,0.15), rgba(0,0,0,0.78) 100%),
      linear-gradient(180deg, rgba(8,8,10,0.92) 0%, rgba(8,8,10,0.30) 34%, rgba(8,8,10,0.55) 70%, rgba(8,8,10,0.90) 100%); }
  .cover .tint { position: absolute; inset: 0; opacity: 0.55;
    background: linear-gradient(180deg, transparent 46%, var(--d) 140%); }
  .cover .grain { position: absolute; inset: 0; opacity: 0.05;
    background-image: radial-gradient(rgba(255,255,255,0.7) 0.5px, transparent 0.5px); background-size: 3px 3px; }
  .cover .c { position: relative; z-index: 1; padding: 0 22mm; }
  .cover .brand { font-size: 34px; font-weight: 800; letter-spacing: 1px; margin-top: 14px; text-shadow: 0 2px 16px rgba(0,0,0,0.5); }
  .cover .brand b { color: #f43f5e; }
  .cover .tag { letter-spacing: 7px; font-size: 11px; color: #e2e8f0; margin-top: 5px; text-transform: uppercase; }
  .cover .line { width: 70px; height: 3px; background: var(--c); margin: 26px auto; border-radius: 3px; box-shadow: 0 0 18px var(--c); }
  .cover h1 { font-size: 50px; font-weight: 800; margin: 8px 0; line-height: 1.03; letter-spacing: -0.5px; text-shadow: 0 4px 28px rgba(0,0,0,0.65); }
  .cover .sub { color: #f3d3d3; font-size: 15px; max-width: 380px; margin: 12px auto 0; text-shadow: 0 1px 10px rgba(0,0,0,0.5); }
  .cover .contact { position: relative; z-index: 1; margin-top: 30px; font-size: 13px; color: #fff;
    background: rgba(0,0,0,0.42); border: 1px solid var(--c); border-radius: 999px;
    padding: 10px 22px; display: inline-block; backdrop-filter: blur(2px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
  .cover .contact b { color: #fecaca; font-weight: 600; }
  .cover .meta { position: absolute; bottom: 16mm; left: 0; right: 0; color: #cbd5e1; font-size: 12px; z-index: 1; letter-spacing: 1px; }
  /* Sommaire */
  .toc { padding: 26mm 20mm; page-break-after: always; }
  .toc h2 { font-size: 24px; border-bottom: 3px solid var(--c); padding-bottom: 8px; color: #111827; }
  .tocrow { display: flex; align-items: baseline; gap: 8px; margin: 14px 0; font-size: 15px; color: #374151; }
  .tocrow .dots { flex: 1; border-bottom: 2px dotted #cbd5e1; }
  .tocrow-tot { font-weight: 700; color: #111827; margin-top: 18px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
  /* Page infos (filigrane cartouche + informations) */
  .info { position: relative; padding: 24mm 20mm; page-break-after: always; overflow: hidden; }
  .info .cartouche { position: absolute; opacity: 0.06; z-index: 0; }
  .info .cart-cyl { right: -34mm; top: 26mm; height: 215mm; transform: rotate(8deg); }
  .info .cart-panel { right: -22mm; top: 70mm; width: 180mm; transform: rotate(-6deg); }
  .info .ic { position: relative; z-index: 1; }
  .info .kicker { color: var(--d); font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-size: 12px; }
  .info h2 { font-size: 28px; margin: 6px 0 14px; color: #111827; }
  .info .pitch { font-size: 15px; color: #374151; line-height: 1.75; max-width: 540px; }
  .info .tip { margin: 16px 0; padding: 12px 16px; background: #f8fafc; border-left: 4px solid var(--c);
    border-radius: 8px; font-size: 13.5px; color: #334155; max-width: 560px; }
  .info .tip b { color: var(--d); }
  .info .sub2 { margin: 22px 0 10px; font-size: 17px; color: #111827; }
  .info .blocks { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; max-width: 560px; }
  .info .blk { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; background: rgba(255,255,255,0.9); }
  .info .blk .bt { font-weight: 700; font-size: 14px; color: #111827; }
  .info .blk .bd { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.35; }
  .info .infocontact { margin-top: 22px; font-size: 13px; color: #374151;
    background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 999px; padding: 10px 18px; display: inline-block; }
  /* Chapitres / grille */
  .chapter { page-break-before: always; padding: 0 8mm; }
  .chapter.first { page-break-before: avoid; }
  .chead { display: flex; align-items: center; gap: 14px; padding: 13px 16px; margin-bottom: 12px;
    background: linear-gradient(90deg, #111111 30%, var(--c) 130%); color: #fff; border-radius: 10px; }
  .chead .cicon { font-size: 28px; }
  .chead h2 { margin: 0; font-size: 19px; }
  .chead p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 7px 6px;
    text-align: center; page-break-inside: avoid; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  .card .ph { height: 92px; display: flex; align-items: center; justify-content: center; background: #fff; }
  .card img { max-height: 92px; max-width: 100%; object-fit: contain; }
  .card .noimg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; height: 92px; }
  .card .noimg .nosign { font-size: 30px; line-height: 1; }
  .card .noimg span { font-size: 7.5px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
  .card .ref { font-family: 'Consolas', monospace; font-weight: 700; font-size: 12px; margin-top: 5px; color: #111; }
  .card .makes { font-size: 8.5px; color: #6b7280; margin-top: 2px; line-height: 1.2;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  /* Mode sobre (bus-camion) : sans bande colorée, pour comparaison */
  .plain .chead { background: none; color: #111827; border-radius: 0; padding: 4px 2px 10px;
    margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
  .plain .chead p { color: #6b7280; }
  .plain .card { border-top: 1px solid #e5e7eb; }
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

// Couverture premium plein cadre : photo automobile cinématographique (licence libre,
// AUCUN filtre dessus) + halo sombre/rouge + typo en gros. Original, pas de plagiat.
function coverHtml({ title, sub, count, bgFile }) {
  const bg = bgFile ? `<div class="bg" style="background-image:url('${bgFile}')"></div>` : "";
  return `<div class="cover">
    ${bg}<div class="ov"></div><div class="tint"></div><div class="grain"></div>
    <div class="c">${LOGO_SVG}
      <div class="brand">Filtro<b>Pro</b></div>
      <div class="tag">Pièces Auto · Maroc</div>
      <div class="line"></div>
      <h1>${esc(title)}</h1>
      <div class="sub">${esc(sub)}</div>
      <div class="contact">📞 <b>${TEL_DISPLAY}</b>&nbsp;&nbsp;·&nbsp;&nbsp;💬 WhatsApp <b>${WA_DISPLAY}</b></div>
    </div>
    <div class="meta">${count} références · ${today()}</div></div>`;
}

// Silhouette de cartouche cylindrique (huile / carburant) — filigrane décoratif
function cartridgeSvg(color = "#dc2626") {
  let pleats = "";
  for (let x = 44; x <= 156; x += 7) pleats += `<path d="M${x} 42 V238"/>`;
  return `<svg class="cartouche cart-cyl" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round">
      <ellipse cx="100" cy="40" rx="62" ry="15"/>
      <path d="M38 40 V240"/><path d="M162 40 V240"/>
      <ellipse cx="100" cy="240" rx="62" ry="15"/>
      ${pleats}
      <ellipse cx="100" cy="40" rx="24" ry="6"/>
    </g></svg>`;
}

// Silhouette de filtre à air panneau (air / habitacle) — cadre + pliures accordéon
function panelSvg(color = "#dc2626") {
  let zig = "";
  for (let x = 36, up = true; x <= 364; x += 16, up = !up) zig += (zig ? " L" : "M") + x + " " + (up ? 72 : 150);
  return `<svg class="cartouche cart-panel" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="18" y="44" width="364" height="132" rx="14"/>
      <path d="${zig}"/>
    </g></svg>`;
}

// Couleur d'accent par type (air rouge, huile jaune, carburant vert, habitacle bleu)
const THEME = {
  filtre_air: { c: "#dc2626", d: "#7f1d1d" },
  filtre_huile: { c: "#eab308", d: "#854d0e" },
  filtre_carburant: { c: "#22c55e", d: "#14532d" },
  filtre_habitacle: { c: "#3b82f6", d: "#1e3a8a" },
};
const themeOf = (cat) => THEME[cat] || { c: "#dc2626", d: "#7f1d1d" };

// Choisit la silhouette adaptée au type de filtre, dans la couleur du type
function cartoucheFor(cat) {
  const c = themeOf(cat).c;
  return (cat === "filtre_air" || cat === "filtre_habitacle") ? panelSvg(c) : cartridgeSvg(c);
}

// Page SOMMAIRE : liste des séries de la catégorie avec leur nombre de réfs
function sommaireHtml(cat, order, byPre) {
  const rows = order.map((pre) =>
    `<div class="tocrow"><span>${TYPES[cat]?.icon || ""} ${SERIES_LABEL[pre] || "Série " + pre}</span><span class="dots"></span><span>${byPre[pre].length} réf.</span></div>`
  ).join("");
  const total = order.reduce((s, p) => s + byPre[p].length, 0);
  return `<div class="toc"><h2>Sommaire</h2>${rows}
    <div class="tocrow tocrow-tot"><span>Total</span><span class="dots"></span><span>${total} réf.</span></div></div>`;
}

// Page INFOS : filigrane cartouche en arrière-plan + informations (sans vignettes)
function infoHtml(cat, count) {
  const t = TYPES[cat];
  return `<div class="info">
    ${cartoucheFor(cat)}
    <div class="ic">
      <div class="kicker">${CAT_LABEL[cat]}</div>
      <h2>Pourquoi c'est essentiel ?</h2>
      <p class="pitch">${esc(t.pitch)}</p>
      ${t.tip ? `<div class="tip"><b>Quand le changer&nbsp;?</b> ${esc(t.tip)}</div>` : ""}
      <h3 class="sub2">Pourquoi FiltroPro&nbsp;?</h3>
      <div class="blocks">
        <div class="blk"><div class="bt">✓ Qualité d'origine</div><div class="bd">Références Filtron / MANN+HUMMEL.</div></div>
        <div class="blk"><div class="bt">📦 Large stock</div><div class="bd">${count} références voitures disponibles.</div></div>
        <div class="blk"><div class="bt">🔎 Recherche facile</div><div class="bd">Par référence, véhicule ou VIN.</div></div>
        <div class="blk"><div class="bt">🚚 Livraison & conseil</div><div class="bd">Service rapide partout au Maroc.</div></div>
      </div>
      <div class="infocontact">📞 <b>${TEL_DISPLAY}</b> &nbsp;·&nbsp; WhatsApp <b>${WA_DISPLAY}</b> &nbsp;·&nbsp; ${SLOGAN}</div>
    </div>
  </div>`;
}

// Catalogue d'UN type (voitures) : couverture + sommaire + infos + sections par série
function buildTypeCatalog(cat, products, vehMap) {
  const t = TYPES[cat];
  // Filtrage spécifique au catalogue Huile
  let list = products;
  if (cat === "filtre_huile") {
    list = list.filter((p) =>
      p.reference.toUpperCase() !== "OK651/4-2X" &&
      !/A$/i.test(p.reference) &&
      (vehMap[p.id]?.makes?.length > 0));
  }
  if (cat === "filtre_air") {
    list = list.filter((p) => refPrefix(p.reference) !== "AS"); // série AS retirée
  }
  const byPre = {};
  for (const p of list) (byPre[refPrefix(p.reference)] ??= []).push(p);
  const pref = PREF_ORDER[cat] || [];
  const order = Object.keys(byPre).sort((a, b) => {
    const ia = pref.indexOf(a), ib = pref.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  for (const k of order) byPre[k].sort((a, b) => refCompare(a.reference, b.reference));
  const total = list.length;

  const sections = order.map((pre, i) => {
    const items = byPre[pre];
    const title = SERIES_LABEL[pre] || `Série ${pre}`;
    const cards = items.map((p) => card(p, vehMap[p.id]?.makes)).join("");
    return `<div class="chapter${i === 0 ? " first" : ""}"><div class="chead"><div class="cicon">${t.icon}</div>
      <div><h2>${CAT_LABEL[cat]} — ${title}</h2><p>${items.length} références</p></div></div>
      <div class="grid">${cards}</div></div>`;
  }).join("");

  const theme = themeOf(cat);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${STYLE}
    :root{--c:${theme.c};--d:${theme.d};}</style></head><body>
    ${coverHtml({ title: t.label, sub: "Catalogue voitures · " + CAT_LABEL[cat].toLowerCase(), count: total, bgFile: t.heroFile })}
    ${sommaireHtml(cat, order, byPre)}
    ${infoHtml(cat, total)}
    ${sections}
  </body></html>`;
}

// Catalogue multi-sections (bus-camion) : couverture + sommaire + chapitres
function buildMultiHtml({ title, sub, bgFile }, byCat, vehMap) {
  const cats = CAT_ORDER.filter((c) => byCat[c] && byCat[c].length);
  const total = cats.reduce((s, c) => s + byCat[c].length, 0);
  const toc = cats.map((c) => `<div class="tocrow"><span>${CAT_ICON[c]} ${CAT_LABEL[c]}</span><span class="dots"></span><span>${byCat[c].length} réf.</span></div>`).join("");
  const chapters = cats.map((c, i) => {
    const cards = byCat[c].map((p) => card(p, vehMap[p.id]?.makes)).join("");
    return `<div class="chapter${i === 0 ? " first" : ""}"><div class="chead"><div class="cicon">${CAT_ICON[c]}</div>
      <div><h2>${CAT_LABEL[c]}</h2><p>${byCat[c].length} références disponibles</p></div></div>
      <div class="grid">${cards}</div></div>`;
  }).join("");
  const info = `<div class="info">${cartridgeSvg()}<div class="ic">
    <div class="kicker">Bus & Camions</div>
    <h2>Filtres poids lourds & utilitaires</h2>
    <p class="pitch">Une gamme complète de filtres à huile, air, carburant et habitacle pour bus, camions, véhicules utilitaires, engins agricoles et de chantier. Références Filtron adaptées aux conditions les plus exigeantes.</p>
    <div class="tip"><b>Bon à savoir&nbsp;:</b> sur poids lourd et usage intensif, des intervalles d'entretien plus courts protègent le moteur et l'injection.</div>
    <h3 class="sub2">Pourquoi FiltroPro&nbsp;?</h3>
    <div class="blocks">
      <div class="blk"><div class="bt">✓ Qualité d'origine</div><div class="bd">Références Filtron / MANN+HUMMEL.</div></div>
      <div class="blk"><div class="bt">📦 Large stock</div><div class="bd">${total} références bus & camions.</div></div>
      <div class="blk"><div class="bt">🔎 Recherche facile</div><div class="bd">Par référence, véhicule ou VIN.</div></div>
      <div class="blk"><div class="bt">🚚 Livraison & conseil</div><div class="bd">Service rapide partout au Maroc.</div></div>
    </div>
    <div class="infocontact">📞 <b>${TEL_DISPLAY}</b> &nbsp;·&nbsp; WhatsApp <b>${WA_DISPLAY}</b> &nbsp;·&nbsp; ${SLOGAN}</div>
  </div></div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${STYLE}</style></head><body class="plain">
    ${coverHtml({ title, sub, count: total, bgFile })}
    <div class="toc"><h2>Sommaire</h2>${toc}
      <div class="tocrow tocrow-tot"><span>Total</span><span class="dots"></span><span>${total} réf.</span></div></div>
    ${info}
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
  console.log(">>> Téléchargement des photos de couverture…");
  const busHero = await downloadHeroes();

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
    await renderPdf(browser, buildTypeCatalog(cat, list, vehMap), FILES[cat]);
  }

  // Catalogue Bus & Camions combiné
  if (camions.length) {
    const byCat = {};
    for (const p of camions) (byCat[p.categorie] ??= []).push(p);
    for (const c of Object.keys(byCat)) byCat[c].sort((a, b) => refCompare(a.reference, b.reference));
    await renderPdf(browser, buildMultiHtml(
      { title: "Filtres Bus & Camions", sub: "Poids lourds · bus · utilitaires", bgFile: busHero },
      byCat, vehMap), "catalogue-bus-camion.pdf");
  }

  await browser.close();
  console.log(`\n=== TERMINÉ ===`);
}

export { TYPES, loadAll, buildTypeCatalog };

// N'exécute main() que si lancé directement (pas à l'import par un script de preview)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
