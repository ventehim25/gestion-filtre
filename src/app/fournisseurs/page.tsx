"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { loadAll } from "@/lib/pagedFetch";
import { DEPART, chargerMarques, ajouterMarque, marquesPour, marquesBase, marqueVarianteDefaut } from "@/lib/brands";
import { CATEGORY_KEYS, FAMILLES, familleDe, creables, estFiltre, avecDents, normDents, dentsValides, MSG_DENTS, type Famille } from "@/lib/categories";
import { translations } from "@/lib/i18n";
import CategoryIcon from "@/components/CategoryIcon";
import { coutCreditParFournisseur, setBonRembourse, lirePortefeuille, donnerPortefeuille, totauxPortefeuille, insererAvance, textePaiement, marquerChequeEncaisse, type BonPortefeuille, type Paiement } from "@/lib/dinoun";
import { ajouterReception, getReceptionsAttente, syncReceptions, type NouvellePiece } from "@/lib/offlineReceptions";
import type { Fournisseur, Reception, Avance, Product, FournisseurType, ProductCategory } from "@/types/database";
import ProductPicker from "@/components/ProductPicker";
import ChoixVehicule from "@/components/ChoixVehicule";
import FiltronDe from "@/components/FiltronDe";
import { lireTypeVehicule, useTypeVehicule, useChangementType, type TypeVehicule } from "@/lib/typeVehicule";
import BarcodeScanner from "@/components/BarcodeScanner";
import {
  Plus, Truck, Phone, MessageCircle, Pencil, Trash2, X, PackagePlus, HandCoins,
  ChevronDown, ChevronUp, Wallet, TrendingUp, Eye, EyeOff, PiggyBank, ScanLine, ExternalLink, CloudOff, RefreshCw, Undo2,
} from "lucide-react";
import RetourFournisseurModal from "@/components/RetourFournisseurModal";

type RecLine = {
  product_id: string; equivalence_id: string | null; marque: string; quantite: number; prix_achat: number; prix_vente: number; reference: string;
  code_barre: string; nouvelleMarque: string | null; nouvelleRef: string; // marque === "__new__" : variante créée à l'enregistrement
  nouvellePiece: NouvellePiece | null; // pièce pas encore dans l'appli (distribution, freinage…), créée à l'enregistrement
};
// « Je reçois » : la famille choisie (9 familles, src/lib/categories.ts) limite la recherche et les marques des lignes
// — BIBLE §8.30-8.31. Filtron ne fait que des filtres : les autres pièces se créent sur la ligne (« ➕ Nouvelle pièce »).
const libelleCat = (c: ProductCategory) => translations.fr[CATEGORY_KEYS[c]];
const FAMILLE_KEY = "fp_reception_famille";
type BonARembourser = { id: string; date: string; client: string; cout: number };
type VariantRow = { id: string; marque: string; reference: string; prix_achat: number | null; prix: number | null; code_barre: string | null };
const todayStr = () => new Date().toISOString().split("T")[0];
function waLink(tel: string) { return `https://wa.me/212${tel.replace(/\D/g, "").replace(/^0/, "")}`; }

