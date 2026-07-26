// Mémo d'images (perf) : retenir, par référence, QUELLE variante d'URL fonctionne
// (ou que TOUT échoue → placeholder direct). Sans ça, un filtre sans vraie photo
// déclenche jusqu'à 5 requêtes Scene7 en 404 avant d'afficher le logo — à CHAQUE
// affichage. Sur une liste de catalogue dense = des centaines de requêtes perdues.
// Ici on mémorise l'index gagnant en localStorage → la 2ᵉ ouverture est instantanée.
const KEY = "fp_img_idx_v1";
let mem: Record<string, number> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function load(): Record<string, number> {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { mem = {}; }
  return mem!;
}

export function getImgIdx(k: string): number | null {
  if (typeof window === "undefined") return null;
  const v = load()[k];
  return typeof v === "number" ? v : null;
}

export function setImgIdx(k: string, i: number) {
  if (typeof window === "undefined") return;
  const m = load();
  if (m[k] === i) return;
  m[k] = i;
  // Écriture différée (les images se chargent par rafales) pour ne pas
  // sérialiser tout le dictionnaire à chaque onLoad/onError.
  if (timer) return;
  timer = setTimeout(() => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {} }, 800);
}
