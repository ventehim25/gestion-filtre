"use client";
// Options d'un menu de catégories, rangées par famille (Filtres et huile, Distribution moteur, Direction/Suspension/Train,
// Autres). Avec `avecFamilles` : une option « toute la famille » en tête de chaque groupe (filtres de liste). BIBLE §8.31.
import { FAMILLES, CATEGORY_KEYS, FILTRE_FAMILLE, type Famille } from "@/lib/categories";
import type { TranslationKey } from "@/lib/i18n";

export default function CategoryOptions({ t, avecFamilles = false, seulement }: {
  t: (k: TranslationKey) => string; avecFamilles?: boolean; seulement?: Famille[];
}) {
  return (
    <>
      {FAMILLES.filter((f) => !seulement || seulement.includes(f.k)).map((f) => (
        <optgroup key={f.k} label={t(f.cle)}>
          {avecFamilles && f.categories.length > 1 && <option value={FILTRE_FAMILLE + f.k}>— {t(f.cle)} (tout) —</option>}
          {f.categories.map((c) => <option key={c} value={c}>{t(CATEGORY_KEYS[c])}</option>)}
        </optgroup>
      ))}
    </>
  );
}
