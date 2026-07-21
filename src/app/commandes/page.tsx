"use client";
export const dynamic = "force-dynamic";
// Commandes WhatsApp des garages → ventes préparées + liste de chargement (Bible §4.6).
// Règle absolue : JAMAIS deviner une référence — ce qui n'est pas reconnu passe en rouge.
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { Product, Garage, Client } from "@/types/database";
import { Check, X, ClipboardPaste, Package, MessageCircle } from "lucide-react";
import ProductPicker from "@/components/ProductPicker";

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, "");

type EquivRow = { id: string; product_id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null };
type ParsedLine = {
  raw: string;
  qty: number;
  status: "ok" | "inconnu" | "ambigu";
  product?: Product;
  equiv?: EquivRow | null; // null = produit principal (Filtron)
  candidats?: string[];    // pour les lignes ambiguës
};
type ChargementLigne = { key: string; nom: string; qty: number; clients: string[] };

export default function CommandesPage() {
  const [tab, setTab] = useState<"commande" | "chargement">("commande");
  const [garages, setGarages] = useState<Garage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [equivs, setEquivs] = useState<EquivRow[]>([]);
  const [garageId, setGarageId] = useState("");
  const [texte, setTexte] = useState("");
  const [lines, setLines] = useState<ParsedLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  // Liste de chargement
  const [chargement, setChargement] = useState<ChargementLigne[]>([]);
  const [coches, setCoches] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("garages").select("*").order("nom").then(({ data }) => setGarages((data as Garage[]) ?? []));
    supabase.from("clients").select("*").order("nom").then(({ data }) => setClients((data as Client[]) ?? []));
    (async () => {
      const all: Product[] = [];
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.from("products").select("*").order("reference").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < 1000) break;
      }
      setProducts(all);
    })();
    (async () => {
      const all: EquivRow[] = [];
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.from("equivalences").select("id, product_id, marque, reference, prix, prix_achat").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        all.push(...(data as EquivRow[]));
        if (data.length < 1000) break;
      }
      setEquivs(all);
    })();
    loadChargement();
  }, []);

  const garage = garages.find(g => g.id === garageId) || null;
  const clientDuGarage = garage?.client_id ? clients.find(c => c.id === garage.client_id) ?? null : null;
  const remise = clientDuGarage?.remise_pct ?? 0;
  const avecRemise = (p: number) => (remise > 0 ? Math.round(p * (1 - remise / 100)) : p);

  // ---------- Parseur : « 2 oe667/6 », « oe667/6 x2 », « hu7032z ×2 » ----------
  function parser() {
    const byRef = new Map<string, Product[]>();
    for (const p of products) {
      const k = norm(p.reference);
      byRef.set(k, [...(byRef.get(k) ?? []), p]);
    }
    const byEquiv = new Map<string, EquivRow[]>();
    for (const e of equivs) {
      const k = norm(e.reference);
      byEquiv.set(k, [...(byEquiv.get(k) ?? []), e]);
    }
    const out: ParsedLine[] = [];
    for (const rawLine of texte.split("\n")) {
      const raw = rawLine.trim();
      if (!raw) continue;
      // Quantité : préfixe « 2 ref » ou suffixe « ref x2 / ×2 / *2 »
      let qty = 1;
      let refPart = raw;
      const pre = raw.match(/^(\d{1,3})\s+(.+)$/);
      // Espace obligatoire avant x/×/* : une référence terminée par une lettre + chiffres
      // sans espace (ex. « AX2 ») ne doit jamais être lue comme « quantité 2 de A ».
      const suf = raw.match(/^(.+?)\s+[x×*]\s*(\d{1,3})$/i);
      if (suf) { qty = parseInt(suf[2], 10); refPart = suf[1]; }
      else if (pre) { qty = parseInt(pre[1], 10); refPart = pre[2]; }
      const key = norm(refPart);
      if (!key) continue;

      const prods = byRef.get(key) ?? [];
      const eqs = byEquiv.get(key) ?? [];
      const nbMatches = prods.length + eqs.length;
      if (nbMatches === 1) {
        if (prods.length === 1) out.push({ raw, qty, status: "ok", product: prods[0], equiv: null });
        else {
          const e = eqs[0];
          const parent = products.find(p => p.id === e.product_id);
          if (parent && e.prix != null) out.push({ raw, qty, status: "ok", product: parent, equiv: e });
          else out.push({ raw, qty, status: "inconnu" }); // variante sans prix → choix manuel
        }
      } else if (nbMatches > 1) {
        out.push({ raw, qty, status: "ambigu", candidats: [...prods.map(p => `${p.reference} (${p.marque ?? "Filtron"})`), ...eqs.map(e => `${e.reference} (${e.marque})`)] });
      } else {
        out.push({ raw, qty, status: "inconnu" });
      }
    }
    setLines(out);
    setDone(null);
  }

  // Choix manuel pour une ligne rouge (jamais de devinette automatique)
  function fixLine(i: number, p: Product) {
    setLines(prev => prev.map((l, j) => j === i ? { ...l, status: "ok", product: p, equiv: null } : l));
  }

  // Variantes de marque disponibles pour un produit (prix requis) — permet, ligne par ligne,
  // de facturer la MARQUE réellement demandée (Mann/Wix…) au lieu du Filtron par défaut,
  // qu'elle ait été reconnue automatiquement ou choisie à la main sur une ligne rouge.
  function variantesDisponibles(productId: string) {
    return equivs.filter(e => e.product_id === productId && e.prix != null);
  }
  function setLineMarque(i: number, marque: string) {
    setLines(prev => prev.map((l, j) => {
      if (j !== i || !l.product) return l;
      if (marque === "Filtron") return { ...l, equiv: null };
      const v = variantesDisponibles(l.product.id).find(e => e.marque === marque);
      return v ? { ...l, equiv: v } : l;
    }));
  }

  const okLines = lines.filter(l => l.status === "ok" && l.product);
  const prixLigne = (l: ParsedLine) => avecRemise(l.equiv ? (l.equiv.prix ?? l.product!.prix_vente) : l.product!.prix_vente);
  const total = okLines.reduce((s, l) => s + l.qty * prixLigne(l), 0);

  // ---------- Validation : vente préparée (en_attente) — le stock bouge à la livraison ----------
  async function creerClientDepuisGarage() {
    if (!garage) return;
    const { data, error } = await supabase.from("clients").insert({
      nom: garage.nom, telephone: garage.telephone, ville: garage.ville ?? "", adresse: null, notes: "Créé depuis la carte tournées", solde_du: 0, type: "garage",
    }).select().single();
    if (error || !data) { alert("Erreur : " + (error?.message ?? "création client")); return; }
    const upd = await supabase.from("garages").update({ client_id: data.id }).eq("id", garage.id);
    if (upd.error) { alert("Colle le SQL supabase/idees_bible_2eme_vague.sql dans Supabase (colonne client_id manquante)."); return; }
    setClients(prev => [...prev, data as Client]);
    setGarages(prev => prev.map(g => g.id === garage.id ? { ...g, client_id: (data as Client).id } : g));
  }

  async function valider() {
    if (!garage || !clientDuGarage || okLines.length === 0) return;
    setSaving(true);
    try {
      const { data: sale, error } = await supabase.from("sales").insert({
        client_id: clientDuGarage.id, date: new Date().toISOString().split("T")[0],
        total, montant_paye: 0, statut: "en_attente", notes: `Commande WhatsApp — ${garage.nom}`,
      }).select().single();
      if (error || !sale) throw error || new Error("insert");
      const { error: e2 } = await supabase.from("sale_items").insert(okLines.map(l => ({
        sale_id: sale.id, product_id: l.product!.id, quantite: l.qty, prix_unitaire: prixLigne(l),
        fournisseur_id: null, equivalence_id: l.equiv?.id ?? null,
        cout_unitaire: l.equiv ? (l.equiv.prix_achat ?? l.product!.prix_achat) : l.product!.prix_achat,
      })));
      if (e2) throw e2;
      await supabase.from("garages").update({ statut: "preparee" }).eq("id", garage.id);
      setDone(`Commande de ${garage.nom} préparée ✓ (${okLines.length} ligne(s), ${total.toFixed(0)} MAD)`);
      setLines([]); setTexte("");
      loadChargement();
    } catch (e) {
      alert("Erreur : " + (e instanceof Error ? e.message : "enregistrement"));
    } finally { setSaving(false); }
  }

  // ---------- Liste de chargement : toutes les ventes préparées en attente ----------
  async function loadChargement() {
    const rows: { quantite: number; equivalence_id: string | null; product: { reference: string } | null; equivalence: { reference: string; marque: string } | null; sale: { statut: string; client: { nom: string } | null } | null }[] = [];
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.from("sale_items")
        .select("quantite, equivalence_id, product:products(reference), equivalence:equivalences(reference, marque), sale:sales!inner(statut, client:clients(nom))")
        .eq("sales.statut", "en_attente").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      rows.push(...(data as unknown as typeof rows));
      if (data.length < 1000) break;
    }
    const map = new Map<string, ChargementLigne>();
    for (const r of rows) {
      const nom = r.equivalence ? `${r.equivalence.reference} (${r.equivalence.marque})` : (r.product?.reference ?? "?");
      const cur = map.get(nom) ?? { key: nom, nom, qty: 0, clients: [] };
      cur.qty += r.quantite;
      const cl = r.sale?.client?.nom;
      if (cl && !cur.clients.includes(cl)) cur.clients.push(cl);
      map.set(nom, cur);
    }
    setChargement([...map.values()].sort((a, b) => a.nom.localeCompare(b.nom)));
  }

  const statutColor: Record<string, string> = { ok: "bg-green-500/10 border-green-500/30", ambigu: "bg-red-500/10 border-red-500/30", inconnu: "bg-red-500/10 border-red-500/30" };

  return (
    <div>
      <Header title="orders" />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("commande")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "commande" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          <span className="inline-flex items-center gap-1.5"><ClipboardPaste size={15} /> Commande WhatsApp</span>
        </button>
        <button onClick={() => { setTab("chargement"); loadChargement(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "chargement" ? "bg-red-600 text-white" : "card text-slate-300 hover:text-slate-100"}`}>
          <span className="inline-flex items-center gap-1.5"><Package size={15} /> 📦 Chargement ({chargement.length})</span>
        </button>
      </div>

      {tab === "commande" && (
        <div className="card p-5">
          <p className="text-sm text-slate-400 mb-3">Le garage t&apos;envoie sa liste sur WhatsApp → colle-la ici, l&apos;app la transforme en vente préparée. <b>Ce qui n&apos;est pas reconnu passe en rouge</b> — jamais de devinette.</p>

          <label className="text-xs text-slate-500 mb-1 block">Garage</label>
          <select className="input mb-1" value={garageId} onChange={e => { setGarageId(e.target.value); setLines([]); setDone(null); }}>
            <option value="">-- Choisir le garage --</option>
            {garages.map(g => <option key={g.id} value={g.id}>{g.nom}{g.ville ? ` — ${g.ville}` : ""}</option>)}
          </select>
          {garage && !clientDuGarage && (
            <button onClick={creerClientDepuisGarage} className="mb-3 text-xs bg-blue-500/15 text-blue-300 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/25 font-medium">
              ➕ Créer la fiche client depuis ce garage (nécessaire pour enregistrer la commande)
            </button>
          )}
          {clientDuGarage && (
            <p className="mb-3 text-xs text-emerald-400">Client lié : {clientDuGarage.nom}{remise > 0 ? ` · remise −${remise}% appliquée` : ""}</p>
          )}

          <label className="text-xs text-slate-500 mb-1 block">Message du garage (une référence par ligne)</label>
          <textarea className="input font-mono" rows={5} placeholder={"2 oe667/6\nhu7032z x1\nwl 7510 ×4"} value={texte} onChange={e => setTexte(e.target.value)} />
          <button onClick={parser} disabled={!texte.trim() || products.length === 0}
            className="btn-primary mt-2 disabled:opacity-50">Analyser</button>

          {lines.length > 0 && (
            <div className="mt-4 space-y-2">
              {lines.map((l, i) => (
                <div key={i} className={`border rounded-lg px-3 py-2 ${statutColor[l.status]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-slate-200 truncate">{l.raw}</span>
                    {l.status === "ok" ? (
                      <span className="text-xs text-green-400 shrink-0 flex items-center gap-1">
                        <Check size={13} /> {l.qty} × {l.equiv ? `${l.equiv.reference} (${l.equiv.marque})` : l.product?.reference} · {prixLigne(l)} MAD
                      </span>
                    ) : (
                      <span className="text-xs text-red-400 shrink-0 flex items-center gap-1"><X size={13} /> {l.status === "ambigu" ? "Plusieurs correspondances" : "Référence inconnue"}</span>
                    )}
                  </div>
                  {l.status === "ambigu" && l.candidats && (
                    <p className="text-[11px] text-slate-400 mt-1">Trouvé : {l.candidats.join(" · ")} — choisis à la main :</p>
                  )}
                  {l.status !== "ok" && (
                    <div className="mt-1.5"><ProductPicker products={products} value="" onSelect={(p) => fixLine(i, p)} /></div>
                  )}
                  {l.status === "ok" && l.product && variantesDisponibles(l.product.id).length > 0 && (
                    <select className="input mt-1.5 py-1 text-xs" value={l.equiv?.marque ?? "Filtron"} onChange={e => setLineMarque(i, e.target.value)}>
                      <option value="Filtron">{l.product.reference} · Filtron · {l.product.prix_vente} MAD</option>
                      {variantesDisponibles(l.product.id).map(v => (
                        <option key={v.id} value={v.marque}>{v.reference} · {v.marque} · {v.prix} MAD</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-400">{okLines.length}/{lines.length} reconnue(s) · <b className="text-blue-400">{total.toFixed(0)} MAD</b></span>
                <button onClick={valider} disabled={saving || !clientDuGarage || okLines.length === 0}
                  className="btn-primary disabled:opacity-50">{saving ? "Enregistrement…" : "✓ Préparer la commande"}</button>
              </div>
              {lines.some(l => l.status !== "ok") && (
                <p className="text-[11px] text-amber-400">Les lignes rouges non corrigées ne seront PAS enregistrées.</p>
              )}
            </div>
          )}

          {done && <p className="mt-3 text-sm text-green-400 font-medium">✅ {done} — le garage est passé en « préparée » sur la carte.</p>}
        </div>
      )}

      {tab === "chargement" && (
        <div className="card p-5">
          <p className="text-sm text-slate-400 mb-3">Tout ce qu&apos;il faut charger : les ventes <b>préparées / en attente</b>, agrégées par référence. Coche en chargeant le véhicule.</p>
          {chargement.length === 0 && <p className="text-center text-slate-400 py-8">Rien à charger — aucune vente en attente.</p>}
          <div className="space-y-1.5">
            {chargement.map(c => (
              <label key={c.key} className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer ${coches.has(c.key) ? "bg-green-500/10 opacity-60" : "bg-[var(--surface-2)]"}`}>
                <input type="checkbox" className="h-4 w-4 accent-green-600" checked={coches.has(c.key)}
                  onChange={() => setCoches(prev => { const n = new Set(prev); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })} />
                <span className={`font-mono text-sm ${coches.has(c.key) ? "line-through text-slate-500" : "text-slate-200"}`}>
                  <b>{c.qty}×</b> {c.nom}
                </span>
                <span className="text-[11px] text-slate-500 ms-auto truncate">{c.clients.join(", ")}</span>
              </label>
            ))}
          </div>
          {chargement.length > 0 && (
            <button onClick={() => {
              const txt = ["📦 *Chargement du jour — FiltroPro*", "", ...chargement.map(c => `• ${c.qty}× ${c.nom}`)].join("\n");
              navigator.clipboard?.writeText(txt).then(() => alert("Liste copiée ✓"));
            }} className="btn-secondary mt-4 flex items-center gap-2"><MessageCircle size={15} /> Copier la liste</button>
          )}
        </div>
      )}
    </div>
  );
}
