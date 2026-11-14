// Copie de secours des photos de filtres (BIBLE §8.14, 14/11/2026).
// scripts/copier_photos.mjs copie chaque photo du serveur MANN+HUMMEL (Scene7) dans Supabase Storage :
// produits/copie/<NOM>.jpg. L'app ne l'affiche qu'en dernier essai, si Scene7 ne répond plus.
// Le calcul du nom doit rester le même que copieKey() dans le script.
import { SUPABASE_PUBLIC_URL } from "@/lib/supabase";

// "OP540/1" -> "OP_540.1"  (nom d'asset Scene7 Filtron / MANN+HUMMEL)
export function s7Name(ref: string) {
  const m = ref.toUpperCase().match(/^([A-Z]+)\s*(.+)$/);
  return m ? m[1] + "_" + m[2].replace(/\//g, ".") : ref.toUpperCase();
}

export function photoCopieUrl(ref: string) {
  const nom = s7Name(ref).replace(/[^A-Za-z0-9._-]/g, "_");
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/produits/copie/${nom}.jpg`;
}
