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
