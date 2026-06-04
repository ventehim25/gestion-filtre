import type { Garage, GarageStatut } from "@/types/database";

// Point de base de la tournée : Kénitra.
export const KENITRA: { lat: number; lng: number; nom: string } = {
  lat: 34.261,
  lng: -6.5802,
  nom: "Kénitra",
};

export type LatLng = { lat: number; lng: number };

// Couleurs des statuts (pins + badges). Rouge = à livrer, vert = livré, etc.
export const STATUT_INFO: Record<GarageStatut, { label: string; color: string; bg: string }> = {
  a_livrer: { label: "À livrer", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  preparee: { label: "Commande préparée", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  livre: { label: "Livré", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  reporte: { label: "Pas de réponse / reporté", color: "#94a3b8", bg: "rgba(148,163,184,0.18)" },
};

export const STATUT_ORDER: GarageStatut[] = ["a_livrer", "preparee", "livre", "reporte"];

// Distance à vol d'oiseau (km) entre deux points GPS.
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Longueur totale d'un chemin base -> points… -> base (boucle).
function loopLength(order: Garage[], base: LatLng): number {
  if (order.length === 0) return 0;
  let total = haversineKm(base, order[0]);
  for (let i = 0; i < order.length - 1; i++) total += haversineKm(order[i], order[i + 1]);
  total += haversineKm(order[order.length - 1], base);
  return total;
}

// Plus proche voisin depuis la base.
function nearestNeighbor(points: Garage[], base: LatLng): Garage[] {
  const remaining = [...points];
  const order: Garage[] = [];
  let current: LatLng = base;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    order.push(next);
    current = next;
  }
  return order;
}

// Amélioration 2-opt (réduit les croisements) sur une boucle base -> … -> base.
function twoOpt(order: Garage[], base: LatLng): Garage[] {
  if (order.length < 4) return order;
  let best = [...order];
  let bestLen = loopLength(best, base);
  let improved = true;
  let guard = 0;
  while (improved && guard < 60) {
    improved = false;
    guard++;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const len = loopLength(candidate, base);
        if (len < bestLen - 0.0001) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
}

// Circuit optimisé (boucle depuis la base) : ordre de passage des garages.
export function optimizeRoute(points: Garage[], base: LatLng = KENITRA): Garage[] {
  if (points.length <= 1) return [...points];
  return twoOpt(nearestNeighbor(points, base), base);
}

export type DayPlan = {
  jour: number;
  garages: Garage[];
  distanceKm: number;
  // Polyligne du jour, connecteurs inclus (départ du jour -> garages -> arrivée/retour).
  line: LatLng[];
};

// Découpe le circuit optimisé en journées selon un plafond de km/jour.
// Jour 1 part de la base ; les jours suivants repartent du dernier garage de la veille
// (on dort sur la route) ; le dernier jour revient à la base.
export function planDays(ordered: Garage[], base: LatLng, kmCap: number): DayPlan[] {
  if (ordered.length === 0) return [];
  const cap = Math.max(20, kmCap);
  const days: Garage[][] = [];
  let currentDay: Garage[] = [];
  let from: LatLng = base;
  let dayDist = 0;

  for (const g of ordered) {
    const leg = haversineKm(from, g);
    if (currentDay.length > 0 && dayDist + leg > cap) {
      days.push(currentDay);
      currentDay = [g];
      dayDist = leg; // ce trajet ouvre la nouvelle journée
    } else {
      currentDay.push(g);
      dayDist += leg;
    }
    from = g;
  }
  if (currentDay.length > 0) days.push(currentDay);

  // Construit les polylignes + distances (avec connecteurs entre jours et retour final).
  return days.map((garages, idx) => {
    const start: LatLng = idx === 0 ? base : days[idx - 1][days[idx - 1].length - 1];
    const isLast = idx === days.length - 1;
    const line: LatLng[] = [start, ...garages];
    if (isLast) line.push(base); // retour à Kénitra à la fin
    let distanceKm = 0;
    for (let i = 0; i < line.length - 1; i++) distanceKm += haversineKm(line[i], line[i + 1]);
    return { jour: idx + 1, garages, distanceKm: Math.round(distanceKm), line };
  });
}

// Lien de navigation Google Maps vers un point (ouvre l'app GPS sur mobile).
export function gmapsTo(p: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
}

// Lien Google Maps pour tout l'itinéraire d'un jour (avec waypoints), boucle depuis la base.
export function gmapsRoute(garages: Garage[], base: LatLng = KENITRA): string {
  if (garages.length === 0) return "";
  const origin = `${base.lat},${base.lng}`;
  const dest = origin; // boucle : retour à la base
  const waypoints = garages.map((g) => `${g.latitude},${g.longitude}`).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
}
