// Photos des pièces tirées des catalogues PDF OFFICIELS (BIBLE §8.47) : pompes / kits Airtex, kits Graf et Metelli,
// plaquettes Metelli. Demande de l'utilisateur (19/11/2026) : « pour les photos des chaînes, pompes et freinage on doit
// retravailler » (la fiche voiture montrait un appareil photo). Les catalogues Gates n'ont pas de photos de pièces.
//
//   node scripts/photos_catalogues.mjs "<PDF>" <Marque> [--pages=5400-5600] [--essai=3] [--ecrire]
//     Marque : Airtex | Graf | Metelli   (les réf. lues sont celles de cette marque : WPA-/WPK-, TP…, 22-… / 23-… / 29-…)
// Sans --ecrire : découpe dans backups/photos_catalogue/<Marque>/ seulement (à regarder). Avec --ecrire : envoie dans le
// stockage Supabase (produits/catalogue/<marque>/<réf>.jpg) et remplit products.image_url des fiches de cette marque
// QUI N'ONT PAS DÉJÀ une photo (jamais écrasée). Reprenable : une photo déjà découpée n'est pas refaite.
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
// Matrices PDF [a, b, c, d, e, f] : produit et application d'un point
const mult = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const point = ([x, y], m) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const [PDF, MARQUE] = args.filter((a) => !a.startsWith("--"));
const ECRIRE = args.includes("--ecrire");
const plage = (args.find((a) => a.startsWith("--pages=")) ?? "").slice(8).split("-").map(Number);
const ESSAI = Number((args.find((a) => a.startsWith("--essai=")) ?? "").slice(8)) || 0;
if (!PDF || !MARQUE) { console.log('node scripts/photos_catalogues.mjs "<PDF>" <Airtex|Graf|Metelli> [--pages=a-b] [--essai=N] [--ecrire]'); process.exit(1); }
const REFS = {
  Airtex: /^WP[AK]-[A-Z]?\d{3,6}[A-Z0-9]*(-[A-Z0-9]{1,2})?$/,
  Graf: /^TP\d{3,4}[A-Z]?$/,
  Metelli: /^(22|23|29)-\d{4}(-\d{1,2})?[A-Z]?$/,
};
const REF = REFS[MARQUE];
if (!REF) { console.log("Marque inconnue :", MARQUE); process.exit(1); }
const DOSSIER = join(process.cwd(), "backups", "photos_catalogue", MARQUE);
mkdirSync(DOSSIER, { recursive: true });
const fichierPhoto = (ref) => join(DOSSIER, ref.replace(/[^A-Za-z0-9-]/g, "_") + ".jpg");

// Images d'une page : position (cadre) de chaque image dessinée, en coordonnées PDF (CTM suivie à la main)
async function imagesDe(page) {
  const ops = await page.getOperatorList();
  const pile = []; let ctm = [1, 0, 0, 1, 0, 0]; const out = [];
  for (let k = 0; k < ops.fnArray.length; k++) {
    const fn = ops.fnArray[k], a = ops.argsArray[k];
    if (fn === OPS.save) pile.push(ctm.slice());
    else if (fn === OPS.restore) ctm = pile.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = mult(ctm, a);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const coins = [[0, 0], [1, 0], [0, 1], [1, 1]].map((c) => point(c, ctm));
      const xs = coins.map((c) => c[0]), ys = coins.map((c) => c[1]);
      const b = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      if (b.x1 - b.x0 > 25 && b.y1 - b.y0 > 25) out.push(b); // pas les petits pictogrammes
    }
  }
  return out;
}

