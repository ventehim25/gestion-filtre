// Classement Voiture vs Bus/Camion. Non destructif : sert à filtrer/afficher.
// Deux critères combinés :
//   1) préfixe de référence Filtron (CAMION_PREFIXES)
//   2) marques de véhicules compatibles : si elles sont majoritairement des
//      marques poids-lourd / bus / agricole / chantier -> camion.
export type VehKind = "voiture" | "camion";

// Préfixes bus / camion / poids lourd / industriel.
//  Huile : OM, OR, OT · Air : AM, AD, AE, AG · Carburant : PK
//  (PS, PM, AR = voiture)
export const CAMION_PREFIXES = new Set([
  "OM", "OR", "OT",
  "AM", "AD", "AE", "AG",
  "PK",
]);

// Mots-clés de marques poids-lourd / bus / agricole / chantier (distinctifs, pour
// éviter les faux positifs sur les marques de voitures). Marques "doubles" comme
// Mercedes-Benz / Volvo / Renault NE sont volontairement PAS listées.
const HEAVY_KEYWORDS = [
  "TRUCK", "BUS", "TRACTOR", "TRACTEUR",
  "DENNIS", "DEUTZ", "ERF", "SCANIA", "IVECO", "DAF", "KAMAZ", "LIEBHERR",
  "CASE-IH", "CASE IH", "NEW HOLLAND", "CLAAS", "FENDT", "JOHN DEERE", "MASSEY",
  "VALTRA", "ZETOR", "URSUS", "LANDINI", "JELCZ", "AUTOSAN", "KRAZ", "MAZ",
  "URAL", "TATRA", "LIAZ", "AVIA", "MULTICAR", "MANITOU", "MAGNI", "EVOBUS",
  "SETRA", "NEOPLAN", "SOLARIS", "VAN HOOL", "IRISBUS", "VDL", "BOVA", "BREDA",
  "MENARINI", "BELL EQUIPMENT", "JCB", "CATERPILLAR", "KOMATSU", "TEREX",
  "BOMAG", "DOOSAN", "KUBOTA", "YANMAR", "STEYR", "TEMSA", "OTOKAR",
  "BUMAR", "AGRIFULL", "ANTONIO CARRARO", "AKERMAN", "ANDORIA", "HANOMAG",
  "ASHOK LEYLAND", "AUWAERTER", "BUESSING", "AGRIA", "AEBI", "AMMANN", "BAUTZ",
];

export function refPrefix(reference: string): string {
  return (reference.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
}

function isHeavyMake(make: string): boolean {
  const m = (make || "").toUpperCase();
  return HEAVY_KEYWORDS.some((k) => m.includes(k));
}

// Règle de plage série PM : PM800 → PM815 (base) = camion ; PM815/1 et au-delà = voiture.
function pmIsCamion(reference: string): boolean {
  const m = reference.toUpperCase().match(/^PM\s*(\d+)(?:\/(\d+))?/);
  if (!m) return false;
  const num = +m[1], variant = m[2] ? +m[2] : 0;
  return num >= 800 && (num < 815 || (num === 815 && variant === 0));
}

// Classement principal : prend la référence + (optionnel) les marques compatibles.
export function classifyKind(reference: string, makes?: string[] | null): VehKind {
  if (CAMION_PREFIXES.has(refPrefix(reference))) return "camion";
  if (pmIsCamion(reference)) return "camion";
  if (makes && makes.length) {
    const heavy = makes.filter(isHeavyMake).length;
    // majorité (ou égalité) de marques poids-lourd -> camion
    if (heavy > 0 && heavy >= makes.length - heavy) return "camion";
  }
  return "voiture";
}

// Variante préfixe seul (compat). Préférer classifyKind quand les marques sont dispo.
export function vehKind(reference: string): VehKind {
  return CAMION_PREFIXES.has(refPrefix(reference)) ? "camion" : "voiture";
}