export default function FournisseursPage() {
  // Marques de filtres : celles de départ + celles ajoutées par l'utilisateur (« ➕ Nouvelle marque… »)
  const [marques, setMarques] = useState<string[]>(DEPART);
  const [famille, setFamilleState] = useState<Famille>("filtres_huile");
  useEffect(() => { try { const v = localStorage.getItem(FAMILLE_KEY); if (v && FAMILLES.some(x => x.k === v)) setFamilleState(v as Famille); } catch { /* stockage bloqué */ } }, []);
  const setFamille = (k: Famille) => { setFamilleState(k); try { localStorage.setItem(FAMILLE_KEY, k); } catch { /* stockage bloqué */ } };
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [avances, setAvances] = useState<Avance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Variantes de marque par produit (Flag, Mann…) pour la réception
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantRow[]>>({});
  // Bons vendus avec de la marchandise crédit, pas encore mis de côté (par fournisseur)
  const [bonsARemb, setBonsARemb] = useState<Record<string, BonARembourser[]>>({});
  const [bonsOuverts, setBonsOuverts] = useState<string | null>(null);
  // Portefeuille dinoun (src/lib/dinoun.ts) : argent des bons mis de côté, pas encore donné → la dette ne bouge pas
  const [portefeuille, setPortefeuille] = useState<BonPortefeuille[]>([]);
  const [portefeuilleOuvert, setPortefeuilleOuvert] = useState<string | null>(null);
  // Onglet de l'historique par fournisseur : marchandise prise ou avances
  const [ongletHisto, setOngletHisto] = useState<Record<string, "rec" | "av">>({});
  const creditIdsDe = () => new Set(fournisseurs.filter(x => (x.type ?? "credit") === "credit").map(x => x.id));
  async function rembourserBon(f: Fournisseur, b: BonARembourser) {
    if (!confirm(`Mettre ${b.cout.toFixed(0)} MAD de côté dans le portefeuille ${f.nom} (bon ${b.client} du ${b.date}) ?\nLa dette ne baisse pas maintenant : elle baissera quand tu donneras le portefeuille à ${f.nom}.`)) return;
    const r = await setBonRembourse({ id: b.id, date: b.date, clientNom: b.client }, true, creditIdsDe());
    if (!r.ok) { alert(r.error); return; }
    load();
  }
  async function sortirDuPortefeuille(b: BonPortefeuille) {
    if (!confirm(`Sortir le bon ${b.client} du ${b.bon_date} (${b.montant.toFixed(0)} MAD) du portefeuille ?`)) return;
    const r = await setBonRembourse({ id: b.sale_id, date: b.bon_date, clientNom: b.client }, false, creditIdsDe());
    if (!r.ok) { alert(r.error); return; }
    load();
  }
  // « Donner à dinoun » : le même formulaire que « Avance / paiement » (espèces ou chèque, nom, n° de chèque),
  // pré-rempli avec le coût dinoun des bons du portefeuille ; à l'enregistrement le portefeuille se vide.
  function donner(f: Fournisseur) {
    const { cout } = totauxPortefeuille(portefeuille.filter(b => b.fournisseur_id === f.id));
    openAvance(f, true);
    setAvMontant(Math.round(cout));
  }
  const [salesAgg, setSalesAgg] = useState<{ date: string; cout: number; benef: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);   // montants masqués par défaut
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Ventes attribuées par fournisseur (source choisie à la vente)
  const [attByF, setAttByF] = useState<Record<string, { ventes: number; benef: number }>>({});

  // Formulaire fournisseur
  const [showSupplier, setShowSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Fournisseur | null>(null);
  const [sForm, setSForm] = useState<{ nom: string; telephone: string; note: string; type: FournisseurType; solde_depart: number }>({ nom: "", telephone: "", note: "", type: "credit", solde_depart: 0 });

  // Formulaire réception (marchandise prise)
  const [recFor, setRecFor] = useState<Fournisseur | null>(null);
  const [retourFor, setRetourFor] = useState<Fournisseur | null>(null); // rendre des pièces (BIBLE §8.41)
  const [retourMsg, setRetourMsg] = useState("");
  const [recDate, setRecDate] = useState(todayStr());
  const [recLines, setRecLines] = useState<RecLine[]>([]);

  // Formulaire avance
  const [avFor, setAvFor] = useState<Fournisseur | null>(null);
  const [avDate, setAvDate] = useState(todayStr());
  const [avMontant, setAvMontant] = useState(0);
  const [avNote, setAvNote] = useState("");
  // Mode de paiement de l'avance (espèces / chèque), nom de la personne, n° du chèque ; avance depuis le portefeuille ?
  const [avMode, setAvMode] = useState<"especes" | "cheque">("especes");
  const [avPersonne, setAvPersonne] = useState("");
  const [avCheque, setAvCheque] = useState("");
  const [avDateCheque, setAvDateCheque] = useState(todayStr());
  const [avEncaisse, setAvEncaisse] = useState(false);
  const [avPortefeuille, setAvPortefeuille] = useState(false);

  // Sélecteur de la réception (produits + variantes de MARQUE, pas les ~23 000 codes OE) :
  // chargé en arrière-plan pour ne pas bloquer l'affichage des soldes sur réseau lent.
  // 🚗 voitures par défaut, 🚛 camions au bouton (products.vehicule, BIBLE §8.37) : seules ces fiches sont chargées
  const [typeV, setTypeV] = useTypeVehicule();
  useChangementType(typeV, (t) => { loadPicker(t); });
  async function loadPicker(type: TypeVehicule = lireTypeVehicule()) {
    try {
      const toutesMarques = await chargerMarques();
      setMarques(toutesMarques);
      const [all, eqs] = await Promise.all([
        loadAll<Product>("products", "*", { filter: (q) => q.eq("vehicule", type).order("reference") }),
        loadAll<VariantRow & { product_id: string }>("equivalences", "id, product_id, marque, reference, prix_achat, prix, code_barre, products!inner(vehicule)",
          { filter: (q) => q.in("marque", toutesMarques).eq("products.vehicule", type).order("id"), countSelect: "id, products!inner(vehicule)" }),
      ]);
      const vmap: Record<string, VariantRow[]> = {};
      for (const e of eqs) (vmap[e.product_id] ??= []).push({ id: e.id, marque: e.marque, reference: e.reference, prix_achat: e.prix_achat, prix: e.prix, code_barre: e.code_barre });
      setProducts(all);
      setVariantsMap(vmap);
    } catch { /* réseau coupé : réessayé au prochain chargement */ }
  }

  async function load() {
    setLoading(true);
    loadPicker();
    try {
    const [{ data: f }, { data: r }, { data: a }, pf] = await Promise.all([
      supabase.from("fournisseurs").select("*").order("nom"),
      supabase.from("receptions").select("*").order("date", { ascending: false }),
      supabase.from("avances").select("*").order("date", { ascending: false }),
      lirePortefeuille(),
    ]);
    setFournisseurs((f as Fournisseur[]) ?? []);
    setReceptions((r as Reception[]) ?? []);
    setAvances((a as Avance[]) ?? []);
    setPortefeuille(pf);

    // Bons pas encore remboursés au fournisseur crédit (camion), avec leur coût crédit
    const creditIds = new Set(((f as Fournisseur[]) ?? []).filter(x => (x.type ?? "credit") === "credit").map(x => x.id));
    type BonRow = { id: string; date: string; client: { nom: string } | null; items: Parameters<typeof coutCreditParFournisseur>[0] };
    const bons = await loadAll<BonRow>("sales", "id, date, client:clients(nom), items:sale_items(quantite, cout_unitaire, fournisseur_id, product:products(prix_achat))",
      { filter: (q) => q.or("fournisseur_paye.is.null,fournisseur_paye.eq.false").order("date") }).catch(() => [] as BonRow[]);
    const aRemb: Record<string, BonARembourser[]> = {};
    for (const b of bons) for (const [fid, cout] of coutCreditParFournisseur(b.items ?? [], creditIds)) {
      if (cout > 0) (aRemb[fid] ??= []).push({ id: b.id, date: b.date, client: b.client?.nom ?? "", cout });
    }
    setBonsARemb(aRemb);

    // Portefeuille (depuis les ventes)
    const items: { date: string; items: { quantite: number; prix_unitaire: number; cout_unitaire: number | null; product: { prix_achat: number } | null }[] }[] = [];
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("sales").select("date, items:sale_items(quantite, prix_unitaire, cout_unitaire, product:products(prix_achat))").order("id").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      items.push(...(data as unknown as typeof items));
      if (data.length < 1000) break;
    }
    const agg: { date: string; cout: number; benef: number }[] = [];
    for (const s of items) {
      let c = 0, b = 0;
      for (const it of s.items ?? []) {
        const pa = it.cout_unitaire ?? it.product?.prix_achat ?? 0;
        c += it.quantite * pa;
        b += it.quantite * (it.prix_unitaire - pa);
      }
      agg.push({ date: s.date ?? "", cout: c, benef: b });
    }
    setSalesAgg(agg);

    // Ventes attribuées à un fournisseur (source choisie à la vente)
    const attLines: { fournisseur_id: string; quantite: number; prix_unitaire: number; cout_unitaire: number | null; product: { prix_achat: number } | null }[] = [];
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from("sale_items").select("fournisseur_id, quantite, prix_unitaire, cout_unitaire, product:products(prix_achat)").not("fournisseur_id", "is", null).order("id").range(i * 1000, i * 1000 + 999);
      if (!data || data.length === 0) break;
      attLines.push(...(data as unknown as typeof attLines));
      if (data.length < 1000) break;
    }
    const att: Record<string, { ventes: number; benef: number }> = {};
    for (const l of attLines) {
      const pa = l.cout_unitaire ?? l.product?.prix_achat ?? 0;
      const cur = att[l.fournisseur_id] ?? { ventes: 0, benef: 0 };
      cur.ventes += l.quantite * l.prix_unitaire;
      cur.benef += l.quantite * (l.prix_unitaire - pa);
      att[l.fournisseur_id] = cur;
    }
    setAttByF(att);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const recByF = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of receptions) m[r.fournisseur_id] = (m[r.fournisseur_id] ?? 0) + r.montant;
    return m;
  }, [receptions]);
  const avByF = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of avances) m[a.fournisseur_id] = (m[a.fournisseur_id] ?? 0) + a.montant;
    return m;
  }, [avances]);
  // Solde de départ (onboarding) par fournisseur : >0 = je lui dois, <0 = il me doit
  const departOf = (id: string) => fournisseurs.find(f => f.id === id)?.solde_depart ?? 0;
  // Reste à payer = solde de départ + marchandise prise − avances versées.
  // Négatif ⇒ le fournisseur ME doit.
  const soldeOf = (id: string) => departOf(id) + (recByF[id] ?? 0) - (avByF[id] ?? 0);
  const isCapital = (f: Fournisseur) => (f.type ?? "credit") === "capital";
  // Capital dispo (type capital) = ventes attribuées − marchandise achetée
  const capitalOf = (id: string) => (attByF[id]?.ventes ?? 0) - (recByF[id] ?? 0);
  const capitalTotal = fournisseurs.filter(isCapital).reduce((s, f) => s + capitalOf(f.id), 0);
  const duTotal = fournisseurs.filter(f => !isCapital(f)).reduce((s, f) => s + soldeOf(f.id), 0);

  // Mois disponibles + filtre
  const months = useMemo(() => {
    const set = new Set<string>();
    receptions.forEach(r => r.date && set.add(r.date.slice(0, 7)));
    avances.forEach(a => a.date && set.add(a.date.slice(0, 7)));
    salesAgg.forEach(s => s.date && set.add(s.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [receptions, avances, salesAgg]);
  const inMonth = (d: string) => selectedMonth === "all" || (d ?? "").slice(0, 7) === selectedMonth;
  const monthLabel = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

  // Portefeuille (selon le mois sélectionné)
  const porte = useMemo(() => {
    let cout = 0, benefice = 0;
    for (const s of salesAgg) if (inMonth(s.date)) { cout += s.cout; benefice += s.benef; }
    return { cout, benefice };
  }, [salesAgg, selectedMonth]);

  // Pris / versé sur la période (pour affichage), le solde reste cumulé
  const recByFPeriod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of receptions) if (inMonth(r.date)) m[r.fournisseur_id] = (m[r.fournisseur_id] ?? 0) + r.montant;
    return m;
  }, [receptions, selectedMonth]);
  const avByFPeriod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of avances) if (inMonth(a.date)) m[a.fournisseur_id] = (m[a.fournisseur_id] ?? 0) + a.montant;
    return m;
  }, [avances, selectedMonth]);

  // Masquage des montants
  const money = (n: number) => showAmounts ? `${n.toFixed(0)} MAD` : "••• MAD";
  const periodTxt = selectedMonth === "all" ? "cumul" : monthLabel(selectedMonth);

  // ---- Fournisseur CRUD ----
  function openNewSupplier() { setEditingSupplier(null); setSForm({ nom: "", telephone: "", note: "", type: "credit", solde_depart: 0 }); setShowSupplier(true); }
  function openEditSupplier(f: Fournisseur) { setEditingSupplier(f); setSForm({ nom: f.nom, telephone: f.telephone ?? "", note: f.note ?? "", type: f.type ?? "credit", solde_depart: f.solde_depart ?? 0 }); setShowSupplier(true); }
  async function saveSupplier() {
    if (!sForm.nom.trim()) { alert("Nom requis"); return; }
    const payload: Record<string, unknown> = { nom: sForm.nom.trim(), telephone: sForm.telephone || null, note: sForm.note || null, type: sForm.type, solde_depart: sForm.solde_depart || 0 };
    const run = (p: Record<string, unknown>) =>
      editingSupplier ? supabase.from("fournisseurs").update(p as Partial<Fournisseur>).eq("id", editingSupplier.id) : supabase.from("fournisseurs").insert(p as Omit<Fournisseur, "id" | "created_at">);
    let { error } = await run(payload);
    // Repli si la colonne solde_depart n'est pas encore créée (SQL pas collé)
    if (error && /solde_depart/i.test(error.message)) {
      delete payload.solde_depart;
      if (sForm.solde_depart) alert("Le « solde de départ » n'a pas pu être enregistré : colle d'abord le SQL supabase/fournisseur_solde_depart.sql, puis réessaie.");
      ({ error } = await run(payload));
    }
    if (error) { alert("Erreur : " + error.message); return; }
    setShowSupplier(false); load();
  }
  async function removeSupplier(f: Fournisseur) {
    if (!confirm(`Supprimer « ${f.nom} » et tout son historique ?`)) return;
    await supabase.from("fournisseurs").delete().eq("id", f.id);
    load();
  }

  // ---- Réception (marchandise prise) ----
  const emptyRecLine = (): RecLine => ({ product_id: "", equivalence_id: null, marque: "Filtron", quantite: 1, prix_achat: 0, prix_vente: 0, reference: "", code_barre: "", nouvelleMarque: null, nouvelleRef: "", nouvellePiece: null });
  function openReception(f: Fournisseur) { setRecFor(f); setRecDate(todayStr()); setRecLines([emptyRecLine()]); setScanMsg(""); }
  // Bouton « Réception » de l'accueil (/fournisseurs?reception=1) : ouvre directement sur le fournisseur crédit
  const autoReception = useRef(false);
  useEffect(() => {
    if (autoReception.current || !fournisseurs.length) return;
    if (!new URLSearchParams(window.location.search).has("reception")) return;
    autoReception.current = true;
    openReception(fournisseurs.find(x => (x.type ?? "credit") === "credit") ?? fournisseurs[0]);
    window.history.replaceState(null, "", "/fournisseurs");
  }, [fournisseurs]); // eslint-disable-line react-hooks/exhaustive-deps
  function setRecProduct(i: number, p: Product) {
    setRecLines(prev => prev.map((l, j) => j === i ? { ...l, product_id: p.id, equivalence_id: null, marque: "Filtron", prix_achat: p.prix_achat, prix_vente: p.prix_vente, reference: p.reference, code_barre: l.code_barre || p.code_barre || "", nouvelleMarque: null, nouvelleRef: "", nouvellePiece: null } : l));
  }
  // Boîte d'une autre marque (Flag…) marquée d'un NUMÉRO D'ORIGINE (ex. 5801317097 = IVECO → Filtron AP085/1) : la ligne
  // prend la fiche Filtron et crée la variante de la marque de la boîte avec la réf. tapée (BIBLE §8.39) — plus de
  // « nouvelle pièce » en double. La fiche peut être un camion : on l'ajoute à la liste pour cette réception.
  function choisirParOrigine(i: number, p: Product, refTapee: string) {
    setProducts(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p]);
    const marque = marqueVarianteDefaut(p.categorie, p.marque);
    setRecLines(prev => prev.map((l, j) => j === i ? { ...l, product_id: p.id, equivalence_id: null, reference: p.reference, prix_achat: p.prix_achat, prix_vente: p.prix_vente,
      code_barre: l.code_barre || "", marque: "__new__", nouvelleMarque: marque, nouvelleRef: refTapee.trim().toUpperCase(), nouvellePiece: null } : l));
  }
  // Réf. tapée introuvable → nouvelle pièce sur cette ligne (type selon la famille choisie, marque à choisir)
  function nouvellePieceSurLigne(i: number, reference: string) {
    const categorie: ProductCategory = FAMILLES.find(f => f.k === famille)?.nouveau ?? "autre";
    setRecLines(prev => prev.map((l, j) => j === i ? { ...l, product_id: "", equivalence_id: null, marque: "Filtron", reference: "", nouvelleMarque: null, nouvelleRef: "",
      nouvellePiece: { categorie, marque: "", reference: reference.trim().toUpperCase().replace(/\s+/g, " "), nom: "" } } : l));
  }
  const patchPiece = (i: number, patch: Partial<NouvellePiece>) =>
    setRecLines(prev => prev.map((l, j) => j === i && l.nouvellePiece ? { ...l, nouvellePiece: { ...l.nouvellePiece, ...patch } } : l));
  // Choix de la marque d'une ligne : Filtron (produit principal), une variante existante (Flag, Mann…)
  // ou « __new__ » = nouvelle marque créée à l'enregistrement (plus besoin de passer par Produits)
  function setRecVariant(i: number, marque: string) {
    setRecLines(prev => prev.map((l, j) => {
      if (j !== i) return l;
      const p = products.find(x => x.id === l.product_id);
      if (!p) return l;
      // Un code scanné/saisi à la main (inconnu) suit la ligne ; un code déjà connu suit sa marque
      const connus = new Set([p.code_barre, ...(variantsMap[l.product_id] ?? []).map(x => x.code_barre)].filter(Boolean));
      const garde = l.code_barre && !connus.has(l.code_barre) ? l.code_barre : null;
      // Marque proposée : Flag pour un filtre, sinon une marque du métier de la pièce (≠ celle de la fiche)
      const defaut = marqueVarianteDefaut(p.categorie, p.marque);
      if (marque === "__new__") return { ...l, equivalence_id: null, marque: "__new__", nouvelleMarque: defaut, nouvelleRef: "", code_barre: garde ?? "" };
      if (marque === "Filtron") return { ...l, equivalence_id: null, marque: "Filtron", reference: p.reference, prix_achat: p.prix_achat, prix_vente: p.prix_vente, code_barre: garde ?? p.code_barre ?? "", nouvelleMarque: null };
      const v = (variantsMap[l.product_id] || []).find(x => x.marque === marque);
      return v ? { ...l, equivalence_id: v.id, marque, reference: v.reference, prix_achat: v.prix_achat ?? p.prix_achat, prix_vente: v.prix ?? p.prix_vente, code_barre: garde ?? v.code_barre ?? "", nouvelleMarque: null } : l;
    }));
  }
  const patchLine = (i: number, patch: Partial<RecLine>) => setRecLines(prev => prev.map((l, j) => j === i ? { ...l, ...patch } : l));

  // Scan d'une boîte : code connu -> ligne du bon filtre/marque (+1 si déjà là) ; inconnu -> ligne à compléter
  const [scanTarget, setScanTarget] = useState<null | "boite" | number>(null);
  const [scanMsg, setScanMsg] = useState("");
  function onRecScan(raw: string) {
    const code = raw.trim();
    if (!code) return;
    if (typeof scanTarget === "number") { patchLine(scanTarget, { code_barre: code }); setScanTarget(null); return; }
    let found: { p: Product; v?: VariantRow } | null = null;
    const p0 = products.find(p => p.code_barre === code);
    if (p0) found = { p: p0 };
    else for (const [pid, vs] of Object.entries(variantsMap)) {
      const v = vs.find(x => x.code_barre === code);
      const p = v && products.find(x => x.id === pid);
      if (v && p) { found = { p, v }; break; }
    }
    const nonVide = (l: RecLine) => !!(l.product_id || l.code_barre); // retire la ligne vide de départ
    if (!found) {
      // Même boîte inconnue scannée plusieurs fois : +1 sur sa ligne (pas une ligne par boîte)
      const deja = recLines.some(l => l.code_barre === code);
      setScanMsg(`❓ Code ${code} inconnu${deja ? " +1" : ""} — après le scan, choisis son filtre sur la ligne « à compléter »`);
      setRecLines(prev => {
        const lines = prev.filter(nonVide);
        if (lines.some(l => l.code_barre === code)) return lines.map(l => l.code_barre === code ? { ...l, quantite: l.quantite + 1 } : l);
        return [...lines, { ...emptyRecLine(), code_barre: code }];
      });
      return;
    }
    const { p, v } = found;
    const meme = (l: RecLine) => l.product_id === p.id && l.equivalence_id === (v?.id ?? null);
    setScanMsg(`✓ ${v ? `${v.reference} (${v.marque})` : p.reference}${recLines.some(meme) ? " +1" : " ajouté"}`);
    setRecLines(prev => {
      const lines = prev.filter(nonVide);
      if (lines.some(meme)) return lines.map(l => meme(l) ? { ...l, quantite: l.quantite + 1 } : l);
      return [...lines, {
        ...emptyRecLine(), product_id: p.id, code_barre: code, reference: v?.reference ?? p.reference,
        equivalence_id: v?.id ?? null, marque: v?.marque ?? "Filtron",
        prix_achat: v?.prix_achat ?? p.prix_achat, prix_vente: v?.prix ?? p.prix_vente,
      }];
    });
  }

  // Catalogues officiels (même groupe que Filtron) : équivalent Mann / Wix d'une réf Filtron
  const crossUrl = (marque: "Mann" | "Wix", ref: string) => marque === "Mann"
    ? `https://www.mann-filter.com/fr-fr/catalogue/resultats-de-la-recherche.html?mode=crossReference&displayView=Grid&crossReference=${encodeURIComponent(ref)}`
    : `https://www.wixfilters.com/fr-mea/catalog/results.html?mode=crossReference&displayView=Grid&crossReference=${encodeURIComponent(ref)}`;
  const recMontant = recLines.reduce((s, l) => s + l.quantite * l.prix_achat, 0);
  // Pour retrouver un filtre en tapant la réf d'une marque (WL7009 Wix → OE640/2, marque Wix choisie)
  const pickerVariants = useMemo(() => Object.entries(variantsMap).flatMap(([product_id, vs]) =>
    vs.map(v => ({ id: v.id, product_id, marque: v.marque, reference: v.reference }))), [variantsMap]);
  // Recherche limitée à la famille choisie (« Je reçois ») ; le scan, lui, reconnaît toutes les boîtes
  const produitsFamille = useMemo(() => products.filter(p => familleDe(p.categorie) === famille), [products, famille]);
  const typesPiece = creables(famille); // tout sauf les filtres Filtron
  const pieceNouvellePossible = typesPiece.length > 0;
  async function saveReception() {
    if (!recFor) return;
    // Nouvelle pièce dont la référence existe déjà (tapée sans la voir) : on prend la fiche existante
    const normRef = (r: string) => r.toUpperCase().replace(/\s+/g, "");
    const lignesOk = recLines.map(l => {
      if (l.product_id || !l.nouvellePiece) return l;
      const ex = products.find(p => normRef(p.reference) === normRef(l.nouvellePiece!.reference));
      return ex ? { ...l, product_id: ex.id, reference: ex.reference, nouvellePiece: null } : l;
    });
    const valid = lignesOk.filter(l => (l.product_id || l.nouvellePiece) && l.quantite > 0);
    if (valid.length === 0) { alert("Ajoute au moins un produit"); return; }
    if (valid.some(l => l.nouvellePiece && (!l.nouvellePiece.reference.trim() || !l.nouvellePiece.marque))) { alert("Nouvelle pièce : écris sa référence et choisis sa marque (Gates, Dayco, Dolz…)."); return; }
    const dentsDe = (np: NouvellePiece) => (avecDents(np.categorie) ? normDents(np.dents) : "");
    if (valid.some(l => l.nouvellePiece && dentsDe(l.nouvellePiece) && !dentsValides(dentsDe(l.nouvellePiece)))) { alert(MSG_DENTS); return; }
    if (valid.some(l => l.marque === "__new__" && !l.nouvelleRef.trim())) { alert("Nouvelle marque : saisis la référence de la boîte (ex. HU 718/5 x)."); return; }
    const montant = valid.reduce((s, l) => s + l.quantite * l.prix_achat, 0);
    const libelle = (l: RecLine) => l.nouvellePiece ? `${l.nouvellePiece.reference.trim()} (${l.nouvellePiece.marque})`
      : l.marque === "__new__" ? `${l.nouvelleRef.trim()} (${l.nouvelleMarque})` : `${l.reference}${l.marque && l.marque !== "Filtron" ? ` (${l.marque})` : ""}`;
    const details = valid.map(l => `${libelle(l)}×${l.quantite}`).join(", ");
    // Toujours via la file d'attente : marche hors-ligne et reprend proprement après une coupure
    ajouterReception({
      id: crypto.randomUUID(), fournisseur_id: recFor.id, date: recDate, montant, details, faites: 0, enregistree: false, detail: [],
      lignes: valid.map(l => ({
        product_id: l.product_id, equivalence_id: l.marque === "__new__" ? null : l.equivalence_id, quantite: l.quantite,
        prix_achat: l.prix_achat, prix_vente: l.prix_vente, code_barre: l.code_barre,
        nouvelleMarque: l.marque === "__new__" ? l.nouvelleMarque : null, nouvelleRef: l.nouvelleRef, libelle: libelle(l),
        nouvellePiece: l.nouvellePiece ? { ...l.nouvellePiece, reference: l.nouvellePiece.reference.trim(), nom: `${libelleCat(l.nouvellePiece.categorie)} ${l.nouvellePiece.marque}`, dents: dentsDe(l.nouvellePiece) || undefined } : null,
      })),
    });
    setRecFor(null);
    await envoyerReceptions();
  }

  // ---- Avance ----
  function openAvance(f: Fournisseur, depuisPortefeuille = false) {
    setAvFor(f); setAvDate(todayStr()); setAvMontant(0); setAvNote("");
    setAvMode("especes"); setAvPersonne(""); setAvCheque(""); setAvDateCheque(todayStr()); setAvEncaisse(false); setAvPortefeuille(depuisPortefeuille);
  }
  async function basculerEncaisse(a: Avance) {
    const erreur = await marquerChequeEncaisse(a.id, !a.cheque_encaisse);
    if (erreur) { alert(erreur); return; }
    setAvances(prev => prev.map(x => x.id === a.id ? { ...x, cheque_encaisse: !a.cheque_encaisse } : x));
  }
  async function saveAvance() {
    if (!avFor || avMontant <= 0) { alert("Montant requis"); return; }
    if (avMode === "cheque" && !avCheque.trim()) { alert("Tape le numéro du chèque."); return; }
    const paiement: Paiement = { mode: avMode, personne: avPersonne, numero_cheque: avCheque, date_cheque: avDateCheque, cheque_encaisse: avEncaisse };
    if (avPortefeuille) {
      const r = await donnerPortefeuille(avFor.id, avMontant, avDate, paiement, avNote);
      if (!r.ok) { alert(r.error); return; }
    } else {
      const erreur = await insererAvance({ fournisseur_id: avFor.id, date: avDate, montant: avMontant, note: avNote || null }, paiement);
      if (erreur) { alert(erreur); return; }
    }
    setAvFor(null); load();
  }

  function histOf(id: string) {
    const r = receptions.filter(x => x.fournisseur_id === id && inMonth(x.date)).map(x => ({ type: "rec" as const, date: x.date, cree: x.created_at ?? "", montant: x.montant, text: x.details ?? "Marchandise", rec: x, av: null }));
    const a = avances.filter(x => x.fournisseur_id === id && inMonth(x.date)).map(x => ({ type: "av" as const, date: x.date, cree: x.created_at ?? "", montant: x.montant, text: x.note ?? "Avance", rec: null, av: x }));
    // Par date, puis le plus récent en haut dans une même journée (avant : toutes les réceptions du jour passaient
    // avant les avances du même jour, qui se retrouvaient en bas de la liste)
    return [...r, ...a].sort((p, q) => q.date.localeCompare(p.date) || q.cree.localeCompare(p.cree));
  }

  // ---- Réceptions en attente (hors-ligne / coupure) : envoi auto au retour du réseau ----
  const [recAttente, setRecAttente] = useState(0);
  const [recErreur, setRecErreur] = useState("");
  async function envoyerReceptions() {
    setRecAttente(getReceptionsAttente().length);
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const { left, erreur } = await syncReceptions();
    setRecAttente(left); setRecErreur(left ? erreur ?? "" : "");
    load();
  }
  useEffect(() => {
    if (getReceptionsAttente().length) envoyerReceptions();
    const onOnline = () => envoyerReceptions();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Annulations (erreur de saisie) ----
  async function annulerReception(r: Reception) {
    if (typeof navigator !== "undefined" && !navigator.onLine) { alert("Annulation impossible hors-ligne."); return; }
    const lignes = r.lignes ?? [];
    // Articles déjà (en partie) vendus : le stock passerait en négatif -> on le dit avant d'annuler
    const negatifs: string[] = [];
    for (const l of lignes) {
      const { data } = l.equivalence_id
        ? await supabase.from("equivalences").select("stock").eq("id", l.equivalence_id).single()
        : await supabase.from("products").select("stock").eq("id", l.product_id).single();
      const stock = data?.stock ?? 0;
      if (stock < l.quantite) negatifs.push(`${l.ref} : stock ${stock}, à retirer ${l.quantite} → ${stock - l.quantite}`);
    }
    const quoi = r.fournisseur_id && isCapital(fournisseurs.find(f => f.id === r.fournisseur_id) ?? ({} as Fournisseur))
      ? `${r.montant.toFixed(0)} MAD reviennent dans ton capital` : `${r.montant.toFixed(0)} MAD sont enlevés de la dette`;
    const msg = (lignes.length
      ? `Annuler la réception du ${r.date} ?\n${r.details ?? ""}\n\n→ le stock de ces articles est retiré et ${quoi}.`
      : `Annuler la réception du ${r.date} ?\n${r.details ?? ""}\n\n⚠ Réception sans détail enregistré : ${quoi}, mais le STOCK ne sera pas retiré (corrige-le dans Stock).`)
      + (negatifs.length ? `\n\n⚠ Déjà vendu en partie — le stock passera en NÉGATIF :\n• ${negatifs.join("\n• ")}\n(À corriger ensuite dans Stock, ou annule plutôt les ventes concernées.)` : "");
    const estRetour = r.type === "retour";
    if (!confirm(estRetour
      ? `Annuler le retour du ${r.date} ?
${r.details ?? ""}

→ les pièces reviennent dans le stock et ${(-r.montant).toFixed(0)} MAD ${quoi.includes("capital") ? "repartent du capital" : "remontent sur la dette"}.`
      : msg)) return;
    for (const l of lignes) {
      if (l.equivalence_id) await supabase.rpc("decrement_equiv_stock", { e_id: l.equivalence_id, qty: l.quantite });
      else await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
    }
    await supabase.from("receptions").delete().eq("id", r.id);
    load();
  }
  async function annulerAvance(a: Avance) {
    if (a.sale_id) { alert("Ce paiement vient du camion d'un bon : annule-le depuis Ventes (bouton « Remboursé »)."); return; }
    if (!confirm(`Annuler le paiement du ${a.date} (${a.montant.toFixed(0)} MAD) ? La dette remontera d'autant.`)) return;
    await supabase.from("avances").delete().eq("id", a.id);
    load();
  }

  return (
    <div>
      <Header title="suppliers" action={
        <div className="flex items-center gap-2">
          <select className="input w-auto py-1.5 text-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            <option value="all">Tous les mois</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button onClick={() => setShowAmounts(v => !v)} title={showAmounts ? "Masquer les montants" : "Afficher les montants"}
            className="btn-secondary flex items-center gap-1.5">
            {showAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="hidden sm:inline">{showAmounts ? "Masquer" : "Afficher"}</span>
          </button>
          <button onClick={openNewSupplier} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">Fournisseur</span>
          </button>
        </div>
      } />

      {recAttente > 0 && (
        <div className="card p-3 mb-4 flex items-center justify-between gap-3" style={{ borderColor: "rgba(234,179,8,0.4)" }}>
          <span className="text-sm text-yellow-400 flex items-center gap-2">
            <CloudOff size={16} /> {recAttente} réception(s) en attente d&apos;envoi{recErreur ? " (réseau)" : " — envoi dès le retour du réseau"}
          </span>
          <button onClick={envoyerReceptions} className="btn-secondary text-xs flex items-center gap-1"><RefreshCw size={14} /> Envoyer</button>
        </div>
      )}

      {/* Capital / Dette / Bénéfice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><PiggyBank size={14} className="text-emerald-400" /> Capital disponible (mon argent)</h3>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{money(capitalTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">cumulé · grandit avec les ventes</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Truck size={14} className="text-red-400" /> Total dû (fournisseurs crédit)</h3>
          <p className={`text-2xl font-bold mt-1 ${duTotal > 0 ? "text-red-400" : "text-emerald-400"}`}>{money(duTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">cumulé</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><TrendingUp size={14} className="text-sky-400" /> Bénéfice (toutes ventes)</h3>
          <p className="text-2xl font-bold text-sky-400 mt-1">{money(porte.benefice)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{periodTxt}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10">Chargement…</p>
      ) : fournisseurs.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <Truck size={40} className="mx-auto mb-3 text-slate-600" />
          <p>Aucun fournisseur. Clique « Ajouter fournisseur » pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fournisseurs.map(f => {
            const cap = isCapital(f);
            const solde = soldeOf(f.id);
            const capital = capitalOf(f.id);
            const att = attByF[f.id] ?? { ventes: 0, benef: 0 };
            const open = expanded === f.id;
            return (
              <div key={f.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
                      {cap ? <PiggyBank size={16} className="text-emerald-400" /> : <Truck size={16} className="text-red-400" />}
                      {f.nom}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cap ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{cap ? "capital" : "crédit"}</span>
                    </p>
                    {f.telephone && (
                      <div className="flex items-center gap-2 mt-1">
                        <a href={`tel:${f.telephone}`} className="flex items-center gap-1 text-xs text-blue-400 hover:underline"><Phone size={12} /> {f.telephone}</a>
                        <a href={waLink(f.telephone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-green-500/15 text-green-300 px-2 py-0.5 rounded-full"><MessageCircle size={11} /> WA</a>
                      </div>
                    )}
                    {f.note && <p className="text-xs text-slate-500 mt-1">{f.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-500">{cap ? "Capital disponible" : solde < 0 ? "Il te doit" : "Reste à payer"}</p>
                    {cap
                      ? <p className="text-xl font-bold text-emerald-400">{money(capital)}</p>
                      : <p className={`text-xl font-bold ${solde > 0 ? "text-red-400" : "text-emerald-400"}`}>{money(Math.abs(solde))}</p>}
                    <div className="flex gap-2 justify-end mt-1">
                      <button onClick={() => openEditSupplier(f)} className="text-blue-400 hover:text-blue-300"><Pencil size={14} /></button>
                      <button onClick={() => removeSupplier(f)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                  {cap ? (
                    <>
                      <span>Vendu : <b className="text-slate-200">{money(att.ventes)}</b></span>
                      <span>Acheté : <b className="text-slate-200">{money(recByF[f.id] ?? 0)}</b></span>
                    </>
                  ) : (
                    <>
                      {departOf(f.id) !== 0 && (
                        <span>Départ : <b className={departOf(f.id) < 0 ? "text-emerald-300" : "text-orange-300"}>{money(Math.abs(departOf(f.id)))} {departOf(f.id) < 0 ? "(il te doit)" : "(tu lui dois)"}</b></span>
                      )}
                      <span>Pris ({periodTxt}) : <b className="text-slate-200">{money(recByFPeriod[f.id] ?? 0)}</b></span>
                      <span>Versé ({periodTxt}) : <b className="text-slate-200">{money(avByFPeriod[f.id] ?? 0)}</b></span>
                      <span>Bénéfice : <b className="text-emerald-300">{money(att.benef)}</b></span>
                    </>
                  )}
                </div>

                {/* Bons vendus avec sa marchandise, pas encore mis de côté (camion) */}
                {!cap && (bonsARemb[f.id]?.length ?? 0) > 0 && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5">
                    <button onClick={() => setBonsOuverts(bonsOuverts === f.id ? null : f.id)} className="w-full px-3 py-2 flex items-center justify-between text-xs text-red-300">
                      <span className="flex items-center gap-1.5"><Truck size={13} /> Bons à mettre de côté : {bonsARemb[f.id].length}</span>
                      <span className="font-semibold">{money(bonsARemb[f.id].reduce((s, b) => s + b.cout, 0))} {bonsOuverts === f.id ? "▴" : "▾"}</span>
                    </button>
                    {bonsOuverts === f.id && (
                      <div className="border-t border-red-500/20 divide-y divide-slate-800">
                        {bonsARemb[f.id].map(b => (
                          <div key={b.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-300 min-w-0 truncate">{b.date.slice(5).split("-").reverse().join("/")} · {b.client || "—"}</span>
                            <button onClick={() => rembourserBon(f, b)} className="shrink-0 rounded-full bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 font-medium">
                              👛 Mettre de côté {money(b.cout)}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Portefeuille : argent mis de côté pour ce fournisseur, pas encore donné (la dette ne bouge pas) */}
                {!cap && portefeuille.some(b => b.fournisseur_id === f.id) && (() => {
                  const bons = portefeuille.filter(b => b.fournisseur_id === f.id);
                  const tot = totauxPortefeuille(bons);
                  return (
                    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <button onClick={() => setPortefeuilleOuvert(portefeuilleOuvert === f.id ? null : f.id)} className="flex flex-wrap items-center gap-x-1.5 text-amber-300 text-start">
                          👛 Portefeuille ({tot.nb} bon{tot.nb > 1 ? "s" : ""}) : vendu <b>{money(tot.vendu)}</b> · pour {f.nom} <b>{money(tot.cout)}</b> {portefeuilleOuvert === f.id ? "▴" : "▾"}
                        </button>
                        <button onClick={() => donner(f)} className="rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 px-2.5 py-1 font-semibold">
                          Donner à {f.nom}
                        </button>
                      </div>
                      <p className="px-3 pb-2 text-[11px] text-slate-400">Pas encore compté dans la dette : elle baisse quand tu donnes le portefeuille (une seule avance avec la somme comptée).</p>
                      {portefeuilleOuvert === f.id && (
                        <div className="border-t border-amber-500/20 divide-y divide-slate-800">
                          {bons.map(b => (
                            <div key={`${b.sale_id}-${b.fournisseur_id}`} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-300 min-w-0 truncate">{b.bon_date.slice(5).split("-").reverse().join("/")} · {b.client || "—"} · vendu {b.vendu != null ? money(b.vendu) : "?"} · pour {f.nom} {money(b.montant)}</span>
                              <button onClick={() => sortirDuPortefeuille(b)} className="shrink-0 text-slate-400 hover:text-red-300 underline">Sortir</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => openReception(f)} className="flex items-center gap-1.5 text-xs bg-orange-500/15 text-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-500/25"><PackagePlus size={14} /> Marchandise prise</button>
                  <button onClick={() => setRetourFor(f)} className="flex items-center gap-1.5 text-xs bg-amber-500/15 text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-500/25"><Undo2 size={14} /> Rendre des pièces</button>
                  {!cap && <button onClick={() => openAvance(f)} className="flex items-center gap-1.5 text-xs bg-emerald-500/15 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/25"><HandCoins size={14} /> Avance / paiement</button>}
                  <button onClick={() => setExpanded(open ? null : f.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 ms-auto">
                    Historique {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {open && (() => {
                  // Deux historiques séparés (demande de l'utilisateur) : marchandise prise / avances (argent donné)
                  const tout = histOf(f.id);
                  const recs = tout.filter(h => h.type === "rec"), avs = tout.filter(h => h.type === "av");
                  const onglet = cap ? "rec" : (ongletHisto[f.id] ?? "rec");
                  const liste = onglet === "rec" ? recs : avs;
                  const tot = (l: typeof tout) => l.reduce((s, h) => s + h.montant, 0);
                  return (
                  <div className="mt-3 border-t border-slate-700/60 pt-2">
                    <div className="flex gap-1.5 mb-2" role="tablist">
                      <button role="tab" aria-selected={onglet === "rec"} onClick={() => setOngletHisto(o => ({ ...o, [f.id]: "rec" }))}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${onglet === "rec" ? "bg-orange-500/20 text-orange-300" : "text-slate-400 hover:text-slate-200"}`}>
                        📦 Marchandise prise ({recs.length}) · {money(tot(recs))}
                      </button>
                      {!cap && (
                        <button role="tab" aria-selected={onglet === "av"} onClick={() => setOngletHisto(o => ({ ...o, [f.id]: "av" }))}
                          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${onglet === "av" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-slate-200"}`}>
                          💵 Avances ({avs.length}) · {money(tot(avs))}
                        </button>
                      )}
                    </div>
                    {onglet === "av" && (() => {
                      const attente = avs.filter(h => h.av?.mode === "cheque" && !h.av.cheque_encaisse);
                      return attente.length > 0 ? <p className="text-[11px] text-amber-300 mb-2">⏳ Chèques pas encore encaissés : {attente.length} · {money(tot(attente))}</p> : null;
                    })()}
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {liste.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">{onglet === "rec" ? "Aucune marchandise prise." : "Aucune avance."}</p>
                    ) : liste.map((h, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs py-1">
                        <span className="text-slate-400 min-w-0">
                          {h.date} · <span className="text-slate-300">{h.text}</span>
                          {h.rec && (h.rec.lignes ?? []).map((l, k) => <FiltronDe key={k} produit={products.find(p => p.id === l.product_id)} className="block" />)}
                          {h.av && textePaiement(h.av) && <span className="block text-slate-400">{textePaiement(h.av)}</span>}
                          {h.av?.mode === "cheque" && (
                            <button onClick={() => basculerEncaisse(h.av!)} title="Changer : encaissé / pas encore"
                              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${h.av.cheque_encaisse ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                              {h.av.cheque_encaisse ? "✓ Encaissé" : "⏳ Pas encore encaissé"}
                            </button>
                          )}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className={h.rec?.type === "retour" ? "text-amber-300 font-medium" : h.type === "rec" ? "text-orange-300 font-medium" : "text-emerald-300 font-medium"}>
                            {h.rec?.type === "retour" ? "↩ −" + money(-h.montant) : (h.type === "rec" ? "+" : "−") + money(h.montant)}
                          </span>
                          <button onClick={() => h.rec ? annulerReception(h.rec) : h.av && annulerAvance(h.av)}
                            className="text-slate-500 hover:text-red-400" title={h.type === "rec" ? "Annuler cette réception" : "Annuler ce paiement"}><X size={13} /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal fournisseur */}
      {showSupplier && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100">{editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h3>
              <button onClick={() => setShowSupplier(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Nom *</label><input className="input" value={sForm.nom} onChange={e => setSForm({ ...sForm, nom: e.target.value })} /></div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <select className="input" value={sForm.type} onChange={e => setSForm({ ...sForm, type: e.target.value as FournisseurType })}>
                  <option value="credit">Crédit — fournisseur à rembourser (ex. dinoun)</option>
                  <option value="capital">Capital — mon propre argent (ex. filtropro)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Capital : ton argent qui tourne et grandit. Crédit : tu rembourses le coût, tu gardes le bénéfice.</p>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Téléphone</label><input className="input" value={sForm.telephone} onChange={e => setSForm({ ...sForm, telephone: e.target.value })} /></div>
              {/* Solde de départ (onboarding depuis le cahier) */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Solde de départ (MAD)</label>
                <input type="number" className="input" value={sForm.solde_depart || ""} placeholder="0"
                  onChange={e => setSForm({ ...sForm, solde_depart: +e.target.value })} />
                <p className="text-[11px] text-slate-500 mt-1">
                  Au démarrage : mets ce que <b>tu lui dois</b> déjà (ex. 800). S&apos;il <b>te doit</b>, mets un montant négatif (ex. -500). Laisse 0 si rien.
                </p>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Note</label><textarea className="input" rows={2} value={sForm.note} onChange={e => setSForm({ ...sForm, note: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowSupplier(false)} className="btn-secondary">Annuler</button>
              <button onClick={saveSupplier} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {scanTarget !== null && (
        // au-dessus de la fenêtre de réception (même z-50)
        <div className="relative z-[70]">
          <BarcodeScanner onScan={onRecScan} onClose={() => setScanTarget(null)}
            hint={scanTarget === "boite" ? "Scanne les boîtes une par une, tous produits mélangés : +1 à chaque lecture. Ferme (✕) quand tu as fini." : "Vise le code-barres de la boîte de cette ligne."}
            status={scanTarget === "boite" && scanMsg
              ? `${scanMsg} · ${recLines.filter(l => l.product_id || l.code_barre).reduce((s, l) => s + l.quantite, 0)} boîte(s), ${recLines.filter(l => l.product_id || l.code_barre).length} réf.`
              : undefined} />
        </div>
      )}

      {/* Modal réception */}
      {retourFor && (
        <RetourFournisseurModal fournisseur={retourFor} receptions={receptions} onClose={() => setRetourFor(null)}
          onDone={(m) => { setRetourFor(null); setRetourMsg(m); setTimeout(() => setRetourMsg(""), 6000); load(); }} />
      )}
      {retourMsg && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] rounded-xl bg-emerald-600 text-white text-sm px-4 py-2 shadow-lg max-w-[90vw]">{retourMsg}</div>}

      {recFor && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><PackagePlus size={18} className="text-orange-400" /> Marchandise prise</h3>
              <button onClick={() => setRecFor(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            {/* Chez qui (crédit = dette / capital = ton argent) + date — grille : .input est w-full */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-xs text-slate-400">Chez
                <select className="input mt-1" value={recFor.id} onChange={e => { const f = fournisseurs.find(x => x.id === e.target.value); if (f) setRecFor(f); }}>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom} {isCapital(f) ? "(mon argent)" : "(à crédit)"}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Date
                <input type="date" className="input mt-1" value={recDate} onChange={e => setRecDate(e.target.value)} />
              </label>
            </div>
            <ChoixVehicule value={typeV} onChange={setTypeV} className="mb-3" />
            {/* « Je reçois » : la recherche des lignes ne montre que cette famille (et ses marques) — BIBLE §8.30 */}
            <p className="text-[10px] uppercase text-slate-500 mb-1">Je reçois</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {FAMILLES.map(x => (
                <button key={x.k} type="button" onClick={() => setFamille(x.k)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[11px] font-semibold leading-tight text-center transition-colors ${
                    famille === x.k ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/40" : "bg-[var(--surface-2)] text-slate-300 hover:text-white"}`}>
                  <CategoryIcon categorie={x.icone} size={18} /> {x.court}
                </button>
              ))}
            </div>
            {/* Scan des boîtes : chaque boîte scannée ajoute sa ligne (ou +1) */}
            <button onClick={() => { setScanMsg(""); setScanTarget("boite"); }} disabled={products.length === 0}
              className="w-full mb-2 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">
              <ScanLine size={16} /> Scanner les boîtes
            </button>
            {scanMsg && <p className="text-xs text-amber-400 mb-2">{scanMsg}</p>}
            <div className="space-y-2 mb-2">
              {products.length === 0 && <p className="text-xs text-amber-400">Chargement des produits… (quelques secondes sur réseau lent)</p>}
              {products.length > 0 && pieceNouvellePossible && (
                <p className="text-[11px] text-amber-300/90">
                  {produitsFamille.length === 0 ? "Aucune pièce de ce type dans l'appli pour l'instant. " : `${produitsFamille.length} pièce(s) déjà enregistrée(s). `}
                  Tape la réf. écrite sur la boîte : si elle n&apos;existe pas, touche « ➕ Nouvelle pièce » (créée à l&apos;enregistrement){famille === "filtres_huile" ? " — huile, accessoires ou outils ; un filtre se choisit toujours par sa réf. Filtron" : ""}.
                </p>
              )}
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-slate-500">
                <span className="col-span-11">Produit</span>
                <span className="col-span-1"></span>
              </div>
              {recLines.map((l, i) => (
                <div key={i} className="border-b border-slate-800/40 pb-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-11">
                      {l.nouvellePiece ? (
                        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 flex items-center justify-between gap-2">
                          <span className="text-xs text-amber-300 font-semibold truncate">🆕 Nouvelle pièce · <span className="font-mono">{l.nouvellePiece.reference || "—"}</span></span>
                          <button type="button" onClick={() => patchLine(i, { nouvellePiece: null })} className="text-[11px] text-slate-400 hover:text-white shrink-0">Annuler</button>
                        </div>
                      ) : (
                        <ProductPicker products={produitsFamille} variants={pickerVariants} value={l.product_id}
                          placeholder={famille === "filtres_huile" ? undefined : `Réf. ${marquesBase(FAMILLES.find(f => f.k === famille)?.nouveau).slice(0, 3).join(", ")}…`}
                          onCreate={pieceNouvellePossible ? (ref) => nouvellePieceSurLigne(i, ref) : undefined}
                          onSelect={(p, v, o) => { if (o) choisirParOrigine(i, p, o.tape); else { setRecProduct(i, p); if (v) setRecVariant(i, v.marque); } }} />
                      )}
                    </div>
                    <button onClick={() => setRecLines(prev => prev.filter((_, j) => j !== i))} className="col-span-1 text-red-400 hover:text-red-300 flex justify-center"><Trash2 size={14} /></button>
                  </div>
                  {!l.product_id && !l.nouvellePiece && l.code_barre && (
                    <p className="text-[11px] text-amber-400 mt-1">📦 Boîte scannée ×{l.quantite} (code {l.code_barre}) : tape sa réf. ci-dessus — le code sera retenu pour les prochaines fois.</p>
                  )}
                  {!l.product_id && !l.nouvellePiece && pieceNouvellePossible && (
                    <button type="button" onClick={() => nouvellePieceSurLigne(i, "")} className="mt-1 text-[11px] text-amber-400 hover:text-amber-300">➕ Nouvelle pièce (pas encore dans l&apos;appli)</button>
                  )}
                  {/* Nouvelle pièce : type + marque + réf. de la boîte ; la fiche est créée à l'enregistrement (même hors-ligne) */}
                  {l.nouvellePiece && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <label className="text-[10px] uppercase text-slate-500">Type
                        <select className="input mt-0.5 py-1 text-xs" value={l.nouvellePiece.categorie} onChange={e => patchPiece(i, { categorie: e.target.value as ProductCategory })}>
                          {[...typesPiece, ...(typesPiece.includes(l.nouvellePiece.categorie) ? [] : [l.nouvellePiece.categorie])].map(c => <option key={c} value={c}>{libelleCat(c)}</option>)}
                        </select>
                      </label>
                      <label className="text-[10px] uppercase text-slate-500">Marque
                        <select className={`input mt-0.5 py-1 text-xs ${l.nouvellePiece.marque ? "" : "ring-1 ring-amber-500"}`} value={l.nouvellePiece.marque} onChange={async e => {
                          if (e.target.value !== "__ajout__") { patchPiece(i, { marque: e.target.value }); return; }
                          const nom = window.prompt("Nom de la nouvelle marque (comme sur la boîte) :");
                          if (!nom) return;
                          const r = await ajouterMarque(nom, l.nouvellePiece?.categorie); // rattachée au type de la pièce (BIBLE §8.31)
                          setMarques(r.marques);
                          if (r.erreur) { alert(r.erreur); return; }
                          if (r.marque) patchPiece(i, { marque: r.marque });
                        }}>
                          {!l.nouvellePiece.marque && <option value="">— choisis —</option>}
                          {marquesPour(marques, l.nouvellePiece.categorie, l.nouvellePiece.marque).map(b => <option key={b} value={b}>{b}</option>)}
                          <option value="__ajout__">➕ Nouvelle marque…</option>
                        </select>
                      </label>
                      <label className={`${avecDents(l.nouvellePiece.categorie) ? "" : "col-span-2 "}text-[10px] uppercase text-slate-500`}>Réf. sur la boîte
                        <input className="input mt-0.5 py-1 text-xs font-mono uppercase" placeholder="ex. K015578XS" value={l.nouvellePiece.reference} onChange={e => patchPiece(i, { reference: e.target.value.toUpperCase() })} />
                      </label>
                      {avecDents(l.nouvellePiece.categorie) && (
                        <label className="text-[10px] uppercase text-amber-400">🦷 Dents / largeur
                          <input className={`input mt-0.5 py-1 text-xs font-mono ${l.nouvellePiece.dents && !dentsValides(normDents(l.nouvellePiece.dents)) ? "ring-2 ring-red-500/70" : ""}`} placeholder="ex. 141/25" inputMode="decimal"
                            value={l.nouvellePiece.dents ?? ""} onChange={e => patchPiece(i, { dents: e.target.value })} onBlur={e => patchPiece(i, { dents: normDents(e.target.value) })} />
                        </label>
                      )}
                      <div className="col-span-2 flex items-center gap-2">
                        <input className="input py-1 text-xs font-mono" placeholder="Code-barres de la boîte" value={l.code_barre} onChange={e => patchLine(i, { code_barre: e.target.value })} />
                        <button type="button" onClick={() => setScanTarget(i)} className="btn-secondary px-2.5 py-1.5 shrink-0" aria-label="Scanner le code-barres"><ScanLine size={14} /></button>
                      </div>
                    </div>
                  )}
                  {/* Qté + prix sur une 2e ligne : lisible sur téléphone (grille avec libellés : .input est w-full) */}
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <label className="text-[10px] uppercase text-slate-500">Qté
                      <input type="number" min={1} className="input mt-0.5 text-center" value={l.quantite} onChange={e => setRecLines(prev => prev.map((x, j) => j === i ? { ...x, quantite: Math.max(1, +e.target.value) } : x))} />
                    </label>
                    <label className="text-[10px] uppercase text-slate-500">Prix achat (u.)
                      <input type="number" min={0} step="0.01" className="input mt-0.5 text-center" placeholder="achat" value={l.prix_achat || ""} onChange={e => setRecLines(prev => prev.map((x, j) => j === i ? { ...x, prix_achat: Math.max(0, +e.target.value) } : x))} />
                    </label>
                    <label className="text-[10px] uppercase text-slate-500">Prix vente (u.)
                      <input type="number" min={0} step="0.01" className={`input mt-0.5 text-center ${l.prix_vente > 0 && l.prix_vente <= l.prix_achat ? "ring-2 ring-red-500/70" : ""}`} placeholder="vente" value={l.prix_vente || ""} onChange={e => setRecLines(prev => prev.map((x, j) => j === i ? { ...x, prix_vente: Math.max(0, +e.target.value) } : x))} />
                    </label>
                  </div>
                  {l.prix_vente > 0 && l.prix_achat > 0 && (
                    <p className={`text-[10px] mt-0.5 ${l.prix_vente <= l.prix_achat ? "text-red-400" : "text-emerald-400"}`}>
                      Marge : {(l.prix_vente - l.prix_achat).toFixed(2)} MAD/u ({Math.round(((l.prix_vente - l.prix_achat) / l.prix_achat) * 100)} %)
                    </p>
                  )}
                  {/* Choix de la marque : le stock ira sur cette marque (Flag, Mann…) ou sur Filtron ; ou nouvelle marque */}
                  {l.product_id && (() => {
                    const p = products.find(x => x.id === l.product_id);
                    return (
                      <select className="input mt-1 py-1 text-xs" value={l.marque} onChange={e => setRecVariant(i, e.target.value)}>
                        <option value="Filtron">{p?.reference} · {p?.marque || "Filtron"} (principal)</option>
                        {(variantsMap[l.product_id] ?? []).map(v => (
                          <option key={v.id} value={v.marque}>{v.reference} · {v.marque}</option>
                        ))}
                        <option value="__new__">+ Autre marque ({estFiltre(p?.categorie) ? "Mann, Wix, Mahle, Purflux, Mecafilter" : marquesBase(p?.categorie).filter(m => m !== p?.marque).slice(0, 4).join(", ")}…)</option>
                      </select>
                    );
                  })()}
                  {l.marque === "__new__" && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <label className="text-[10px] uppercase text-slate-500">Marque
                        <select className="input mt-0.5 py-1 text-xs" value={l.nouvelleMarque ?? ""} onChange={async e => {
                          if (e.target.value !== "__ajout__") { patchLine(i, { nouvelleMarque: e.target.value }); return; }
                          // Nouvelle marque écrite par l'utilisateur : enregistrée pour toujours avec les autres
                          const nom = window.prompt("Nom de la nouvelle marque (comme sur la boîte) :");
                          if (!nom) return;
                          const r = await ajouterMarque(nom, products.find(x => x.id === l.product_id)?.categorie); // rattachée à la famille de la pièce
                          setMarques(r.marques);
                          if (r.erreur) { alert(r.erreur); return; }
                          if (r.marque) patchLine(i, { nouvelleMarque: r.marque });
                        }}>
                          {marquesPour(marques, products.find(x => x.id === l.product_id)?.categorie, l.nouvelleMarque).filter(b => b !== "Filtron").map(b => <option key={b} value={b}>{b}</option>)}
                          <option value="__ajout__">➕ Nouvelle marque…</option>
                        </select>
                      </label>
                      <label className="text-[10px] uppercase text-slate-500">Réf. sur la boîte
                        <input className="input mt-0.5 py-1 text-xs font-mono" placeholder="ex. HU 718/5 x" value={l.nouvelleRef} onChange={e => patchLine(i, { nouvelleRef: e.target.value })} />
                      </label>
                    </div>
                  )}
                  {l.product_id && (
                    <div className="flex items-center gap-2 mt-1">
                      <input className="input py-1 text-xs font-mono" placeholder="Code-barres de la boîte" value={l.code_barre} onChange={e => patchLine(i, { code_barre: e.target.value })} />
                      <button type="button" onClick={() => setScanTarget(i)} className="btn-secondary px-2.5 py-1.5 shrink-0" aria-label="Scanner le code-barres"><ScanLine size={14} /></button>
                    </div>
                  )}
                  {/* Équivalents officiels (catalogues du groupe Filtron) — filtres seulement */}
                  {l.product_id && estFiltre(products.find(x => x.id === l.product_id)?.categorie) && (
                    <div className="flex gap-3 mt-1 text-[11px]">
                      {(["Mann", "Wix"] as const).map(m => (
                        <a key={m} href={crossUrl(m, products.find(p => p.id === l.product_id)?.reference ?? "")} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                          <ExternalLink size={11} /> Équivalent {m}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setRecLines([...recLines, emptyRecLine()])} className="btn-secondary text-xs flex items-center gap-1"><Plus size={12} /> Ajouter une ligne</button>
              <p className="text-[11px] text-slate-500">Tape la réf. (Filtron, Wix, Flag…) ou scanne la boîte. Marque absente : « + Autre marque » sous la ligne, elle est créée à l&apos;enregistrement. Le code-barres scanné est mémorisé : la prochaine fois, la boîte est reconnue toute seule.</p>
            </div>
            <div className="bg-[var(--surface-2)] rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-300">{isCapital(recFor) ? "Coût total (payé avec ton argent)" : "Coût total (ajouté à la dette)"}</span>
              <span className="text-lg font-bold text-orange-400">{recMontant.toFixed(2)} MAD</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Le stock augmente automatiquement et les prix saisis (achat/vente) sont enregistrés sur la fiche du filtre → il apparaît dans le catalogue.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRecFor(null)} className="btn-secondary">Annuler</button>
              <button onClick={saveReception} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal avance */}
      {avFor && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><HandCoins size={18} className="text-emerald-400" /> {avPortefeuille ? `Donner à ${avFor.nom}` : `Avance — ${avFor.nom}`}</h3>
              <button onClick={() => setAvFor(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            {soldeOf(avFor.id) < 0
              ? <p className="text-xs text-slate-400 mb-3">Il te doit : <b className="text-emerald-400">{Math.abs(soldeOf(avFor.id)).toFixed(0)} MAD</b></p>
              : <p className="text-xs text-slate-400 mb-3">Reste à payer : <b className="text-red-400">{soldeOf(avFor.id).toFixed(0)} MAD</b></p>}
            {avPortefeuille && (() => {
              const t = totauxPortefeuille(portefeuille.filter(b => b.fournisseur_id === avFor.id));
              return <p className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">👛 Portefeuille : {t.nb} bons · vendu {t.vendu.toFixed(0)} MAD · pour {avFor.nom} {t.cout.toFixed(0)} MAD. Tape la somme que tu donnes vraiment (avec les ventes du cahier s'il y en a) : le portefeuille se videra.</p>;
            })()}
            <div className="space-y-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Date</label><input type="date" className="input" value={avDate} onChange={e => setAvDate(e.target.value)} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Montant versé (MAD)</label><input type="number" min={0} className="input" value={avMontant} onChange={e => setAvMontant(+e.target.value)} /></div>
              <div>
                <span className="text-xs text-slate-400 mb-1 block">Payé en</span>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode de paiement">
                  <button type="button" role="radio" aria-checked={avMode === "especes"} onClick={() => setAvMode("especes")}
                    className={`rounded-lg px-3 py-2 text-sm border ${avMode === "especes" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "border-slate-600 text-slate-300"}`}>💵 Espèces</button>
                  <button type="button" role="radio" aria-checked={avMode === "cheque"} onClick={() => setAvMode("cheque")}
                    className={`rounded-lg px-3 py-2 text-sm border ${avMode === "cheque" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "border-slate-600 text-slate-300"}`}>🧾 Chèque</button>
                </div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block" htmlFor="av-personne">Nom de la personne</label><input id="av-personne" className="input" placeholder="ex. Si Mohamed (qui reçoit ou signe)" value={avPersonne} onChange={e => setAvPersonne(e.target.value)} /></div>
              {avMode === "cheque" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-slate-400 mb-1 block" htmlFor="av-cheque">Numéro du chèque</label><input id="av-cheque" className="input font-mono" inputMode="numeric" placeholder="ex. 4512378" value={avCheque} onChange={e => setAvCheque(e.target.value)} /></div>
                    <div><label className="text-xs text-slate-400 mb-1 block" htmlFor="av-date-cheque">Date du chèque</label><input id="av-date-cheque" type="date" className="input" value={avDateCheque} onChange={e => setAvDateCheque(e.target.value)} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={avEncaisse} onChange={e => setAvEncaisse(e.target.checked)} className="w-4 h-4" />
                    Déjà encaissé
                  </label>
                </>
              )}
              <div><label className="text-xs text-slate-400 mb-1 block">Note</label><input className="input" value={avNote} onChange={e => setAvNote(e.target.value)} /></div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setAvFor(null)} className="btn-secondary">Annuler</button>
              <button onClick={saveAvance} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
