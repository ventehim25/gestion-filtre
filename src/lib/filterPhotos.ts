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
