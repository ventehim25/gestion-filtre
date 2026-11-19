// Photo représentative par type de filtre (affichée pour chaque référence)
const PHOTOS: Record<string, string> = {
  filtre_huile: "photo-1632245889029-e406faaa34cd",
  filtre_air: "photo-1605559424843-9e4c228bf1c2",
  filtre_carburant: "photo-1517524008697-84bbe3c3fd98",
  filtre_habitacle: "photo-1581092335397-9583eb92d232",
  filtre_refroidissement: "photo-1486262715619-67b85e0b08d3",
  huile_moteur: "photo-1486262715619-67b85e0b08d3",
  autre: "photo-1486262715619-67b85e0b08d3",
};

export function filterPhoto(cat: string, w = 160): string {
  const id = PHOTOS[cat] ?? PHOTOS.autre;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
}

// Placeholder « appareil photo » quand le filtre n'a pas encore de vraie photo.
// Montre clairement quels produits restent à photographier (au lieu d'une image générique).
const CAMERA_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
  "<rect width='120' height='120' fill='#f4efe4'/>" +
  "<g fill='none' stroke='#c9b47e' stroke-width='5' stroke-linejoin='round' stroke-linecap='round'>" +
  "<rect x='20' y='44' width='80' height='52' rx='9'/>" +
  "<path d='M45 44 l7-11 h16 l7 11'/>" +
  "<circle cx='60' cy='71' r='14'/></g>" +
  "<circle cx='88' cy='56' r='3.5' fill='#c9b47e'/></svg>";
export function cameraPlaceholder(): string {
  return "data:image/svg+xml," + encodeURIComponent(CAMERA_SVG);
}

// Placeholder « logo FiltroPro » — pour les catalogues (côté client) : reste pro et branché
// même sans vraie photo.
const LOGO_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
  "<rect width='120' height='120' fill='#f6f2ea'/>" +
  "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f43f5e'/><stop offset='.6' stop-color='#dc2626'/><stop offset='1' stop-color='#7f1d1d'/></linearGradient></defs>" +
  "<g transform='translate(36,28)'>" +
  "<path d='M24 2.5 41.55 12.75 V33.25 L24 43.5 6.45 33.25 V12.75 Z' fill='url(#g)'/>" +
  "<g stroke='#fff' stroke-width='2.6' stroke-linecap='round' fill='none'><path d='M13 18 C 19.5 13.5, 28.5 13.5, 35 18'/><path d='M13 24 C 19.5 19.5, 28.5 19.5, 35 24'/><path d='M13 30 C 19.5 25.5, 28.5 25.5, 35 30'/></g>" +
  "<circle cx='35' cy='18' r='2.1' fill='#fff'/></g>" +
  "<text x='60' y='103' text-anchor='middle' font-family='Arial,sans-serif' font-size='13' font-weight='700' fill='#b8860b' letter-spacing='.5'>FiltroPro</text>" +
  "</svg>";
export function logoPlaceholder(): string {
  return "data:image/svg+xml," + encodeURIComponent(LOGO_SVG);
}

// Dessin propre par type de pièce (19/11/2026, choix de l'utilisateur « 2 ») : pour les pièces sans photo dans les
// catalogues officiels (Gates : kits, courroies, galets, chaînes…) — au lieu de l'appareil photo. Une vraie photo
// (prise par l'utilisateur ou tirée d'un catalogue) passe toujours avant. BIBLE §8.48.
const FOND = "<rect width='120' height='120' fill='#f4efe4'/>";
const SOMBRE = "#3f3a33", OR = "#b8963e", GRIS = "#d9d2c3", EAU = "#3b82c4", FRICTION = "#8d8676";
const svg = (corps: string) => "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" + FOND + corps + "</svg>";
const poulie = (cx: number, cy: number, r: number) =>
  `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${GRIS}' stroke='${SOMBRE}' stroke-width='3'/>` +
  `<circle cx='${cx}' cy='${cy}' r='${Math.round(r * 0.55)}' fill='none' stroke='${SOMBRE}' stroke-width='2'/>` +
  `<circle cx='${cx}' cy='${cy}' r='${Math.max(3, Math.round(r * 0.22))}' fill='${OR}'/>`;
const goutte = (x: number, y: number) =>
  `<path d='M${x} ${y - 11} C ${x + 8} ${y - 1}, ${x + 8} ${y + 7}, ${x} ${y + 7} C ${x - 8} ${y + 7}, ${x - 8} ${y - 1}, ${x} ${y - 11} Z' fill='${EAU}'/>`;
