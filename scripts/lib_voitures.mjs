// Rapprochement des voitures d'un catalogue officiel (Gates, Metelli…) avec les voitures Filtron déjà en base.
// Partagé par scripts/import_gates_pdf.mjs et scripts/import_metelli_freins.mjs (BIBLE §8.34, §8.35).
// Règle : code moteur exact d'abord ; famille (« K9K », « M 266 ») seulement si Filtron n'a que la famille
// (le code exact du catalogue est alors écrit dans la remarque) ; codes différents = jamais relié.

export const sansAccent = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
export const codeNorm = (s) => sansAccent(s).replace(/[^A-Z0-9]/g, "");

/** Codes moteur écrits de toutes les façons (Filtron comme les catalogues) :
 *  « K9K 790/792 » → K9K790, K9K792 · « DV4TD/TED/TED4, DV4C » → DV4TD, DV4TED, DV4TED4, DV4C
 *  « HFZ / HFX (TU1JP) » → HFZ, HFX, TU1JP · « RHY (DW10TD) » → RHY, DW10TD · « K4M » → K4M.
 *  « CJAA, CFCA » (VW) → CJAA, CFCA · « OM 607.951 (K9K) » → OM607951, K9K.
 *  Suffixe (jamais gardé seul) : que des chiffres (« 792 », « 632 ») ou, après « / », un morceau court derrière
 *  une famille PSA/Renault qui contient un chiffre (« DV4TD/TED » → DV4TED). Entre parenthèses = toujours un code complet. */
export function codes(s) {
  const out = new Set();
  let base = "";
  const txt = (s ?? "").replace(/\(([^)]*)\)/g, (m, x) => `,¤${x.split(/[,;\/]+/).join(",¤")},`);
  let sep = ",";
  for (const p of txt.split(/([,;\/])/)) {
    if (p === "," || p === ";" || p === "/") { sep = p === "/" ? "/" : ","; continue; }
    const entier = p.includes("¤");
    const n = codeNorm(p.replace(/¤/g, ""));
    if (!n) continue;
    const suffixe = !entier && base && !n.startsWith(base) &&
      (/^\d{1,4}$/.test(n) || (sep === "/" && n.length <= 4 && /\d/.test(base)));
    if (suffixe) { out.add(base + n); continue; }
    out.add(n);
    if (!entier) base = n.length >= 4 ? n.slice(0, 3) : "";
  }
  return [...out];
}

/** Clé du nom de modèle : 1er mot (2 si « GRAND »), pour chaque nom séparé par « / ».
 *  Mercedes : « CLASSE A », « A-Class », « A-Klasse » → « A » ; « DS 3 » = « DS3 ». */
export const clesModele = (nom) => sansAccent(nom)
  .replace(/\bCLASSE\s+([A-Z]+)\b/g, "$1").replace(/\b([A-Z]+)-(CLASS|KLASSE)\b/g, "$1").replace(/\bDS\s+(\d)/g, "DS$1")
  .split("/").map((a) => {
    const mots = a.split(/[^A-Z0-9]+/).filter(Boolean);
    return mots[0] === "GRAND" ? mots.slice(0, 2).join(" ") : mots[0];
  }).filter(Boolean);

