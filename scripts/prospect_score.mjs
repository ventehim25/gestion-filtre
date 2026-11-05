// Note d'intérêt probable /10 d'un prospect pour FiltroPro (filtres + huile, base Tanger/Tétouan)
// + envoi vers la table Supabase `prospects` (page /prospects). Partagé par les deux robots.
// Barème transparent (score_detail) : segment + joignabilité + proximité + activité + mots-clés.
import { createClient } from "@supabase/supabase-js";

const SEGMENT_PTS = {
  "Magasin pièces auto / sous-grossiste": 4,
  "Garage / centre de vidange": 3.5,
  "Flotte livraison / logistique / transport": 3,
  "Location de voitures": 2.5,
  "Auto-école": 2.5,
  "Poids lourds (garage/vente camion)": 2,
  "Pneus": 2,
  "Station-service": 1.5,
  "Lavage auto": 1,
};
const BASE = [{ lat: 35.7595, lon: -5.834 }, { lat: 35.5785, lon: -5.3684 }]; // Tanger, Tétouan
const KEYWORDS = /pi[eè]ces?|auto ?parts|accessoires? auto|vidange|lubrifiant|huile|filtre|graissage|قطع|زيت|فيلتر/i;

function km(a, b) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// p : { segment, nom, categorie, telephone, whatsapp, email, email_type, site, nb_avis, lat, lon, statut }
export function scoreProspect(p) {
  if (p.statut === "CLOSED_PERMANENTLY") return { score: 0, score_detail: "Fermé définitivement" };
  const parts = [];
  const add = (pts, why) => { if (pts) parts.push([pts, why]); };
  add(SEGMENT_PTS[p.segment] ?? 1, p.segment);
  if (p.whatsapp) add(2, "Mobile/WhatsApp");
  else if (p.telephone) add(1.5, "Téléphone fixe");
  if (p.email) add(p.email_type === "générique" ? 0.5 : 0.25, "E-mail");
  if (p.lat != null && p.lat !== "" && p.lon != null && p.lon !== "") {
    const d = Math.min(...BASE.map((b) => km(b, { lat: +p.lat, lon: +p.lon })));
    add(d < 60 ? 2 : d < 250 ? 1 : 0.5, d < 60 ? "Zone Tanger-Tétouan" : d < 250 ? "Nord / proche" : "Livraison nationale");
  }
  const avis = Number(p.nb_avis) || 0;
  add(avis >= 20 ? 1 : avis >= 5 ? 0.5 : 0, "Activité (avis Google)");
  if (p.site) add(0.5, "Site web");
  if (KEYWORDS.test(`${p.nom} ${p.categorie || ""}`)) add(1, "Mots-clés filtres/huile/pièces");
  const raw = parts.reduce((s, [n]) => s + n, 0);
  const score = Math.min(10, Math.round(raw * 2) / 2);
  return { score, score_detail: parts.map(([n, w]) => `${w} +${n}`).join(" · ") };
}

const supabase = createClient(
  "https://wehsvgoolozqzxsgwibb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaHN2Z29vbG96cXp4c2d3aWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTA3NzYsImV4cCI6MjA5NTgyNjc3Nn0.8z624yNoX-CQirJM5VQvYyMdeOCj5jau_0BvTaMKj1c"
);

// Upsert par lots. `statut_prospection` n'est jamais envoyé -> le suivi fait dans l'app est conservé.
export async function pushProspects(rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("prospects").upsert(rows.slice(i, i + 500), { onConflict: "id" });
    if (error) {
      console.warn(`Supabase : ${error.message} (table absente ? coller supabase/prospects.sql)`);
      return false;
    }
  }
  console.log(`Supabase : ${rows.length} prospects synchronisés.`);
  return true;
}
