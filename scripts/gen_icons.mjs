// Génère les icônes PWA (logo hexagone FiltroPro sur fond sombre) via Puppeteer.
// Sortie : public/icons/*.png   ->  npm i -D puppeteer ; node scripts/gen_icons.mjs
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "icons");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const LOGO = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
    <stop stop-color="#f43f5e"/><stop offset="0.6" stop-color="#dc2626"/><stop offset="1" stop-color="#7f1d1d"/>
  </linearGradient></defs>
  <path d="M24 2.5 41.55 12.75 V33.25 L24 43.5 6.45 33.25 V12.75 Z" fill="url(#g)" stroke="#000" stroke-opacity="0.12" stroke-width="1"/>
  <g stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none">
    <path d="M13 18 C 19.5 13.5, 28.5 13.5, 35 18"/><path d="M13 24 C 19.5 19.5, 28.5 19.5, 35 24"/><path d="M13 30 C 19.5 25.5, 28.5 25.5, 35 30"/>
  </g><circle cx="35" cy="18" r="2.1" fill="#fff"/></svg>`;

function html(size, logoPct) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0}
    .ico{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
      background:radial-gradient(circle at 50% 40%, #1b1d27 0%, #0a0b10 75%);}
    .ico svg{width:${Math.round(size * logoPct)}px;height:${Math.round(size * logoPct)}px;
      filter:drop-shadow(0 ${Math.round(size*0.02)}px ${Math.round(size*0.04)}px rgba(0,0,0,0.5));}
  </style></head><body><div class="ico">${LOGO}</div></body></html>`;
}

const jobs = [
  { name: "icon-192.png", size: 192, pct: 0.64 },
  { name: "icon-512.png", size: 512, pct: 0.64 },
  { name: "maskable-512.png", size: 512, pct: 0.52 }, // marge "safe zone"
  { name: "apple-180.png", size: 180, pct: 0.64 },
];

const b = await puppeteer.launch({ headless: "new" });
for (const j of jobs) {
  const pg = await b.newPage();
  await pg.setViewport({ width: j.size, height: j.size, deviceScaleFactor: 1 });
  await pg.setContent(html(j.size, j.pct), { waitUntil: "networkidle0" });
  await pg.screenshot({ path: path.join(OUT, j.name), omitBackground: false });
  await pg.close();
  console.log("✓ " + j.name);
}
await b.close();
console.log("=== icônes générées ===");