const doc = await getDocument({ data: new Uint8Array(readFileSync(PDF)), verbosity: 0 }).promise;
const [de, a] = plage.length === 2 && plage[0] ? plage : [1, doc.numPages];
const photos = new Map(); // réf → fichier
for (const f of readdirSync(DOSSIER)) photos.set(f.replace(/\.jpg$/, ""), join(DOSSIER, f));
let pagesLues = 0, decoupees = 0;
for (let p = de; p <= a; p++) {
  const page = await doc.getPage(p);
  const textes = (await page.getTextContent()).items.filter((i) => i.str?.trim() && REF.test(i.str.trim()))
    .map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width }));
  if (!textes.length) { page.cleanup(); continue; }
  const imgs = await imagesDe(page);
  if (!imgs.length) { page.cleanup(); continue; }
  // Chaque image ↔ la réf. écrite juste en dessous (centre de la réf. dans la largeur de l'image, à moins de 45 pt)
  const paires = [];
  for (const im of imgs) {
    const sous = textes.filter((t) => t.x + t.w / 2 >= im.x0 - 10 && t.x + t.w / 2 <= im.x1 + 10 && t.y < im.y0 + 2 && im.y0 - t.y < 45)
      .sort((u, v) => (im.y0 - u.y) - (im.y0 - v.y));
    if (sous[0]) paires.push({ ref: sous[0].s, im });
  }
  const aFaire = paires.filter((q) => !photos.has(q.ref.replace(/[^A-Za-z0-9-]/g, "_")));
  if (!aFaire.length) { page.cleanup(); continue; }
  pagesLues++;
  const echelle = 3;
  const vp = page.getViewport({ scale: echelle });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const png = canvas.toBuffer("image/png");
  for (const { ref, im } of aFaire) {
    const [x0, y0] = vp.convertToViewportPoint(im.x0, im.y1);
    const [x1, y1] = vp.convertToViewportPoint(im.x1, im.y0);
    const left = Math.max(0, Math.floor(Math.min(x0, x1))), top = Math.max(0, Math.floor(Math.min(y0, y1)));
    const width = Math.min(canvas.width - left, Math.ceil(Math.abs(x1 - x0))), height = Math.min(canvas.height - top, Math.ceil(Math.abs(y1 - y0)));
    if (width < 40 || height < 40) continue;
    const sortie = fichierPhoto(ref);
    await sharp(png).extract({ left, top, width, height }).flatten({ background: "#ffffff" })
      .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(sortie);
    photos.set(ref.replace(/[^A-Za-z0-9-]/g, "_"), sortie);
    decoupees++;
  }
  page.cleanup();
  if (pagesLues % 50 === 0) console.log(`  … page ${p} : ${photos.size} photos`);
  if (ESSAI && pagesLues >= ESSAI) break;
}
console.log(`${MARQUE} : ${decoupees} photos découpées maintenant, ${photos.size} au total dans ${DOSSIER}`);
if (!ECRIRE) { console.log("Essai : regarde les photos dans le dossier, puis relance avec --ecrire."); process.exit(0); }

// ───────────── Envoi ─────────────
const { createClient } = await import("@supabase/supabase-js");
const { SUPABASE_URL, SUPABASE_CLE } = await import("./cle_supabase.mjs");
const sb = createClient(SUPABASE_URL, SUPABASE_CLE);
const fiches = new Map();
for (let i = 0; ; i++) {
  const { data, error } = await sb.from("products").select("id, reference, image_url").eq("marque", MARQUE).order("id").range(i * 1000, i * 1000 + 999);
  if (error) throw error;
  for (const f of data) fiches.set(f.reference.replace(/[^A-Za-z0-9-]/g, "_"), f);
  if (data.length < 1000) break;
}
let envoyees = 0, sansFiche = 0, dejaPhoto = 0;
for (const [cle, fichier] of photos) {
  const f = fiches.get(cle);
  if (!f) { sansFiche++; continue; }
  if (f.image_url) { dejaPhoto++; continue; }
  const chemin = `catalogue/${MARQUE.toLowerCase()}/${cle}.jpg`;
  const { error } = await sb.storage.from("produits").upload(chemin, readFileSync(fichier), { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`stockage ${chemin} : ${error.message}`);
  const url = sb.storage.from("produits").getPublicUrl(chemin).data.publicUrl;
  const { error: e2 } = await sb.from("products").update({ image_url: url }).eq("id", f.id).is("image_url", null);
  if (e2) throw e2;
  envoyees++;
  if (envoyees % 100 === 0) console.log(`  … ${envoyees} envoyées`);
}
console.log(`Envoi : ${envoyees} photos mises sur les fiches ${MARQUE} · ${dejaPhoto} fiches avaient déjà une photo (gardée) · ${sansFiche} photos sans fiche dans l'appli`);
writeFileSync(join(DOSSIER, "..", `${new Date().toISOString().slice(0, 10)}-${MARQUE}.json`), JSON.stringify({ photos: photos.size, envoyees, dejaPhoto, sansFiche }, null, 1));
