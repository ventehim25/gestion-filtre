"use client";
// Catalogues /tarif et /catalogue rangés par FAMILLE (Filtres et huile, Distribution moteur, Freinage…) — BIBLE §8.32.
// Rubrique avec marchandise : les articles (rendus par la page : avec prix pour /tarif, sans prix pour /catalogue).
// Rubrique sans stock : « 🔄 Réapprovisionnement en cours » + bouton pour demander sur WhatsApp.
// Les classes CSS (chip, fam, cat, rupture, det…) sont définies par chaque page dans son propre style.
import { useMemo, type ReactNode } from "react";
import { FAMILLES, familleDe, libelleCategorie, estFiltre, type Famille } from "@/lib/categories";
import { translations } from "@/lib/i18n";
import { CAT_FR } from "@/lib/catalogue";
import CategoryIcon from "./CategoryIcon";

type Base = { reference: string; marque: string; categorie: string; aliases?: string[]; ficheRef?: string; dents?: string };

const libelleFamille = (k: Famille) => translations.fr[FAMILLES.find((f) => f.k === k)!.cle];
const waDemande = (wa: string, cat: string) =>
  `https://wa.me/${wa}?text=${encodeURIComponent(`Salam 🙏 Vous avez des « ${cat} » ? (vu sur le catalogue FiltroPro)`)}`;

/** Onglets : Tout + les 9 familles (nombre d'articles disponibles ; famille vide en plus pâle). */
export function FamilleChips({ items, famille, setFamille }: {
  items: { categorie: string }[]; famille: Famille | ""; setFamille: (f: Famille | "") => void;
}) {
  const nb = useMemo(() => {
    const m: Partial<Record<Famille, number>> = {};
    for (const i of items) { const f = familleDe(i.categorie); m[f] = (m[f] ?? 0) + 1; }
    return m;
  }, [items]);
  return (
    <div className="chips">
      <button className={`chip ${famille === "" ? "on" : ""}`} onClick={() => setFamille("")}>Tout</button>
      {FAMILLES.filter((f) => f.k !== "autre" || nb.autre).map((f) => (
        <button key={f.k} className={`chip ${famille === f.k ? "on" : ""} ${nb[f.k] ? "" : "vide"}`} onClick={() => setFamille(f.k)}>
          {f.court}{nb[f.k] ? ` · ${nb[f.k]}` : ""}
        </button>
      ))}
    </div>
  );
}

/** Sections par famille puis par rubrique. `items` = déjà filtrés par la recherche ; en recherche, les rubriques vides
 *  ne s'affichent pas (sinon on montre « Réapprovisionnement en cours » pour chaque rubrique sans stock). */
export function SectionsParFamille<T extends Base>({ items, famille, recherche, wa, renderItem }: {
  items: T[]; famille: Famille | ""; recherche: boolean; wa: string; renderItem: (i: T, idx: number) => ReactNode;
}) {
  const parCat = useMemo(() => {
    const m = new Map<string, T[]>();
    for (const i of items) { const a = m.get(i.categorie) ?? []; a.push(i); m.set(i.categorie, a); }
    return m;
  }, [items]);

  return (
    <>
      {FAMILLES.filter((f) => !famille || f.k === famille).map((f) => {
        const pleines = f.categories.filter((c) => parCat.has(c));
        const vides = f.categories.filter((c) => !parCat.has(c));
        if (recherche && pleines.length === 0) return null;
        if (f.k === "autre" && pleines.length === 0) return null;
        return (
          <section key={f.k}>
            <div className="fam"><CategoryIcon categorie={f.icone} size={18} /> {libelleFamille(f.k)}</div>
            {pleines.map((c) => (
              <div key={c}>
                <div className="cat">{CAT_FR[c] ?? libelleCategorie(c)}</div>
                {parCat.get(c)!.map((i, idx) => renderItem(i, idx))}
              </div>
            ))}
            {!recherche && vides.length > 0 && (famille ? (
              // Une famille choisie : une ligne par rubrique sans stock
              vides.map((c) => (
                <div key={c} className="rupture">
                  <div>
                    <div className="rt">{CAT_FR[c] ?? libelleCategorie(c)}</div>
                    <div className="rm">🔄 Réapprovisionnement en cours</div>
                  </div>
                  <a className="ask" href={waDemande(wa, CAT_FR[c] ?? libelleCategorie(c))} target="_blank" rel="noreferrer">Demander</a>
                </div>
              ))
            ) : (
              // Vue « Tout » : les rubriques sans stock de la famille, regroupées sur une ligne
              <div className="rupture">
                <div>
                  <div className="rm">🔄 Réapprovisionnement en cours</div>
                  <div className="rl">{vides.map((c) => CAT_FR[c] ?? libelleCategorie(c)).join(" · ")}</div>
                </div>
                <a className="ask" href={waDemande(wa, libelleFamille(f.k))} target="_blank" rel="noreferrer">Demander</a>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}

/** Détails d'un article (ouverts d'un tap) : disponibilité, type, marque, références équivalentes, fiche complète. */
export function DetailsArticle({ item, extra }: { item: Base; extra?: ReactNode }) {
  const propre = item.reference.toUpperCase().replace(/\s+/g, "");
  const autres = [...new Set((item.aliases ?? []).filter((a) => a && a !== propre))].slice(0, 8);
  return (
    <div className="det">
      <div><span className="ok">✓ En stock</span> · livraison rapide aux garages</div>
      <div>Type : <b>{libelleCategorie(item.categorie)}</b> · Marque : <b>{item.marque}</b></div>
      {item.dents && <div>🦷 Nombre de dents / largeur : <b>{item.dents}</b></div>}
      {extra}
      {autres.length > 0 && <div>Aussi connu sous : <span className="mono">{autres.join(" · ")}</span></div>}
      {item.ficheRef && (
        <a className="lien" href={`/c/${encodeURIComponent(item.ficheRef)}`} target="_blank" rel="noreferrer">Fiche complète{estFiltre(item.categorie) ? " (véhicules compatibles)" : ""} →</a>
      )}
    </div>
  );
}
