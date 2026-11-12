// Numéros VIN (docs/VIN_ANALYSE.md) : nettoyage, contrôle, constructeur, année probable, famille.
// Un VIN européen NE contient PAS le code moteur : on ne devine jamais le moteur à partir des 17 caractères.
//
// Tableau des constructeurs (WMI = 3 premiers caractères) vérifié le 12/11/2026 sur la liste Wikibooks
// « World Manufacturer Identifier » (révision du 04/11/2026). Ne rien ajouter sans source.
// - nom   : nom affiché (et nom utilisé dans la table `vehicules` de l'onglet « Par véhicule »)
// - motif : filtre ILIKE sur `applications.marque` (données Filtron), ex. « DACIA (RENAULT GROUP) »

export type MarqueVin = { nom: string; motif: string; detail?: string };

const M = (nom: string, motif: string, detail?: string): MarqueVin => ({ nom, motif, detail });

const WMI: Record<string, MarqueVin> = {
  // France
  VF1: M("Renault", "RENAULT"), VF2: M("Renault Trucks", "RENAULT TRUCKS%"), VF6: M("Renault Trucks", "RENAULT TRUCKS%", "y compris utilitaires Renault"),
  VF8: M("Renault", "RENAULT", "Matra (Espace I-III, Avantime)"), VS5: M("Renault", "RENAULT", "usine Espagne"),
  VF3: M("Peugeot", "PEUGEOT%"), VR3: M("Peugeot", "PEUGEOT%", "Stellantis"),
  VF7: M("Citroën", "CITRO%"), VR7: M("Citroën", "CITRO%", "Stellantis"), VS7: M("Citroën", "CITRO%", "usine Espagne"),
  VR1: M("DS", "DS%"),
  VNK: M("Toyota", "TOYOTA%", "usine France"),
  // Roumanie
  UU1: M("Dacia", "DACIA%"),
  // Allemagne
  WVW: M("Volkswagen", "VW%"), WV1: M("Volkswagen", "VW%", "utilitaire"), WV2: M("Volkswagen", "VW%", "minibus"),
  WAU: M("Audi", "AUDI%"), TRU: M("Audi", "AUDI%", "usine Hongrie"),
  WBA: M("BMW", "BMW%"), WBS: M("BMW", "BMW%", "BMW M"), WBX: M("BMW", "BMW%", "SUV"),
  WDB: M("Mercedes", "MERCEDES%"), WDD: M("Mercedes", "MERCEDES%"), WDC: M("Mercedes", "MERCEDES%", "SUV"),
  W1K: M("Mercedes", "MERCEDES%"), W1N: M("Mercedes", "MERCEDES%", "SUV"),
  WF0: M("Ford", "FORD%", "Ford Allemagne"),
  W0L: M("Opel", "OPEL%"), W0V: M("Opel", "OPEL%"),
  // Turquie
  NM0: M("Ford", "FORD%", "Ford Otosan"), NMT: M("Toyota", "TOYOTA%", "usine Turquie"),
  // Royaume-Uni
  SB1: M("Toyota", "TOYOTA%", "usine Royaume-Uni"), SJN: M("Nissan", "NISSAN%", "usine Royaume-Uni"), SHH: M("Honda", "HONDA%", "usine Royaume-Uni"),
  // Japon
  JTD: M("Toyota", "TOYOTA%"), JTN: M("Toyota", "TOYOTA%"), JT2: M("Toyota", "TOYOTA%"), JTE: M("Toyota", "TOYOTA%", "SUV / monospace"),
  JN1: M("Nissan", "NISSAN%"), JN3: M("Nissan", "NISSAN%"),
  JHM: M("Honda", "HONDA%"),
  // Corée et usines Hyundai / Kia
  KMH: M("Hyundai", "HYUNDAI%"), KMF: M("Hyundai", "HYUNDAI%", "utilitaire"),
  TMA: M("Hyundai", "HYUNDAI%", "usine République tchèque"), MAL: M("Hyundai", "HYUNDAI%", "usine Inde"),
  KNA: M("Kia", "KIA%"), KNE: M("Kia", "KIA%", "export Europe"), KNC: M("Kia", "KIA%", "utilitaire"), KND: M("Kia", "KIA%", "SUV / monospace"),
  U5Y: M("Kia", "KIA%", "usine Slovaquie"), U6Y: M("Kia", "KIA%", "usine Slovaquie"),
  KNM: M("Renault", "RENAULT", "Renault Samsung / Renault Korea"),
  // Espagne, Tchéquie, Hongrie
  VSK: M("Nissan", "NISSAN%", "usine Espagne"),
  VSS: M("Seat", "SEAT%"),
  TMB: M("Skoda", "SKODA%"),
  TSM: M("Suzuki", "SUZUKI%", "usine Hongrie"),
  // Italie
  ZFA: M("Fiat", "FIAT%"), ZAR: M("Alfa Romeo", "ALFA%"),
  // Inde
  MAT: M("Tata", "TATA%"), MA3: M("Suzuki", "SUZUKI%", "Maruti Suzuki"),
  // Chine
  LVV: M("Chery", "CHERY%"), LSJ: M("MG", "MG%"), L6T: M("Geely", "GEELY%"),
  // Maroc (seul code marocain de la liste)
  DF9: M("Laraki", "LARAKI%", "Maroc"),
};

