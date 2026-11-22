"use client";
// Stock de la voiture (nouveauté n° 7, BIBLE §8.41) : ce qui est chargé pour la tournée.
// Charger (magasin → voiture), décharger (voiture → magasin) ; une vente « 🚗 sortie de la voiture » la vide d'autant.
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import ProductPicker, { type PickerVariant } from "@/components/ProductPicker";
import { loadAll } from "@/lib/pagedFetch";
import { chargerMarques } from "@/lib/brands";
import { useTypeVehicule, useChangementType, type TypeVehicule } from "@/lib/typeVehicule";
import { ajouterStockAvant, derniersTransferts, resteStockAvant, stockVoiture, transferer, type ArticleVoiture, type LigneVoiture, type ResteAvant } from "@/lib/voiture";
import type { Product, Transfert } from "@/types/database";
import { CarFront, PackagePlus, PackageMinus, X, Trash2, NotebookPen } from "lucide-react";

const mad = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} MAD`;

export default function VoiturePage() {
  const [typeV] = useTypeVehicule();
  const [stock, setStock] = useState<ArticleVoiture[] | null>(null);
  const [hist, setHist] = useState<Transfert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<PickerVariant[]>([]);
  const [stocksVar, setStocksVar] = useState<Map<string, number>>(new Map());
  const [charge, setCharge] = useState<(LigneVoiture & { dispo: number })[] | null>(null);
  const [decharge, setDecharge] = useState<Record<string, number> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Marchandise d'avant (notée dans le cahier) : entre dans le stock sans réception — BIBLE §8.51
  const [avant, setAvant] = useState<LigneVoiture[] | null>(null);
  const [avantVoiture, setAvantVoiture] = useState(true);
  const [resteAvant, setResteAvant] = useState(0);
  const [fournisseurs, setFournisseurs] = useState<{ id: string; nom: string; type: string | null }[]>([]);
  const [proprio, setProprio] = useState<string>(""); // fournisseur à qui est la marchandise d'avant ("" = à moi)
  useEffect(() => {
    supabase.from("fournisseurs").select("id, nom, type").order("nom").then(({ data }) => {
      const l = (data ?? []) as { id: string; nom: string; type: string | null }[];
      setFournisseurs(l); setProprio((l.find((f) => (f.type ?? "credit") === "credit") ?? l[0])?.id ?? "");
    }, () => {});
  }, []);

  async function charger() {
    const [s, h, ra] = await Promise.all([stockVoiture(), derniersTransferts(), resteStockAvant().catch(() => new Map<string, ResteAvant>())]);
    setStock(s); setHist(h); setResteAvant([...ra.values()].reduce((a, b) => a + b.quantite, 0));
  }
  async function chargerFiches(t: TypeVehicule = typeV) {
    setProducts(await loadAll<Product>("products", "*", { filter: (q) => q.eq("vehicule", t).order("reference") }));
    const marques = await chargerMarques();
    const v = await loadAll<PickerVariant & { stock: number }>("equivalences", "id, product_id, marque, reference, stock, products!inner(vehicule)",
      { filter: (q) => q.in("marque", marques).eq("products.vehicule", t).order("id"), countSelect: "id, products!inner(vehicule)" });
    setVariants(v); setStocksVar(new Map(v.map((x) => [x.id, x.stock ?? 0])));
  }
  useEffect(() => { charger().catch(() => setStock([])); chargerFiches().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useChangementType(typeV, (t) => { chargerFiches(t).catch(() => {}); });

  const dansVoiture = (pid: string, eq: string | null) => stock?.find((a) => a.product_id === pid && a.equivalence_id === eq)?.quantite ?? 0;
  function ajouterACharger(p: Product, v?: PickerVariant) {
    const eq = v?.id ?? null;
    const total = v ? stocksVar.get(v.id) ?? 0 : p.stock;
    const dispo = Math.max(0, total - dansVoiture(p.id, eq));
    const ref = v ? `${v.reference} (${v.marque})` : p.reference;
    setCharge((prev) => {
      const l = prev ?? [];
      if (l.some((x) => x.product_id === p.id && x.equivalence_id === eq)) return l;
      return [...l, { product_id: p.id, equivalence_id: eq, ref, quantite: Math.min(1, dispo), dispo }];
    });
  }
  async function validerCharge() {
    if (!charge) return;
    setEnvoi(true);
    try {
      await transferer("charger", charge.map(({ dispo: _d, ...l }) => l)); // eslint-disable-line @typescript-eslint/no-unused-vars
      setMsg(`Voiture chargée ✓ (${charge.reduce((s, l) => s + l.quantite, 0)} pièce(s)).`);
      setCharge(null); charger();
    } catch (e) { setMsg("Erreur : " + String((e as Error)?.message ?? e)); }
    setEnvoi(false);
  }
  function ajouterAvant(p: Product, v?: PickerVariant) {
    const eq = v?.id ?? null;
    const ref = v ? `${v.reference} (${v.marque})` : p.reference;
    setAvant((prev) => { const l = prev ?? []; return l.some((x) => x.product_id === p.id && x.equivalence_id === eq) ? l : [...l, { product_id: p.id, equivalence_id: eq, ref, quantite: 1 }]; });
  }
  async function validerAvant() {
    if (!avant) return;
    setEnvoi(true);
    try {
      await ajouterStockAvant(avant, avantVoiture, proprio || null);
      const n = avant.reduce((s, l) => s + l.quantite, 0);
      const nomP = fournisseurs.find((f) => f.id === proprio)?.nom;
      setMsg(`Marchandise d'avant ajoutée ✓ — ${n} pièce(s) dans le stock${avantVoiture ? " et dans la voiture" : ""}. La dette n'a pas bougé (pas de double solde) ; à la vente, elle sera comptée ${nomP ? `pour ${nomP}` : "pour toi"}.`);
      setAvant(null); charger();
    } catch (e) { setMsg("Erreur : " + String((e as Error)?.message ?? e)); }
    setEnvoi(false);
  }
  async function validerDecharge() {
    if (!decharge || !stock) return;
    setEnvoi(true);
    try {
      const lignes = stock.filter((a) => (decharge[a.id] ?? 0) > 0).map((a) => ({ product_id: a.product_id, equivalence_id: a.equivalence_id, ref: a.ref, quantite: Math.min(a.quantite, decharge[a.id]) }));
      await transferer("decharger", lignes);
      setMsg(`Déchargé ✓ (${lignes.reduce((s, l) => s + l.quantite, 0)} pièce(s) remises au magasin).`);
      setDecharge(null); charger();
    } catch (e) { setMsg("Erreur : " + String((e as Error)?.message ?? e)); }
    setEnvoi(false);
  }

  const pieces = (stock ?? []).reduce((s, a) => s + a.quantite, 0);
  const valeur = (stock ?? []).reduce((s, a) => s + a.quantite * a.prix, 0);

  return (
    <div>
      <Header title="vanStock" />
      {msg && <div className="card p-3 mb-4 text-sm text-slate-200 flex justify-between gap-2">{msg}<button onClick={() => setMsg(null)}><X size={14} /></button></div>}

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm"><CarFront size={16} className="text-amber-400" /> Dans la voiture</div>
        <div className="text-3xl font-bold text-amber-300 mt-1">{pieces} pièce(s)</div>
        <div className="text-xs text-slate-500">{stock?.length ?? "…"} référence(s) · valeur {mad(valeur)} au prix de vente</div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => setCharge([])} className="flex items-center gap-1.5 btn-primary"><PackagePlus size={15} /> Charger la voiture</button>
          <button onClick={() => { setAvant([]); setAvantVoiture(true); }} className="flex items-center gap-1.5 btn-secondary"><NotebookPen size={15} /> Marchandise d&apos;avant (cahier)</button>
          {pieces > 0 && <button onClick={() => setDecharge(Object.fromEntries((stock ?? []).map((a) => [a.id, a.quantite])))} className="flex items-center gap-1.5 btn-secondary"><PackageMinus size={15} /> Décharger (retour magasin)</button>}
        </div>
        {resteAvant > 0 && <p className="text-xs text-amber-300 mt-3">📒 Il reste {resteAvant} pièce(s) de la marchandise d&apos;avant (cahier) : à la vente, elles sont comptées sur aucun fournisseur.</p>}
        <p className="text-[11px] text-slate-500 mt-3">En tournée, coche <b>🚗 Sorti de la voiture</b> dans le formulaire de vente : la voiture se vide toute seule. Le stock total de l&apos;appli ne change pas quand tu charges ou décharges (magasin = total − voiture).</p>
      </div>

      {!stock ? <p className="text-sm text-slate-400">Chargement…</p> : stock.length > 0 && (
        <div className="card divide-y divide-slate-800 mb-4">
          {stock.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 items-center">
              <span className="font-mono text-xs text-slate-200 truncate">{a.ref}</span>
              <span className="text-[11px] text-slate-500">magasin {Math.max(0, a.stockTotal - a.quantite)}</span>
              <span className="font-semibold text-amber-300 w-10 text-end">{a.quantite}</span>
            </div>
          ))}
        </div>
      )}

      {hist.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-400 mb-2">Derniers chargements / déchargements</p>
          {hist.map((t) => (
            <p key={t.id} className="text-xs text-slate-500 py-0.5">
              {t.date.slice(8, 10)}/{t.date.slice(5, 7)} · {t.depot_vers === "voiture" ? "⬆ chargé" : "⬇ déchargé"} : {(t.lignes ?? []).map((l) => `${l.ref}×${l.quantite}`).join(", ")}
            </p>
          ))}
        </div>
      )}

      {charge && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-lg my-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><PackagePlus size={18} className="text-amber-400" /> Charger la voiture</h3>
              <button onClick={() => setCharge(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <ProductPicker products={products} variants={variants} value="" onSelect={(p, v) => ajouterACharger(p, v)} placeholder="Tape une référence à charger" />
            <div className="space-y-2 my-3 max-h-[45vh] overflow-y-auto">
              {charge.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="min-w-0"><span className="block font-mono text-xs text-slate-200 truncate">{l.ref}</span><span className="text-[11px] text-slate-500">au magasin : {l.dispo}</span></span>
                  <input type="number" inputMode="numeric" min={0} max={l.dispo} className="input w-20 py-1 text-center" value={l.quantite}
                    onChange={(e) => setCharge(charge.map((x, j) => j === i ? { ...x, quantite: Math.max(0, Math.min(x.dispo, Math.round(Number(e.target.value) || 0))) } : x))} />
                  <button onClick={() => setCharge(charge.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
              {charge.length === 0 && <p className="text-xs text-slate-500">Tape les références que tu prends pour la tournée.</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCharge(null)} className="btn-secondary">Annuler</button>
              <button onClick={validerCharge} disabled={envoi || !charge.some((l) => l.quantite > 0)} className="btn-primary disabled:opacity-50">Charger</button>
            </div>
          </div>
        </div>
      )}

      {avant && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-lg my-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><NotebookPen size={18} className="text-amber-400" /> Marchandise d&apos;avant (cahier)</h3>
              <button onClick={() => setAvant(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">La marchandise que tu avais déjà (notée dans le cahier). <b>Compte les boîtes</b> et tape le nombre de chaque référence. Elle entre dans le stock <b>sans réception</b> : la dette ne bouge pas (elle y est déjà par le cahier, pas de double solde). À la vente, elle est comptée pour le fournisseur choisi ci-dessous (« 📒 cahier »). Si tu ne peux pas tout compter maintenant, ajoute ce que tu as compté et complète plus tard.</p>
            <ProductPicker products={products} variants={variants} value="" onSelect={(p, v) => ajouterAvant(p, v)} placeholder="Tape la référence de la boîte" />
            <div className="space-y-2 my-3 max-h-[45vh] overflow-y-auto">
              {avant.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="font-mono text-xs text-slate-200 truncate">{l.ref}</span>
                  <input type="number" inputMode="numeric" min={0} className="input w-20 py-1 text-center" value={l.quantite}
                    onChange={(e) => setAvant(avant.map((x, j) => j === i ? { ...x, quantite: Math.max(0, Math.round(Number(e.target.value) || 0)) } : x))} />
                  <button onClick={() => setAvant(avant.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
              {avant.length === 0 && <p className="text-xs text-slate-500">Tape chaque référence que tu trouves dans la voiture.</p>}
            </div>
            <label className="text-xs text-slate-500 block mb-2">Elle est à qui ? (déjà comptée dans sa dette par le cahier)
              <select className="input mt-1" value={proprio} onChange={(e) => setProprio(e.target.value)}>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}{(f.type ?? "credit") === "credit" ? " (crédit)" : " (capital)"}</option>)}
                <option value="">À moi (sans fournisseur)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-4"><input type="checkbox" checked={avantVoiture} onChange={(e) => setAvantVoiture(e.target.checked)} /> Elle est dans la voiture</label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAvant(null)} className="btn-secondary">Annuler</button>
              <button onClick={validerAvant} disabled={envoi || !avant.some((l) => l.quantite > 0)} className="btn-primary disabled:opacity-50">Ajouter au stock</button>
            </div>
          </div>
        </div>
      )}

      {decharge && stock && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-lg my-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><PackageMinus size={18} className="text-amber-400" /> Décharger au magasin</h3>
              <button onClick={() => setDecharge(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-3">Fin de tournée : ce qui revient au magasin (tout est proposé, baisse si tu gardes des pièces dans la voiture).</p>
            <div className="space-y-2 mb-3 max-h-[50vh] overflow-y-auto">
              {stock.map((a) => (
                <div key={a.id} className="grid grid-cols-[1fr_auto] gap-2 items-center rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="min-w-0"><span className="block font-mono text-xs text-slate-200 truncate">{a.ref}</span><span className="text-[11px] text-slate-500">dans la voiture : {a.quantite}</span></span>
                  <input type="number" inputMode="numeric" min={0} max={a.quantite} className="input w-20 py-1 text-center" value={decharge[a.id] ?? 0}
                    onChange={(e) => setDecharge({ ...decharge, [a.id]: Math.max(0, Math.min(a.quantite, Math.round(Number(e.target.value) || 0))) })} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDecharge(null)} className="btn-secondary">Annuler</button>
              <button onClick={validerDecharge} disabled={envoi} className="btn-primary disabled:opacity-50">Décharger</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