const deg = (a: number) => (a * Math.PI) / 180;
const ILLUSTRATIONS: Record<string, string> = {
  courroie_distribution: svg(
    `<rect x='22' y='40' width='76' height='40' rx='20' fill='none' stroke='${SOMBRE}' stroke-width='7'/>` +
    `<rect x='17' y='35' width='86' height='50' rx='25' fill='none' stroke='${SOMBRE}' stroke-width='4' stroke-dasharray='3 3.5'/>`),
  courroie_accessoire: svg(
    `<rect x='18' y='38' width='84' height='44' rx='22' fill='none' stroke='${SOMBRE}' stroke-width='11'/>` +
    `<rect x='18' y='38' width='84' height='44' rx='22' fill='none' stroke='${GRIS}' stroke-width='1.5'/>`),
  kit_courroie_accessoire: svg(
    `<rect x='14' y='30' width='92' height='50' rx='25' fill='none' stroke='${SOMBRE}' stroke-width='8'/>` + poulie(36, 55, 15) + poulie(84, 55, 11) + poulie(60, 96, 9)),
  galet_distribution: svg(
    poulie(56, 56, 34) + `<path d='M56 56 L98 94' stroke='${SOMBRE}' stroke-width='6' stroke-linecap='round'/><circle cx='98' cy='94' r='6' fill='${SOMBRE}'/><circle cx='56' cy='56' r='7' fill='${OR}'/>`),
  poulie: svg(poulie(60, 60, 38) + `<circle cx='60' cy='60' r='30' fill='none' stroke='${SOMBRE}' stroke-width='1.5' stroke-dasharray='2 2'/>`),
  kit_distribution: svg(
    `<path d='M30 38 A 20 20 0 1 0 30 78 L 86 70 A 14 14 0 1 0 86 42 Z' fill='none' stroke='${SOMBRE}' stroke-width='7' stroke-linejoin='round'/>` +
    poulie(30, 58, 15) + poulie(86, 56, 10) + poulie(60, 98, 9)),
  kit_distribution_pompe: svg(
    `<path d='M28 34 A 20 20 0 1 0 28 74 L 82 66 A 14 14 0 1 0 82 38 Z' fill='none' stroke='${SOMBRE}' stroke-width='7' stroke-linejoin='round'/>` +
    poulie(28, 54, 15) + poulie(82, 52, 10) + goutte(100, 100) +
    `<circle cx='70' cy='96' r='12' fill='${GRIS}' stroke='${SOMBRE}' stroke-width='3'/><path d='M70 86 v20 M60 96 h20 M63 89 l14 14 M77 89 l-14 14' stroke='${SOMBRE}' stroke-width='1.8'/>`),
  chaine_distribution: svg(
    [0, 1, 2, 3].map((i) => `<rect x='${12 + i * 25}' y='${i % 2 ? 50 : 46}' width='34' height='${i % 2 ? 20 : 28}' rx='${i % 2 ? 10 : 14}' fill='none' stroke='${SOMBRE}' stroke-width='5'/>`).join("") +
    [0, 1, 2, 3].map((i) => `<circle cx='${22 + i * 25}' cy='60' r='3.5' fill='${OR}'/>`).join("")),
  pompe_eau: svg(
    `<path d='M30 40 L72 30 L96 52 L88 88 L48 96 L24 74 Z' fill='${GRIS}' stroke='${SOMBRE}' stroke-width='3' stroke-linejoin='round'/>` + poulie(60, 62, 18) + goutte(98, 30)),
  plaquette_frein: svg(
    `<path d='M16 50 Q60 24 104 50 L100 86 Q60 70 20 86 Z' fill='${GRIS}' stroke='${SOMBRE}' stroke-width='3' stroke-linejoin='round'/>` +
    `<path d='M24 58 Q60 38 96 58 L93 80 Q60 66 27 80 Z' fill='${FRICTION}'/><path d='M60 46 v28' stroke='${GRIS}' stroke-width='2.5'/>`),
  disque_frein: svg(
    `<circle cx='60' cy='60' r='44' fill='${GRIS}' stroke='${SOMBRE}' stroke-width='3'/>` +
    `<circle cx='60' cy='60' r='18' fill='#f4efe4' stroke='${SOMBRE}' stroke-width='3'/><circle cx='60' cy='60' r='6' fill='${SOMBRE}'/>` +
    [0, 72, 144, 216, 288].map((a) => `<circle cx='${(60 + 12 * Math.cos(deg(a))).toFixed(1)}' cy='${(60 + 12 * Math.sin(deg(a))).toFixed(1)}' r='2.2' fill='${SOMBRE}'/>`).join("") +
    [20, 65, 110, 155, 200, 245, 290, 335].map((a) => `<path d='M${(60 + 26 * Math.cos(deg(a))).toFixed(1)} ${(60 + 26 * Math.sin(deg(a))).toFixed(1)} L${(60 + 40 * Math.cos(deg(a))).toFixed(1)} ${(60 + 40 * Math.sin(deg(a))).toFixed(1)}' stroke='${FRICTION}' stroke-width='2.2'/>`).join("")),
};
/** Dessin du type de pièce (data URI), ou null si on n'en a pas (les filtres ont leurs photos MANN). */
export function illustrationPiece(categorie?: string | null): string | null {
  const s = categorie ? ILLUSTRATIONS[categorie] : undefined;
  return s ? "data:image/svg+xml," + encodeURIComponent(s) : null;
}