export const nomFiltron = (modele) => { const i = modele.lastIndexOf(" | "); return i > 0 ? modele.slice(0, i) : modele; };
export const dateFiltron = (s) => { const m = (s ?? "").match(/(\d{1,2})\s*[/.-]\s*(\d{4})/); return m ? Number(m[2]) * 100 + Number(m[1]) : null; };
export const ecrireDate = (n) => (n ? `${String(n % 100).padStart(2, "0")}/${Math.floor(n / 100)}` : "");
export const ch = (kw) => Math.round(Number(kw) * 1.35962);
export const titreCase = (s) => s.toLowerCase().replace(/(^|[\s/(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

/** Voitures Filtron d'une marque (seulement celles des filtres : pas celles écrites par un import de catalogue). */
export async function voituresFiltron(sb, marque, exclure = ["Gates", "Metelli"]) {
  const base = () => {
    let q = sb.from("applications").select("marque, modele, moteur, code_moteur, annee_debut, annee_fin, puissance, products!inner(marque)", { count: "exact" })
      .eq("marque", marque);
    for (const e of exclure) q = q.neq("products.marque", e);
    return q;
  };
  const { count, error } = await base().range(0, 0);
  if (error) throw error;
  const pages = await Promise.all(Array.from({ length: Math.ceil((count ?? 0) / 1000) }, (_, i) =>
    base().range(i * 1000, i * 1000 + 999)));
  const vus = new Map();
  for (const p of pages) {
    if (p.error) throw p.error;
    for (const r of p.data) {
      const k = [r.modele, r.moteur, r.code_moteur, r.annee_debut, r.annee_fin, r.puissance].join("|");
      if (!vus.has(k)) vus.set(k, { ...r, products: undefined, cles: clesModele(nomFiltron(r.modele)), codes: codes(r.code_moteur), d: dateFiltron(r.annee_debut) ?? 0, f: dateFiltron(r.annee_fin) ?? 999912 });
    }
  }
  return { lignes: count ?? 0, voitures: [...vus.values()] };
}

/** Marque Filtron principale pour une marque de catalogue (« DACIA » → « DACIA (RENAULT GROUP) ») */
export const ALIAS = {
  VOLKSWAGEN: "VW (VOLKSWAGEN)", VW: "VW (VOLKSWAGEN)", CITROEN: "CITROEN", DACIA: "DACIA (RENAULT GROUP)", KIA: "KIA MOTORS",
  MERCEDES: "MERCEDES-BENZ", "MERCEDES-BENZ": "MERCEDES-BENZ", "MERCEDES BENZ": "MERCEDES-BENZ",
  CHEVROLET: "CHEVROLET EUROPE / DAEWOO (GM)", DS: "DS AUTOMOBILES",
};
// Autres noms Filtron dont les voitures sont aussi comparées (Chevrolet américaines ; DS 3 / DS 4 rangées chez Citroën)
export const AUSSI = { CHEVROLET: ["CHEVROLET"], DS: ["CITROEN"] };

export async function marqueFiltron(sb, marqueCatalogue) {
  const alias = ALIAS[sansAccent(marqueCatalogue)];
  if (alias) {
    const { count } = await sb.from("applications").select("id", { count: "exact", head: true }).eq("marque", alias);
    if (count) return alias;
  }
  const motif = `${sansAccent(marqueCatalogue).replace(/[^A-Z0-9]/g, "_")}%`;
  const { data, error } = await sb.from("applications").select("marque").ilike("marque", motif).limit(1000);
  if (error) throw error;
  const n = new Map();
  for (const r of data) n.set(r.marque, (n.get(r.marque) ?? 0) + 1);
  const exacte = [...n.keys()].find((m) => sansAccent(m) === sansAccent(marqueCatalogue));
  return exacte ?? [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? marqueCatalogue;
}

/** Voitures Filtron qui sont la même voiture : même modèle, puissance (ch, ±2), années qui se recouvrent,
 *  puis code moteur exact ; sinon famille (code catalogue = famille Filtron + 1 à 4 caractères).
 *  → { trouvees, famille } (famille = true si relié par la famille seulement). */
export function memesVoitures(voitures, { modele, codesMoteur, cv, d, f }) {
  const cles = clesModele(modele);
  const cg = codesMoteur.filter((c) => c.length >= 3);
  const memeModeleAnnees = (v) => v.cles.some((c) => cles.includes(c)) && v.d <= f && d <= v.f;
  const memes = (v) => memeModeleAnnees(v) && Math.abs(Number(v.puissance) - cv) <= 2;
  // Code précis (« D7F730 », « K9K796 », VW « CJAA ») = une seule version du moteur : les catalogues donnent parfois
  // une puissance un peu différente (Metelli 58 ch / Filtron 54 ch) → jusqu'à 8 %. Famille (« K4M », « M266 ») : ±2 ch.
  const precis = (c) => c.length >= 5 || (c.length === 4 && /^[A-Z]+$/.test(c));
  const tolerance = (c) => (precis(c) ? Math.max(3, Math.round(cv * 0.08)) : 2);
  let trouvees = voitures.filter((v) => memeModeleAnnees(v) && v.codes.some((c) => cg.includes(c) && Math.abs(Number(v.puissance) - cv) <= tolerance(c)));
  if (trouvees.length) return { trouvees, famille: false };
  trouvees = voitures.filter((v) => memes(v) && cg.some((c) => v.codes.some((b) => b.length >= 3 && c.length > b.length && c.length - b.length <= 4 && c.startsWith(b))));
  return { trouvees, famille: trouvees.length > 0 };
}
