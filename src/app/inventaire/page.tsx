"use client";
// Inventaire + régularisation + historique d'un article (nouveauté n° 6, BIBLE §8.41).
// Onglet « Compter » : feuille d'inventaire (tout ce qui a du stock), on tape ce qu'on compte, brouillon gardé, Valider.
// Onglet « Historique d'un article » : tous les mouvements d'une pièce + « Corriger le stock » avec un motif.
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ProductPicker, { type PickerVariant } from "@/components/ProductPicker";
import { loadAll } from "@/lib/pagedFetch";
import { chargerMarques } from "@/lib/brands";
import { useTypeVehicule, useChangementType, type TypeVehicule } from "@/lib/typeVehicule";
import {
  MOTIFS, abandonnerInventaire, articlesEnStock, cleArticle, corrigerStock, demarrerInventaire, historiqueArticle, inventaireEnCours,
  inventairesPasses, sauverComptage, validerInventaire, type Article, type Mouvement,
} from "@/lib/inventaire";
import type { Inventaire, Product } from "@/types/database";
import { ClipboardCheck, History, X, Search, ScanLine } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { supabase } from "@/lib/supabase";

const COUL: Record<Mouvement["type"], string> = {
  reception: "text-emerald-400", retour_fournisseur: "text-amber-300", vente: "text-sky-400", retour_client: "text-amber-300", correction: "text-fuchsia-300", transfert: "text-slate-400",
};

