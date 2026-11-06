// Import des fiches Google Maps relevées à la main par Claude dans Chromium (consultation ouverte,
// rythme normal, pas de robot furtif) -> table `prospects` (page /prospects), avec note d'intérêt /10.
// Lancer : node scripts/import_gmaps_manuel.mjs <fichier.json>
// JSON : [{ segment, ville, nom, categorie, adresse, telephone, note, avis }]  (le fichier reste hors du dépôt public)
import { readFileSync } from "node:fs";
import { scoreProspect, pushProspects, supabase } from "./prospect_score.mjs";

// Centre-ville approximatif, pour la proximité dans la note (les fiches relevées n'ont pas de GPS)
const CENTRES = {
  "Tanger": [35.7595, -5.834], "Tétouan": [35.5785, -5.3684], "M'diq": [35.6858, -5.3253], "Fnideq": [35.8496, -5.3573],
  "Martil": [35.6167, -5.2752], "Larache": [35.1932, -6.1557], "Ksar El Kébir": [35.0017, -5.9053], "Asilah": [35.4652, -6.0341],
  "Chefchaouen": [35.1688, -5.2636], "Al Hoceïma": [35.2517, -3.9372], "Kénitra": [34.261, -6.5802], "Rabat": [34.0209, -6.8416],
  "Salé": [34.0331, -6.7985], "Casablanca": [33.5731, -7.5898], "Fès": [34.0181, -5.0078], "Meknès": [33.8935, -5.5473],
  "Oujda": [34.6814, -1.9086], "Nador": [35.1681, -2.9335], "Marrakech": [31.6295, -7.9811], "Agadir": [30.4278, -9.5981],
};
const today = new Date().toISOString().slice(0, 10);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const fiches = JSON.parse(readFileSync(process.argv[2], "utf8"));
// Anti-doublon : une même fiche peut ressortir dans la recherche d'une ville voisine -> on saute les noms déjà en base
const norm = (s) => slug(s).replace(/-/g, "");
const { data: deja } = await supabase.from("prospects").select("nom").eq("source", "gmaps");
const seen = new Set((deja ?? []).map((r) => norm(r.nom || "")));
const rows = [];
for (const f of fiches) {
  const id = `gmaps-manuel:${slug(f.nom)}-${slug(f.ville)}`;
  if (seen.has(norm(f.nom))) { console.log(`déjà en base : ${f.nom}`); continue; }
  seen.add(norm(f.nom));
  const d = (f.telephone || "").replace(/\D/g, "");
  const whatsapp = /^0[67]\d{8}$/.test(d) ? `https://wa.me/212${d.slice(1)}` : null;
  const [lat, lon] = CENTRES[f.ville] ?? [null, null];
  const s = scoreProspect({ ...f, whatsapp, nb_avis: f.avis, lat, lon });
  const maps = `https://www.google.com/maps/search/${encodeURIComponent(`${f.nom} ${f.ville}`)}`;
  rows.push({
    id, source: "gmaps", segment: f.segment, nom: f.nom, ville: f.ville, adresse: f.adresse || null,
    telephone: f.telephone || null, whatsapp, categorie: f.categorie || null, note_google: f.note ?? null,
    nb_avis: f.avis ?? null, maps_url: maps, source_url: maps, score: s.score, score_detail: s.score_detail,
    premiere_vue: today, derniere_vue: today,
  });
}
console.table(rows.map((r) => ({ nom: r.nom, ville: r.ville, tel: r.telephone, score: r.score })));
await pushProspects(rows);
