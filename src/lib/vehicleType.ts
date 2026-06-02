// Classement Voiture vs Bus/Camion par préfixe de référence Filtron.
// Non destructif : sert uniquement à filtrer/afficher. Ajuste la liste ci-dessous
// si un préfixe doit changer de catégorie.
export type VehKind = "voiture" | "camion";

// Préfixes considérés bus / camion / poids lourd / industriel.
//  - Huile  : OM, OR, OT
//  - Air    : AM (gros filtres), AD, AE, AG (éléments PL)
//  (PS/PM = carburant VOITURE ; AR = air VOITURE, donc non listés)
export const CAMION_PREFIXES = new Set([
  "OM", "OR", "OT",
  "AM", "AD", "AE", "AG",
]);

export function refPrefix(reference: string): string {
  return (reference.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
}

export function vehKind(reference: string): VehKind {
  return CAMION_PREFIXES.has(refPrefix(reference)) ? "camion" : "voiture";
}