export default function InventairePage() {
  const [onglet, setOnglet] = useState<"compter" | "historique">("compter");
  const [typeV] = useTypeVehicule();
  const [msg, setMsg] = useState<string | null>(null);

  // ── Compter ──
  const [inv, setInv] = useState<Inventaire | null>(null);
  const [passes, setPasses] = useState<Inventaire[]>([]);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [comptes, setComptes] = useState<Record<string, string>>({});
  const [filtre, setFiltre] = useState("");
  const [seulementEcarts, setSeulementEcarts] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Historique ──
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<PickerVariant[]>([]);
  const [choisi, setChoisi] = useState<Product | null>(null);
  const [hist, setHist] = useState<{ mouvements: Mouvement[]; variantes: { id: string | null; nom: string; stock: number }[] } | null>(null);
  const [corr, setCorr] = useState<{ variante: string; sens: 1 | -1; qte: string; motif: string; note: string } | null>(null);

  async function chargerComptage(t: TypeVehicule = typeV) {
    const [i, p, a] = await Promise.all([inventaireEnCours(), inventairesPasses(), articlesEnStock(t)]);
    setInv(i); setPasses(p);
    // articles comptés hors feuille (stock 0 dans l'appli, boîte trouvée)
    const connus = new Set(a.map(cleArticle));
    const extra = (i?.lignes ?? []).filter((l) => !connus.has(cleArticle(l))).map((l) => ({ product_id: l.product_id, equivalence_id: l.equivalence_id, ref: l.ref ?? "?", stock: 0, prix_achat: 0 }));
    setArticles([...a, ...extra]);
    setComptes(Object.fromEntries((i?.lignes ?? []).map((l) => [cleArticle(l), String(l.compte)])));
  }
  async function chargerFiches(t: TypeVehicule = typeV) {
    const all = await loadAll<Product>("products", "*", { filter: (q) => q.eq("vehicule", t).order("reference") });
    setProducts(all);
    const marques = await chargerMarques();
    setVariants(await loadAll<PickerVariant>("equivalences", "id, product_id, marque, reference, products!inner(vehicule)",
      { filter: (q) => q.in("marque", marques).eq("products.vehicule", t).order("id"), countSelect: "id, products!inner(vehicule)" }));
  }
  useEffect(() => {
    chargerComptage().catch(() => setArticles([]));
    chargerFiches().catch(() => {});
    const id = new URLSearchParams(window.location.search).get("article");
    if (id) { setOnglet("historique"); ouvrirArticle(id); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useChangementType(typeV, (t) => { chargerComptage(t).catch(() => {}); chargerFiches(t).catch(() => {}); });

  const parCle = useMemo(() => new Map((articles ?? []).map((a) => [cleArticle(a), a])), [articles]);
  // Code inconnu associé à une référence : le code est retenu (fiche ou variante de marque, seulement s'il n'y en a pas)
  // puis la boîte est comptée — la suivante identique sera reconnue toute seule
  async function associerCode(p: Product, v?: PickerVariant) {
    const code = codeInconnu; if (!code) return;
    setCodeInconnu(null);
    if (v) await supabase.from("equivalences").update({ code_barre: code }).eq("id", v.id).is("code_barre", null);
    else { await supabase.from("products").update({ code_barre: code }).eq("id", p.id).is("code_barre", null); setProducts((prev) => prev.map((x) => (x.id === p.id && !x.code_barre ? { ...x, code_barre: code } : x))); }
    const k = `${p.id}|${v?.id ?? ""}`;
    const { data: st } = v ? await supabase.from("equivalences").select("stock, prix_achat").eq("id", v.id).single() : { data: { stock: p.stock, prix_achat: p.prix_achat } };
    compterArticle(parCle.get(k) ?? { product_id: p.id, equivalence_id: v?.id ?? null, ref: v ? `${v.reference} (${v.marque})` : p.reference, stock: Number((st as { stock: number | null } | null)?.stock ?? 0), prix_achat: Number((st as { prix_achat: number | null } | null)?.prix_achat ?? 0) });
  }

  // Réf. de chaque article (aussi ceux ajoutés par un scan à l'instant) pour le brouillon
  const refsRef = useRef<Map<string, string>>(new Map());
  useEffect(() => { for (const a of articles ?? []) refsRef.current.set(cleArticle(a), a.ref); }, [articles]);
  function planifierSauvegarde(nv: Record<string, string>) {
    if (!inv) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const lignes = Object.entries(nv).filter(([, x]) => x.trim() !== "" && !isNaN(Number(x))).map(([k, x]) => {
        const [product_id, eq] = k.split("|");
        return { product_id, equivalence_id: eq || null, compte: Math.max(0, Math.round(Number(x))), ref: refsRef.current.get(k) };
      });
      sauverComptage(inv.id, lignes).catch(() => {});
      setInv((prev) => (prev ? { ...prev, lignes } : prev));
    }, 700);
  }
  function taper(a: Article, v: string) {
    setComptes((prev) => { const nv = { ...prev, [cleArticle(a)]: v }; planifierSauvegarde(nv); return nv; });
  }

  // ── Compter au scanner (19-22/11/2026, BIBLE §8.53) : chaque boîte scannée = +1, sans rien taper ──
  const [camScan, setCamScan] = useState(false);
  const [codeScan, setCodeScan] = useState("");
  const [retourScan, setRetourScan] = useState<string>("");
  const [codeInconnu, setCodeInconnu] = useState<string | null>(null); // boîte scannée sans code connu → « c'est quelle réf. ? »
  async function compterScan(brut: string) {
    const code = brut.trim();
    if (!code) return;
    let a: Article | null = null;
    // 1) fiche (code-barres ou référence), 2) variante de marque (code-barres de la boîte Wix / Flag / Mann…)
    const p = products.find((x) => (x.code_barre && x.code_barre === code) || x.reference.toUpperCase() === code.toUpperCase());
    if (p) a = parCle.get(`${p.id}|`) ?? { product_id: p.id, equivalence_id: null, ref: p.reference, stock: p.stock, prix_achat: p.prix_achat };
    else {
      const { data } = await supabase.from("equivalences").select("id, product_id, marque, reference, stock, prix_achat").eq("code_barre", code).limit(1);
      const e = (data?.[0] ?? null) as { id: string; product_id: string; marque: string; reference: string; stock: number | null; prix_achat: number | null } | null;
      if (e) a = parCle.get(`${e.product_id}|${e.id}`) ?? { product_id: e.product_id, equivalence_id: e.id, ref: `${e.reference} (${e.marque})`, stock: e.stock ?? 0, prix_achat: Number(e.prix_achat ?? 0) };
    }
    if (!a) { setCamScan(false); setCodeInconnu(code); setRetourScan(`⚠ Code inconnu : ${code} — choisis sa référence`); return; }
    compterArticle(a);
  }
  // +1 sur un article (et il entre dans la liste s'il n'y était pas)
  function compterArticle(art: Article) {
    const k = cleArticle(art);
    refsRef.current.set(k, art.ref);
    if (!parCle.has(k)) setArticles((prev) => [art, ...(prev ?? [])]);
    setComptes((prev) => {
      const n = (Number(prev[k]) || 0) + 1;
      const nv = { ...prev, [k]: String(n) };
      planifierSauvegarde(nv);
      setRetourScan(`✓ ${art.ref} : ${n} compté${n > 1 ? "s" : ""}${art.stock ? ` (appli ${art.stock})` : ""}`);
      return nv;
    });
  }
  function ajouterHorsListe(p: Product, v?: PickerVariant) {
    const a: Article = { product_id: p.id, equivalence_id: v?.id ?? null, ref: v ? `${v.reference} (${v.marque})` : p.reference, stock: v ? 0 : p.stock, prix_achat: v ? 0 : p.prix_achat };
    if (!parCle.has(cleArticle(a))) setArticles((prev) => [a, ...(prev ?? [])]);
    setFiltre(a.ref.split(" ")[0]);
  }

  const lignesVues = (articles ?? []).filter((a) => {
    const t = filtre.trim().toLowerCase().replace(/\s+/g, "");
    if (t && !a.ref.toLowerCase().replace(/\s+/g, "").includes(t)) return false;
    if (seulementEcarts) { const c = comptes[cleArticle(a)]; return c !== undefined && c !== "" && Number(c) !== a.stock; }
    return true;
  });
  const comptees = (articles ?? []).filter((a) => (comptes[cleArticle(a)] ?? "") !== "");
  const ecarts = comptees.filter((a) => Number(comptes[cleArticle(a)]) !== a.stock);
  const valeurEcart = ecarts.reduce((s, a) => s + (Number(comptes[cleArticle(a)]) - a.stock) * a.prix_achat, 0);

  async function commencer() {
    try { setInv(await demarrerInventaire()); setMsg("Inventaire commencé : compte les boîtes et tape le nombre en face de chaque article. Tout est gardé au fur et à mesure."); }
    catch (e) { setMsg("Erreur : " + String((e as Error)?.message ?? e)); }
  }
  async function valider() {
    if (!inv) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    const lignes = comptees.map((a) => ({ product_id: a.product_id, equivalence_id: a.equivalence_id, compte: Math.max(0, Math.round(Number(comptes[cleArticle(a)]))), ref: a.ref }));
    if (!lignes.length) { setMsg("Compte au moins un article."); return; }
    if (!confirm(`Valider l'inventaire ?\n\n${lignes.length} article(s) compté(s), ${ecarts.length} écart(s) (${Math.round(valeurEcart)} MAD au prix d'achat).\n→ le stock de ces articles prend le nombre compté (les autres ne bougent pas). Chaque écart est noté « Inventaire ».`)) return;
    const prix = new Map((articles ?? []).map((a) => [cleArticle(a), a.prix_achat]));
    try {
      await sauverComptage(inv.id, lignes);
      const r = await validerInventaire({ ...inv, lignes }, prix, (f, t) => setValidation(`${f} / ${t}`));
      setValidation(null);
      setMsg(`Inventaire validé ✓ — ${r.corrections} stock(s) corrigé(s), écart ${Math.round(r.valeur)} MAD.`);
      chargerComptage();
    } catch (e) { setValidation(null); setMsg("Erreur pendant la validation (le reste est gardé, réessaie) : " + String((e as Error)?.message ?? e)); }
  }
  async function abandonner() {
    if (!inv || !confirm("Abandonner ce comptage ? (le stock ne change pas)")) return;
    await abandonnerInventaire(inv.id); setInv(null); setComptes({});
  }

  // ── Historique ──
  async function ouvrirArticle(id: string, p?: Product) {
    setHist(null);
    if (p) setChoisi(p);
    else {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      setChoisi(data as Product);
    }
    setHist(await historiqueArticle(id));
  }
  async function enregistrerCorrection() {
    if (!corr || !choisi) return;
    const q = Math.round(Number(corr.qte));
    if (!q || q < 0) { setMsg("Tape une quantité."); return; }
    try {
      const r = await corrigerStock({ product_id: choisi.id, equivalence_id: corr.variante || null, delta: corr.sens * q, motif: corr.motif, note: corr.note });
      setMsg(`Stock corrigé ✓ (${r.stock_avant} → ${r.stock_apres}).`);
      setCorr(null);
      ouvrirArticle(choisi.id, choisi);
    } catch (e) { setMsg("Erreur : " + String((e as Error)?.message ?? e)); }
  }
  let courant = (hist?.variantes ?? []).reduce((s, v) => s + v.stock, 0);

  return (
    <div>
      <Header title="inventory" />
      {msg && <div className="card p-3 mb-4 text-sm text-slate-200 flex justify-between gap-2">{msg}<button onClick={() => setMsg(null)}><X size={14} /></button></div>}
      <div className="flex rounded-lg bg-slate-800/60 p-0.5 mb-4 w-fit">
        <button onClick={() => setOnglet("compter")} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ${onglet === "compter" ? "bg-amber-500 text-black font-medium" : "text-slate-400"}`}><ClipboardCheck size={15} /> Compter</button>
        <button onClick={() => setOnglet("historique")} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ${onglet === "historique" ? "bg-amber-500 text-black font-medium" : "text-slate-400"}`}><History size={15} /> Historique d&apos;un article</button>
      </div>

      {onglet === "compter" && (
        <>
          {!inv ? (
            <div className="card p-5 mb-4">
              <p className="text-sm text-slate-300 mb-1">Un inventaire = compter les boîtes et corriger le stock de l&apos;appli.</p>
              <p className="text-xs text-slate-500 mb-4">La liste montre tout ce qui a du stock ({typeV === "camion" ? "🚛 camions" : "🚗 voitures"}). Tu tapes ce que tu comptes ; ce que tu ne comptes pas ne bouge pas. Tu peux t&apos;arrêter et reprendre plus tard.</p>
              <button onClick={commencer} className="btn-primary">📋 Commencer un inventaire</button>
              {passes.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-medium text-slate-400 mb-1">Inventaires faits</p>
                  {passes.map((p) => <p key={p.id} className="text-xs text-slate-500">{p.date.slice(8, 10)}/{p.date.slice(5, 7)}/{p.date.slice(0, 4)} · {p.note}</p>)}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="card p-4 mb-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-slate-300">Inventaire du {inv.date.slice(8, 10)}/{inv.date.slice(5, 7)}</span>
                  <span className="text-slate-400">compté <b className="text-slate-100">{comptees.length}</b> / {articles?.length ?? "…"}</span>
                  <span className="text-slate-400">écarts <b className={ecarts.length ? "text-amber-300" : "text-slate-100"}>{ecarts.length}</b></span>
                  <span className="text-slate-400">valeur <b className={valeurEcart < 0 ? "text-red-400" : "text-emerald-400"}>{Math.round(valeurEcart)} MAD</b></span>
                  <span className="ms-auto flex gap-2">
                    <button onClick={abandonner} className="btn-secondary text-xs">Abandonner</button>
                    <button onClick={valider} disabled={!!validation} className="btn-primary text-xs disabled:opacity-50">{validation ? `Validation ${validation}…` : "✓ Valider l'inventaire"}</button>
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <label className="relative block">
                  <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input className="input ps-8" placeholder="Filtrer la liste (réf.)" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
                </label>
                <div>
                  <ProductPicker products={products} variants={variants} value="" onSelect={(p, v) => ajouterHorsListe(p, v)} placeholder="➕ Boîte pas dans la liste (réf.)" />
                </div>
              </div>
              <div className="card p-3 mb-3">
                <p className="text-xs text-slate-400 mb-2"><b className="text-slate-200">Compter au scanner</b> : chaque boîte scannée = +1 (caméra du téléphone ou douchette). Une boîte inconnue se tape dans « ➕ Boîte pas dans la liste ».</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setCamScan(true)} className="btn-primary flex items-center gap-1.5 text-sm"><ScanLine size={15} /> Scanner avec la caméra</button>
                  <input className="input flex-1 min-w-[10rem]" placeholder="Douchette : scanne ici (ou tape un code + Entrée)" value={codeScan}
                    onChange={(e) => setCodeScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { compterScan(codeScan); setCodeScan(""); } }} />
                </div>
                {retourScan && <p className={`text-sm mt-2 ${retourScan.startsWith("✓") ? "text-emerald-400" : "text-amber-300"}`}>{retourScan}</p>}
              </div>
              {camScan && <BarcodeScanner onScan={(c) => compterScan(c)} onClose={() => setCamScan(false)} hint="Scanne chaque boîte une par une." status={retourScan} />}
              {codeInconnu && (
                <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
                  <div className="card p-5 w-full max-w-md my-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-100">Boîte inconnue</h3>
                      <button onClick={() => setCodeInconnu(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                    </div>
                    <p className="text-sm text-slate-300 mb-1">Code scanné : <span className="font-mono">{codeInconnu}</span></p>
                    <p className="text-xs text-slate-400 mb-3">Tape la référence écrite sur la boîte (Filtron, Flag, Wix…). La boîte est comptée et le code est retenu : la prochaine sera reconnue toute seule.</p>
                    <ProductPicker products={products} variants={variants} value="" onSelect={(p, v) => associerCode(p, v)} placeholder="Référence de la boîte" />
                    <div className="flex justify-end mt-4"><button onClick={() => setCodeInconnu(null)} className="btn-secondary">Passer</button></div>
                  </div>
                </div>
              )}
              <label className="text-xs text-slate-400 flex items-center gap-2 mb-2"><input type="checkbox" checked={seulementEcarts} onChange={(e) => setSeulementEcarts(e.target.checked)} /> Seulement les écarts</label>
              {!articles ? <p className="text-sm text-slate-400">Chargement…</p> : (
                <div className="card divide-y divide-slate-800">
                  {lignesVues.slice(0, 300).map((a) => {
                    const k = cleArticle(a); const c = comptes[k] ?? "";
                    const e = c === "" ? null : Number(c) - a.stock;
                    return (
                      <div key={k} className="grid grid-cols-[1fr_auto_5rem_3.5rem] items-center gap-2 px-3 py-2">
                        <span className="font-mono text-xs text-slate-200 truncate">{a.ref}</span>
                        <span className="text-[11px] text-slate-500">appli {a.stock}</span>
                        <input type="number" inputMode="numeric" min={0} className="input py-1 text-center" placeholder="compté" value={c} onChange={(ev) => taper(a, ev.target.value)} />
                        <span className={`text-xs text-end font-semibold ${e == null ? "text-slate-600" : e === 0 ? "text-emerald-400" : e < 0 ? "text-red-400" : "text-amber-300"}`}>{e == null ? "—" : e === 0 ? "✓" : (e > 0 ? "+" : "") + e}</span>
                      </div>
                    );
                  })}
                  {lignesVues.length === 0 && <p className="p-4 text-sm text-slate-500">Rien à afficher.</p>}
                  {lignesVues.length > 300 && <p className="p-3 text-xs text-slate-500">300 premières lignes : filtre par référence pour voir les autres.</p>}
                </div>
              )}
            </>
          )}
        </>
      )}

      {onglet === "historique" && (
        <>
          <div className="card p-4 mb-3">
            <ProductPicker products={products} variants={variants} value={choisi?.id ?? ""} onSelect={(p) => ouvrirArticle(p.id, p)} placeholder="Tape une référence (Filtron, Wix, Mann…)" />
          </div>
          {choisi && !hist && <p className="text-sm text-slate-400">Chargement…</p>}
          {choisi && hist && (
            <>
              <div className="card p-4 mb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{choisi.reference}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {hist.variantes.map((v) => <span key={v.id ?? "f"} className="text-[11px] rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{v.nom} : <b className="text-amber-300">{v.stock}</b></span>)}
                    </div>
                  </div>
                  <button onClick={() => setCorr({ variante: "", sens: -1, qte: "1", motif: "casse", note: "" })} className="btn-primary text-xs">Corriger le stock</button>
                </div>
              </div>
              <div className="card divide-y divide-slate-800">
                {hist.mouvements.length === 0 && <p className="p-4 text-sm text-slate-500">Aucun mouvement enregistré.</p>}
                {hist.mouvements.map((m, i) => {
                  const apres = courant; courant -= m.delta;
                  return (
                    <div key={i} className="grid grid-cols-[4.5rem_1fr_auto] gap-2 px-3 py-2 items-center">
                      <span className="text-[11px] text-slate-500">{m.date.slice(8, 10)}/{m.date.slice(5, 7)}/{m.date.slice(2, 4)}</span>
                      <span className="min-w-0">
                        <span className={`block text-sm truncate ${COUL[m.type]}`}>{m.libelle}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{m.variante}</span>
                      </span>
                      <span className="text-end">
                        <span className={`block text-sm font-semibold ${m.delta > 0 ? "text-emerald-400" : m.delta < 0 ? "text-red-400" : "text-slate-500"}`}>{m.delta > 0 ? "+" : ""}{m.delta || "⇄"}</span>
                        <span className="block text-[10px] text-slate-600">après {apres}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">« après » = stock total (fiche + marques) juste après le mouvement, recalculé depuis le stock d&apos;aujourd&apos;hui. Le stock a été remis à 0 le 29/10/2026 : avant, les chiffres ne se suivent pas.</p>
            </>
          )}
        </>
      )}

      {corr && choisi && hist && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100">Corriger le stock — {choisi.reference}</h3>
              <button onClick={() => setCorr(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <label className="text-xs text-slate-500 block mb-3">Quelle boîte ?
              <select className="input mt-1" value={corr.variante} onChange={(e) => setCorr({ ...corr, variante: e.target.value })}>
                {hist.variantes.map((v) => <option key={v.id ?? "f"} value={v.id ?? ""}>{v.nom} (stock {v.stock})</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setCorr({ ...corr, sens: -1 })} className={`rounded-lg py-2 text-sm ${corr.sens === -1 ? "bg-red-500/20 text-red-300 ring-1 ring-red-500" : "btn-secondary"}`}>− Retirer</button>
              <button onClick={() => setCorr({ ...corr, sens: 1, motif: corr.motif === "casse" ? "retrouve" : corr.motif })} className={`rounded-lg py-2 text-sm ${corr.sens === 1 ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500" : "btn-secondary"}`}>+ Ajouter</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-xs text-slate-500">Combien<input type="number" inputMode="numeric" min={1} className="input mt-1" value={corr.qte} onChange={(e) => setCorr({ ...corr, qte: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Pourquoi
                <select className="input mt-1" value={corr.motif} onChange={(e) => setCorr({ ...corr, motif: e.target.value })}>
                  {MOTIFS.filter((m) => m.cle !== "inventaire").map((m) => <option key={m.cle} value={m.cle}>{m.libelle}</option>)}
                </select>
              </label>
            </div>
            <label className="text-xs text-slate-500 block mb-4">Note (facultatif)<input className="input mt-1" value={corr.note} onChange={(e) => setCorr({ ...corr, note: e.target.value })} /></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCorr(null)} className="btn-secondary">Annuler</button>
              <button onClick={enregistrerCorrection} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