/** Marques proposées en boutons (comme partslink24 : on peut choisir la marque avant de taper le VIN ou le code
 *  moteur). Les premières sont les plus courantes au Maroc ; le reste va dans « Autres marques ». */
export const MARQUES_COURANTES: MarqueVin[] = [
  M("Dacia", "DACIA%"), M("Renault", "RENAULT"), M("Peugeot", "PEUGEOT%"), M("Citroën", "CITRO%"),
  M("Hyundai", "HYUNDAI%"), M("Kia", "KIA%"), M("Volkswagen", "VW%"), M("Toyota", "TOYOTA%"),
];
export const AUTRES_MARQUES: MarqueVin[] = [
  M("Alfa Romeo", "ALFA%"), M("Audi", "AUDI%"), M("BMW", "BMW%"), M("Chery", "CHERY%"), M("DS", "DS%"),
  M("Fiat", "FIAT%"), M("Ford", "FORD%"), M("Geely", "GEELY%"), M("Honda", "HONDA%"), M("Mercedes", "MERCEDES%"),
  M("MG", "MG%"), M("Nissan", "NISSAN%"), M("Opel", "OPEL%"), M("Seat", "SEAT%"), M("Skoda", "SKODA%"),
  M("Suzuki", "SUZUKI%"), M("Tata", "TATA%"),
];

/** Majuscules, sans espaces ni tirets. Les lettres O, I et Q sont interdites dans un VIN : O→0, I→1, Q→0. */
export function nettoyerVin(raw: string): string {
  return raw.toUpperCase().replace(/[\s\-._]/g, "").replace(/O/g, "0").replace(/I/g, "1").replace(/Q/g, "0");
}

/** 17 caractères, chiffres et lettres sauf I, O, Q. (Le 9ᵉ caractère « contrôle » n'est obligatoire qu'en Amérique du Nord.) */
export function vinValide(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

/** Constructeur d'après les 3 premiers caractères, ou null si le code n'est pas dans le tableau vérifié. */
export function constructeur(vin: string): MarqueVin | null {
  return vin.length >= 3 ? WMI[vin.slice(0, 3)] ?? null : null;
}

// 10ᵉ caractère = année modèle… seulement chez les constructeurs qui l'utilisent (obligatoire en Amérique du Nord,
// PAS en Europe). C'est donc une INDICATION à confirmer, jamais un filtre obligatoire.
const ANNEES: Record<string, number> = {
  "1": 2001, "2": 2002, "3": 2003, "4": 2004, "5": 2005, "6": 2006, "7": 2007, "8": 2008, "9": 2009,
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017, J: 2018, K: 2019,
  L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
};
export function anneeProbable(vin: string): number | null {
  return vin.length >= 10 ? ANNEES[vin[9]] ?? null : null;
}

/** « Famille » du VIN : constructeur + partie descriptive (8 premiers caractères, sans le caractère de contrôle). */
export function familleVin(vin: string): string {
  return vin.slice(0, 8);
}

/** Ressemble à un code moteur (ex. K9K, K9K 612, H4D, DV6FC, B4D 401) : au moins une lettre et un chiffre, 3 à 10 caractères. */
export function ressembleCodeMoteur(q: string): boolean {
  const t = q.trim().toUpperCase();
  const compact = t.replace(/\s+/g, "");
  return compact.length >= 3 && compact.length <= 10 && /[A-Z]/.test(compact) && /\d/.test(compact) && /^[A-Z0-9 ]+$/.test(t);
}

/** Motifs ILIKE pour retrouver un code moteur saisi avec ou sans espace (« K9K612 » trouve « K9K 612 »). */
export function motifsCodeMoteur(q: string): string[] {
  const t = q.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "");
  const out = new Set<string>([`%${t.replace(/\s+/g, "%")}%`]);
  const c = t.replace(/\s+/g, "");
  if (c.length > 3) out.add(`%${c.slice(0, 3)}%${c.slice(3)}%`);
  return [...out];
}
