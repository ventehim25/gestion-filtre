"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { loadAll } from "@/lib/pagedFetch";
import { Sale, Client, Product, SaleItem, SaleStatus, Fournisseur } from "@/types/database";
import { Plus, Trash2, Printer, ScanLine, Check, Link2, X, MessageCircle, CloudOff, RefreshCw, Pencil, Wallet, Eye, Truck, Undo2, Receipt } from "lucide-react";
import ProductPicker, { type PickerVariant } from "@/components/ProductPicker";
import ChoixVehicule from "@/components/ChoixVehicule";
import { MODES_PAIEMENT, noterPaiement } from "@/lib/caisse";
import { retoursParVente } from "@/lib/retours";
import RetourClientModal from "@/components/RetourClientModal";
import { chargerSociete, factureDeVente } from "@/lib/factures";
import { ecrireFacture, ouvrirFenetre } from "@/lib/imprimerFacture";
import { DEPOT, choisirVenteVoiture, lireVenteVoiture, resteStockAvant, type ResteAvant } from "@/lib/voiture";
import { useRole } from "@/lib/role";
import FiltronDe from "@/components/FiltronDe";
import { lireTypeVehicule, useTypeVehicule, useChangementType, type TypeVehicule } from "@/lib/typeVehicule";
import { chargerMarques } from "@/lib/brands";
import { coutCreditParFournisseur, setBonRembourse, lirePortefeuille, retirerDuPortefeuille } from "@/lib/dinoun";
import BarcodeScanner from "@/components/BarcodeScanner";
import { addPending, envoyerVente, getPending, syncPending } from "@/lib/offlineSales";
import { buildReceipt, sendWhatsApp } from "@/lib/whatsapp";
import { POURCENTAGES_DEFAUT, catalogueDuClient, chargerPourcentages, infoCatalogue, prixPour, type Pourcentages, type PrixManuels } from "@/lib/prixCatalogues";

type LastSale = {
  clientNom: string; clientTel: string | null; ville: string; date: string;
  lines: { nom: string; quantite: number; prix_unitaire: number }[];
  total: number; statut: SaleStatus; montant_paye: number; offline: boolean;
  parrainMsg?: string; // « 🎁 avoir crédité à … » (Bible §4.15)
  clientId?: string;    // pour le rappel vidange (Bible §4.10)
};

type LineItem = { product_id: string; quantite: number; prix_unitaire: number; nom: string; fournisseur_id?: string; variant?: string; equivalence_id?: string | null; cout_unitaire?: number };

export default function VentesPage() {
  const { t } = useLang();
  const patron = useRole() === "admin"; // vendeur : pas de bénéfice ni de coût (BIBLE §8.41 n° 8)
  // Commercial du bon (BIBLE §8.41 n° 8) : celui du compte connecté tout seul, sinon au choix
  const [commerciaux, setCommerciaux] = useState<{ id: string; nom: string }[]>([]);
  const [commercialId, setCommercialId] = useState("");
  const [monCommercial, setMonCommercial] = useState("");
  useEffect(() => {
    supabase.from("commerciaux").select("id, nom").eq("actif", true).order("nom").then(({ data }) => setCommerciaux((data ?? []) as { id: string; nom: string }[]), () => {});
    supabase.rpc("mon_commercial").then(({ data }) => { if (data) { setMonCommercial(data as string); setCommercialId(data as string); } }, () => {});
  }, []);
  const [sales, setSales] = useState<(Sale & { client: Client })[]>([]);
  // Bons dont l'argent est mis de côté pour dinoun (portefeuille, pas encore donné)
  const [enPortefeuille, setEnPortefeuille] = useState<Set<string>>(new Set());
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [crossSell, setCrossSell] = useState<Product[]>([]);
  // Variantes de marque par produit (Filtron + équivalences avec prix) → prix auto à la vente
  // Bouton « Encaisser » de l'accueil : n'affiche que les bons pas (entièrement) payés
  const [impayesOnly, setImpayesOnly] = useState(false);
  // Réfs des variantes de marque (Wix, Flag…) pour la recherche d'article
  const [brandVariants, setBrandVariants] = useState<PickerVariant[]>([]);
  const [variants, setVariants] = useState<Record<string, (PrixManuels & { marque: string; reference: string; prix: number; prix_achat: number; stock: number; equivalence_id: string | null })[]>>({});
  // Pourcentages des 4 catalogues (particulier / location / magasin), BIBLE §8.18
  const [pct, setPct] = useState<Pourcentages>(POURCENTAGES_DEFAUT);
  useEffect(() => { chargerPourcentages().then(setPct); }, []);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [statut, setStatut] = useState<SaleStatus>("paye");
  const [montantPaye, setMontantPaye] = useState(0);
  const [venteMode, setVenteMode] = useState<"especes" | "cheque" | "virement">("especes"); // argent reçu à la vente (caisse, BIBLE §8.41)
  // Tournée : pièces sorties de la voiture (stock voiture, BIBLE §8.41 n° 7) — choix gardé sur le téléphone
  const [depuisVoiture, setDepuisVoiture] = useState(false);
  const [piecesVoiture, setPiecesVoiture] = useState(0);
  useEffect(() => {
    setDepuisVoiture(lireVenteVoiture());
    supabase.from("stock_depots").select("quantite").eq("depot", DEPOT).gt("quantite", 0).order("id").range(0, 4999)
      .then(({ data }) => setPiecesVoiture(((data ?? []) as { quantite: number }[]).reduce((a, r) => a + r.quantite, 0)), () => {});
  }, []);
  const [notes, setNotes] = useState("");
  // Scan code-barres
  const [camOpen, setCamOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hors-ligne + reçu
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  // Modification d'une vente existante
  const [editingSale, setEditingSale] = useState<(Sale & { client: Client }) | null>(null);
  const [oldLines, setOldLines] = useState<{ product_id: string; quantite: number; equivalence_id: string | null }[]>([]);
  // Modification rapide du paiement
  const [payEdit, setPayEdit] = useState<(Sale & { client: Client }) | null>(null);
  // Retours de pièces (BIBLE §8.41, nouveauté n° 2)
  const [retourSale, setRetourSale] = useState<(Sale & { client: Client }) | null>(null);
  const [retours, setRetours] = useState<Map<string, number>>(new Map());
  // Factures déjà faites (numéro sous le total) — BIBLE §8.41, nouveauté n° 5
  const [facturees, setFacturees] = useState<Map<string, string>>(new Map());
  async function factureBon(s: Sale & { client: Client }) {
    const w = ouvrirFenetre(); // ouverte tout de suite (sinon le téléphone bloque la fenêtre)
    try {
      const [f, soc] = await Promise.all([factureDeVente(s.id), chargerSociete()]);
      if (w) ecrireFacture(w, f, soc);
      setFacturees(prev => new Map(prev).set(s.id, f.numero));
      flash(`Facture ${f.numero} ✓`);
    } catch (e) {
      w?.close();
      alert("Facture impossible : " + String((e as Error)?.message ?? e));
    }
  }
  const [payStatut, setPayStatut] = useState<SaleStatus>("paye");
  const [payMontant, setPayMontant] = useState(0);
  // Pack vidange (Bible §4.11) : rangée « + l'huile ? » refermée par l'utilisateur
  const [oilDismissed, setOilDismissed] = useState(false);
  // Avoir du client déduit sur cette vente (Bible §4.15)
  const [useAvoir, setUseAvoir] = useState(false);
  // Rappel vidange après vente (Bible §4.10) : 1 champ, 5 secondes
  const [vidVehicule, setVidVehicule] = useState("");
  const [vidDate, setVidDate] = useState("");
  const [vidSaved, setVidSaved] = useState(false);
  async function saveRappelVidange() {
    if (!vidVehicule.trim() || !lastSale?.clientId) return;
    const { error } = await supabase.from("rappels_vidange").insert({
      client_id: lastSale.clientId, vehicule: vidVehicule.trim(),
      date_prevue: vidDate || new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10),
    });
    if (error) { alert("Table absente — colle le SQL supabase/idees_bible_2eme_vague.sql dans Supabase."); return; }
    setVidSaved(true);
  }
  // Marges révélées au clic (par vente)
  const [revealMargin, setRevealMargin] = useState<Set<string>>(new Set());
  function toggleMargin(id: string) {
    setRevealMargin(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // Fiches du type choisi (🚗 voitures par défaut, 🚛 camions au bouton) + leurs variantes de marque : appli plus légère
  const [typeV, setTypeV] = useTypeVehicule();
  async function chargerProduits(type: TypeVehicule) {
    const all = await loadAll<Product>("products", "*", { filter: q => q.eq("vehicule", type).order("reference") });
    setProducts(all);
    chargerMarques() // marques de départ + celles ajoutées par l'utilisateur
      .then(marques => loadAll<PickerVariant>("equivalences", "id, product_id, marque, reference, stock, products!inner(vehicule)",
        { filter: q => q.in("marque", marques).eq("products.vehicule", type).order("id"), countSelect: "id, products!inner(vehicule)" }))
      .then(setBrandVariants).catch(() => {});
    return all;
  }
  useChangementType(typeV, (t) => { chargerProduits(t).catch(() => {}); });

  async function load() {
    // Tout en parallèle. Les ventes étaient chargées SANS pagination (tronquées à 1000) :
    // désormais paginées en pages parallèles, comme les produits.
    const salesSel = "*, client:clients(*), items:sale_items(quantite, prix_unitaire, cout_unitaire, fournisseur_id, product:products(reference, prix_achat))";
    const [s, c, fr, all] = await Promise.all([
      loadAll<Sale & { client: Client }>("sales", salesSel, { filter: q => q.order("created_at", { ascending: false }) }),
      supabase.from("clients").select("*").order("nom"),
      supabase.from("fournisseurs").select("*").order("nom"),
      chargerProduits(lireTypeVehicule()),
    ]);
    lirePortefeuille().then(p => setEnPortefeuille(new Set(p.map(b => b.sale_id)))).catch(() => {});
    retoursParVente().then(setRetours).catch(() => {});
    supabase.from("factures").select("sale_id, numero").eq("type", "facture").not("sale_id", "is", null).order("id").range(0, 9999)
      .then(({ data }) => setFacturees(new Map(((data ?? []) as { sale_id: string; numero: string }[]).map(f => [f.sale_id, f.numero]))), () => {});
    setSales(s);
    setClients(c.data ?? []);
    setFournisseurs((fr.data as Fournisseur[]) ?? []);
    return all;
  }

  async function doSync() {
    setSyncing(true);
    const { left } = await syncPending(supabase);
    setPendingCount(left);
    setSyncing(false);
    if (left === 0) load();
  }

  useEffect(() => {
    setPendingCount(getPending().length);
    (async () => {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const { left } = await syncPending(supabase);
        setPendingCount(left);
      }
      const all = await load();
      // Liens directs : /ventes?client=<id> (prospect qui commande) · ?nouvelle=1 (bouton Vente) · ?impayes=1 (bouton Encaisser)
      // · ?kit=<id,id*2,…> (« Vendre ce kit » d’une voiture, /recherche : filtres + bidons d’huile)
      const params = new URLSearchParams(window.location.search);
      const pre = params.get("client");
      const kit = (params.get("kit") ?? "").split(",").filter(Boolean);
      if (pre || params.has("nouvelle") || kit.length) {
        openNew();
        if (pre) setClientId(pre);
        // « id » ou « id*2 » (bidons d’huile : quantité pour la vidange)
        for (const k of kit) {
          const [id, q] = k.split("*"); const p = all.find(x => x.id === id);
          for (let n = 0; p && n < Math.max(1, Math.min(10, Number(q) || 1)); n++) addProductToCart(p);
        }
      }
      if (params.has("impayes")) setImpayesOnly(true);
      if ([...params.keys()].length) window.history.replaceState(null, "", "/ventes");
    })();
    const onOnline = async () => { const { left } = await syncPending(supabase); setPendingCount(left); if (left === 0) load(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  function addLine() {
    setLines([...lines, { product_id: "", quantite: 1, prix_unitaire: 0, nom: "" }]);
  }

  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    const updated = [...lines];
    (updated[i] as Record<string, unknown>)[field] = val;
    setLines(updated);
  }

  // Prix pour le client choisi : catalogue de son type (garage, particulier +30 %, location +15 %, magasin −5 %,
  // ou prix corrigé à la main), puis sa remise % (Bible §4.1). Arrondi à l'entier, modifiable à la main ensuite.
  function prixClient(base: number, manuels?: PrixManuels | null, cid = clientId) {
    const c = clients.find(x => x.id === cid);
    const prix = prixPour(catalogueDuClient(c?.type), base, manuels, pct);
    const remise = c?.remise_pct ?? 0;
    return remise > 0 ? Math.round(prix * (1 - remise / 100)) : prix;
  }

  // Changement de client : les prix déjà au panier suivent son catalogue
  function changerClient(cid: string) {
    setClientId(cid); setUseAvoir(false);
    setLines(prev => prev.map(l => {
      const p = products.find(x => x.id === l.product_id);
      if (!p) return l;
      const v = l.equivalence_id ? (variants[l.product_id] || []).find(x => x.equivalence_id === l.equivalence_id) : null;
      return { ...l, prix_unitaire: v ? prixClient(v.prix, v, cid) : prixClient(p.prix_vente, p, cid) };
    }));
  }

  function setLineProduct(i: number, p: Product) {
    const updated = [...lines];
    updated[i] = { ...updated[i], product_id: p.id, prix_unitaire: prixClient(p.prix_vente, p), nom: p.reference, variant: "Filtron", equivalence_id: null, cout_unitaire: p.prix_achat };
    setLines(updated);
    fetchCrossSell(p);
    loadVariants(p);
  }

  // Charge les variantes d'un produit (Filtron + équivalences enregistrées avec un prix)
  async function loadVariants(p: Product) {
    if (variants[p.id]) return variants[p.id];
    // select("*") : prend aussi les prix corrigés par catalogue quand les colonnes existent
    const { data } = await supabase.from("equivalences").select("*").eq("product_id", p.id);
    const list = [
      { marque: "Filtron", reference: p.reference, prix: p.prix_vente, prix_achat: p.prix_achat, stock: p.stock, equivalence_id: null as string | null,
        prix_particulier: p.prix_particulier, prix_location: p.prix_location, prix_magasin: p.prix_magasin },
      ...((data ?? []) as (PrixManuels & { id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number | null })[])
        // Seulement les variantes avec un vrai prix (une référence d'essai à 0 DH n'est jamais proposée),
        // et pour une même marque, celle qui a du stock d'abord (« Fc95 » avant un essai oublié)
        .filter(e => e.prix != null && e.prix > 0)
        .sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))
        .map(e => ({ marque: e.marque, reference: e.reference, prix: e.prix as number, prix_achat: e.prix_achat ?? 0, stock: e.stock ?? 0, equivalence_id: e.id,
          prix_particulier: e.prix_particulier, prix_location: e.prix_location, prix_magasin: e.prix_magasin })),
    ];
    setVariants(prev => ({ ...prev, [p.id]: list }));
    return list;
  }

  // Filtre trouvé par la réf d'une marque (ex. WL7009 Wix) : ligne sur le produit + marque appliquée
  async function setLineProductVariant(i: number, p: Product, marque: string) {
    setLineProduct(i, p);
    const v = (await loadVariants(p)).find(x => x.marque === marque);
    if (v) setLines(prev => prev.map((x, j) => j === i ? { ...x, variant: marque, prix_unitaire: prixClient(v.prix, v), cout_unitaire: v.prix_achat, equivalence_id: v.equivalence_id, nom: `${v.reference} (${v.equivalence_id ? v.marque : (p.marque || "Filtron")})` } : x));
  }

  // Applique une marque à une ligne : prix de vente auto + coût figé + libellé "réf (marque)"
  function applyVariant(i: number, marque: string) {
    const l = lines[i];
    const v = (variants[l.product_id] || []).find(x => x.marque === marque);
    if (!v) return;
    // Marque principale = celle de la fiche (Filtron pour un filtre, Gates/Dayco… pour la distribution)
    const principale = productById(l.product_id)?.marque || "Filtron";
    setLines(lines.map((x, j) => j === i ? { ...x, variant: marque, prix_unitaire: prixClient(v.prix, v), cout_unitaire: v.prix_achat, equivalence_id: v.equivalence_id, nom: `${v.reference} (${v.equivalence_id ? v.marque : principale})` } : x));
  }

  // Vente croisée : autres filtres (catégories différentes) compatibles avec le même véhicule
  async function fetchCrossSell(p: Product) {
    try {
      const { data: apps } = await supabase.from("applications").select("marque, modele").eq("product_id", p.id).limit(1);
      if (!apps || apps.length === 0) return;
      const { marque, modele } = apps[0] as { marque: string; modele: string };
      // Seulement des pièces EN STOCK du mode 🚗 / 🚛 (sinon les milliers de kits / freins des catalogues, stock 0, prennent toute la place)
      const { data: matches } = await supabase.from("applications").select("product_id, products!inner(*)").eq("marque", marque).eq("modele", modele)
        .eq("products.vehicule", lireTypeVehicule()).gt("products.stock", 0).limit(200);
      const seen = new Set<string>();
      const out: Product[] = [];
      for (const m of (matches ?? []) as unknown as { product_id: string; products: Product | null }[]) {
        const prod = m.products;
        if (!prod || prod.id === p.id || prod.categorie === p.categorie || seen.has(prod.id)) continue;
        seen.add(prod.id); out.push(prod);
      }
      setCrossSell(out.slice(0, 6));
    } catch { /* silencieux */ }
  }

  function flash(msg: string) {
    setFeedback(msg);
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 2500);
  }

  // Ajoute un produit au panier (+1 s'il y est déjà)
  function addProductToCart(p: Product) {
    setLines(prev => {
      const idx = prev.findIndex(l => l.product_id === p.id);
      if (idx >= 0) {
        const u = [...prev];
        u[idx] = { ...u[idx], quantite: u[idx].quantite + 1 };
        return u;
      }
      return [...prev, { product_id: p.id, quantite: 1, prix_unitaire: prixClient(p.prix_vente, p), nom: p.reference }];
    });
    flash(`${p.reference} ajouté ✓`);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
    fetchCrossSell(p);
    loadVariants(p);
  }

  // Traite un code scanné (caméra ou douchette)
  async function handleScan(raw: string) {
    const code = raw.trim();
    if (!code || linkCode) return;
    // 1) Produit principal (code-barres Filtron ou référence)
    const found = products.find(p =>
      (p.code_barre && p.code_barre === code) || p.reference.toUpperCase() === code.toUpperCase());
    if (found) { addProductToCart(found); return; }
    // 2) Variante de marque (code-barres d'une boîte Mann/Flag/Bosch…)
    const { data: eq } = await supabase.from("equivalences")
      .select("id, product_id, marque, reference, prix, prix_achat, stock").eq("code_barre", code).limit(1);
    const e = eq?.[0] as { id: string; product_id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number | null } | undefined;
    if (e) {
      const parent = products.find(p => p.id === e.product_id);
      if (parent) { addVariantToCart(parent, e); return; }
    }
    // 3) Code inconnu → proposer de l'associer à une référence
    setCamOpen(false);
    setLinkCode(code);
  }

  // Ajoute au panier une variante de marque scannée (prix/coût/equivalence pré-réglés)
  function addVariantToCart(p: Product, e: PrixManuels & { id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null }) {
    setLines(prev => {
      const idx = prev.findIndex(l => l.product_id === p.id && l.equivalence_id === e.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], quantite: u[idx].quantite + 1 }; return u; }
      return [...prev, { product_id: p.id, quantite: 1, prix_unitaire: e.prix != null ? prixClient(e.prix, e) : prixClient(p.prix_vente, p), cout_unitaire: e.prix_achat ?? undefined, equivalence_id: e.id, variant: e.marque, nom: `${e.reference} (${e.marque})` }];
    });
    flash(`${e.reference} (${e.marque}) ajouté ✓`);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
    fetchCrossSell(p);
    loadVariants(p);
  }

  // Associe un code inconnu à une référence (mémorisé) puis l'ajoute au panier
  async function linkAndAdd(p: Product) {
    if (!linkCode) return;
    await supabase.from("products").update({ code_barre: linkCode }).eq("id", p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, code_barre: linkCode } : x));
    addProductToCart({ ...p, code_barre: linkCode });
    setLinkCode(null);
  }

  const total = lines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);

  // Pack vidange (Bible §4.11) : un filtre à huile au panier et pas encore d'huile
  // → suggérer les huiles moteur en stock (déjà en mémoire, tri stock décroissant).
  const productById = (id: string) => products.find(p => p.id === id);
  const hasOilFilter = lines.some(l => productById(l.product_id)?.categorie === "filtre_huile");
  const hasOil = lines.some(l => productById(l.product_id)?.categorie === "huile_moteur");
  const oilSuggest = hasOilFilter && !hasOil && !oilDismissed
    ? products.filter(p => p.categorie === "huile_moteur" && p.stock > 0)
        .sort((a, b) => b.stock - a.stock || a.reference.localeCompare(b.reference)).slice(0, 6)
    : [];

  // Pastille de marge par ligne (Bible §4.3) : 🔴 sous le coût, 🟠 < 15 %, 🟢 sinon.
  function margeDot(l: LineItem): string {
    const cout = l.cout_unitaire ?? productById(l.product_id)?.prix_achat ?? 0;
    if (cout <= 0 || l.prix_unitaire <= 0) return "bg-slate-600";
    if (l.prix_unitaire < cout) return "bg-red-500";
    if ((l.prix_unitaire - cout) / l.prix_unitaire < 0.15) return "bg-orange-400";
    return "bg-green-500";
  }

  // Client sélectionné + badge fiabilité (basé sur l'âge de sa dette en cours) + alerte limite de crédit
  const selectedClient = clients.find(c => c.id === clientId) || null;
  const clientDebts = clientId ? sales.filter(s => s.client_id === clientId && s.statut !== "paye") : [];
  const oldestDebtDate = clientDebts.length ? clientDebts.reduce((min, s) => (s.date < min ? s.date : min), clientDebts[0].date) : null;
  const fiabDays = oldestDebtDate ? Math.round((Date.now() - new Date(oldestDebtDate).getTime()) / 86400000) : null;
  const fiabilite = fiabDays == null ? null : fiabDays > 30 ? { emoji: "🔴", cls: "bg-red-500/15 text-red-400" } : fiabDays > 7 ? { emoji: "🟠", cls: "bg-orange-500/15 text-orange-400" } : { emoji: "🟢", cls: "bg-green-500/15 text-green-400" };
  // solde_du n'est jamais mis à jour automatiquement par l'app : on calcule le solde réel
  // en direct depuis les ventes non soldées (même logique que /rappels et l'accueil).
  const soldeActuel = clientDebts.reduce((s, sv) => s + (sv.total - sv.montant_paye), 0);
  const creditDepasse = selectedClient && (selectedClient.limite_credit ?? 0) > 0
    ? (soldeActuel + total) - (selectedClient.limite_credit ?? 0)
    : 0;

  // Avoir à déduire (Bible §4.15) — proposé seulement en ligne (la décrémentation doit passer tout de suite)
  const avoirDispo = !editingSale && selectedClient && (typeof navigator === "undefined" || navigator.onLine)
    ? (selectedClient.avoir ?? 0) : 0;
  const avoirApplique = useAvoir ? Math.min(avoirDispo, total) : 0;
  const totalNet = total - avoirApplique;

  // Source de chaque ligne (dinoun = crédit / filtropro = mon argent) : un même bon peut mélanger les deux.
  // Automatique = fournisseur de la DERNIÈRE réception de ce filtre (et de cette marque) ;
  // à défaut, le fournisseur crédit. Un tap sur la ligne la corrige (fournisseur_id explicite).
  const [sourceRecue, setSourceRecue] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    // receptions.lignes = [{ product_id, equivalence_id, … }] (dans l'ordre des dates : la plus récente gagne)
    supabase.from("receptions").select("fournisseur_id, lignes").order("date").order("created_at").then(({ data }) => {
      const m = new Map<string, string>();
      for (const r of (data ?? []) as { fournisseur_id: string; lignes: { product_id: string; equivalence_id: string | null; quantite?: number }[] | null }[]) {
        for (const l of r.lignes ?? []) {
          if ((l.quantite ?? 1) < 0) continue; // ligne d'un retour au fournisseur (BIBLE §8.41)
          m.set(`${l.product_id}|${l.equivalence_id ?? ""}`, r.fournisseur_id);
          m.set(`${l.product_id}|*`, r.fournisseur_id);
        }
      }
      setSourceRecue(m);
    }, () => {});
  }, []);
  const sourceParDefaut = () => (fournisseurs.find(f => f.type === "credit") ?? fournisseurs[0])?.id ?? "";
  const sourceAuto = (l: LineItem) => sourceRecue.get(`${l.product_id}|${l.equivalence_id ?? ""}`) ?? sourceRecue.get(`${l.product_id}|*`) ?? null;
  // Marchandise d'avant (cahier, BIBLE §8.51) : tant qu'il en reste pour cette pièce, la ligne n'a PAS de fournisseur
  const [resteAvant, setResteAvant] = useState<Map<string, ResteAvant>>(new Map());
  useEffect(() => { resteStockAvant().then(setResteAvant).catch(() => {}); }, []);
  const AVANT = "__avant__";
  const avantDe = (l: LineItem) => resteAvant.get(`${l.product_id}|${l.equivalence_id ?? ""}`);
  const estAvant = (l: LineItem) => (l.fournisseur_id === AVANT && !!avantDe(l)) || (!l.fournisseur_id && (avantDe(l)?.quantite ?? 0) > 0);
  // Marchandise d'avant : la source = le fournisseur à qui elle est (dinoun : déjà dans sa dette, pas de double solde)
  const srcOf = (l: LineItem) => estAvant(l) ? (avantDe(l)?.fournisseur_id ?? null) : (l.fournisseur_id && l.fournisseur_id !== AVANT ? l.fournisseur_id : (sourceAuto(l) || sourceParDefaut() || null));

  function resetForm() {
    setShowForm(false); setEditingSale(null); setOldLines([]);
    setLines([]); setClientId(""); setNotes(""); setMontantPaye(0); setStatut("paye"); setVenteMode("especes"); setCommercialId(monCommercial);
    setCrossSell([]); setOilDismissed(false); setUseAvoir(false);
  }

  function openNew() {
    resetForm();
    setShowForm(true);
  }

  // Ouvre le formulaire pré-rempli pour modifier une vente existante
  async function openEditSale(s: Sale & { client: Client }) {
    const { data } = await supabase.from("sale_items")
      .select("product_id, quantite, prix_unitaire, fournisseur_id, equivalence_id, cout_unitaire, product:products(reference)")
      .eq("sale_id", s.id);
    const items = (data ?? []) as unknown as { product_id: string; quantite: number; prix_unitaire: number; fournisseur_id: string | null; equivalence_id: string | null; cout_unitaire: number | null; product: { reference: string } | null }[];
    setLines(items.map(i => ({ product_id: i.product_id, quantite: i.quantite, prix_unitaire: i.prix_unitaire, nom: i.product?.reference ?? "", fournisseur_id: i.fournisseur_id ?? undefined, equivalence_id: i.equivalence_id, cout_unitaire: i.cout_unitaire ?? undefined })));
    setOldLines(items.map(i => ({ product_id: i.product_id, quantite: i.quantite, equivalence_id: i.equivalence_id })));
    setClientId(s.client_id);
    setStatut(s.statut);
    setMontantPaye(s.montant_paye);
    setNotes(s.notes ?? "");
    setEditingSale(s);
    setShowForm(true);
  }

  // Sauvegarde d'une MODIFICATION de vente (réajuste le stock : rend l'ancien, retire le nouveau)
  async function saveEdit() {
    if (!editingSale) return;
    const validLines = lines.filter(l => l.product_id && l.quantite > 0);
    if (!clientId || validLines.length === 0) { flash("Client et au moins un article requis"); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { alert("Modification impossible hors-ligne."); return; }
    if (validLines.some(l => !srcOf(l) && !estAvant(l)) && !confirm("⚠️ Ligne(s) sans source (dinoun / filtropro). Enregistrer quand même ?")) return;
    const saleTotal = validLines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const montant = statut === "paye" ? saleTotal : montantPaye;
    try {
      // 1) Rendre le stock des anciens articles (qty négative => stock += qty)
      for (const o of oldLines) {
        if (o.equivalence_id) await supabase.rpc("decrement_equiv_stock", { e_id: o.equivalence_id, qty: -o.quantite });
        else await supabase.rpc("decrement_stock", { p_id: o.product_id, qty: -o.quantite });
      }
      // 2) Remplacer les lignes
      await supabase.from("sale_items").delete().eq("sale_id", editingSale.id);
      await supabase.from("sales").update({
        client_id: clientId, total: saleTotal, montant_paye: montant, statut, notes: notes || null,
      }).eq("id", editingSale.id);
      // Écart d'argent payé (caisse du jour, BIBLE §8.41)
      const ecartPaye = Math.round((montant - editingSale.montant_paye) * 100) / 100;
      if (ecartPaye !== 0) await noterPaiement(supabase, {
        sale_id: editingSale.id, client_id: clientId, date: new Date().toISOString().slice(0, 10), montant: ecartPaye, mode: venteMode,
        note: ecartPaye < 0 ? "correction du montant payé (modification de la vente)" : "modification de la vente",
      });
      await supabase.from("sale_items").insert(
        validLines.map(l => ({ sale_id: editingSale.id, product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire, fournisseur_id: srcOf(l), equivalence_id: l.equivalence_id || null, cout_unitaire: l.cout_unitaire ?? null }))
      );
      // 3) Retirer le stock des nouveaux articles
      for (const l of validLines) {
        if (l.equivalence_id) await supabase.rpc("decrement_equiv_stock", { e_id: l.equivalence_id, qty: l.quantite });
        else await supabase.rpc("decrement_stock", { p_id: l.product_id, qty: l.quantite });
      }
      flash("Vente modifiée ✓");
    } catch { alert("Erreur lors de la modification."); }
    resetForm();
    load();
  }

  // Camion dinoun d'un bon = le PORTEFEUILLE (16/11/2026, src/lib/dinoun.ts) :
  // « 👛 Mettre de côté » → le coût dinoun du bon va dans le portefeuille, la dette NE BAISSE PAS ;
  // elle baisse quand l'argent compté est donné (Fournisseurs → « Donner à dinoun » = une avance).
  async function toggleFournisseurPaye(s: Sale & { client: Client }, cout: number) {
    const nom = fournisseurs.find(f => f.type === "credit")?.nom ?? "dinoun";
    if (!s.fournisseur_paye) {
      if (!confirm(`Mettre ${cout.toFixed(0)} MAD de côté dans le portefeuille ${nom} pour ce bon (${s.client?.nom ?? ""}, ${s.date}) ?\nLa dette ne baisse pas maintenant : elle baissera quand tu donneras le portefeuille à ${nom}.`)) return;
      const r = await setBonRembourse({ id: s.id, date: s.date, clientNom: s.client?.nom }, true, creditIds);
      if (!r.ok) { alert(r.error); return; }
      setSales(prev => prev.map(x => x.id === s.id ? { ...x, fournisseur_paye: true } : x));
      setEnPortefeuille(prev => new Set(prev).add(s.id));
      flash(`👛 ${r.montant.toFixed(0)} MAD mis de côté (portefeuille ${nom})`);
      return;
    }
    if (enPortefeuille.has(s.id)) {
      if (!confirm(`Sortir ce bon du portefeuille ${nom} (${cout.toFixed(0)} MAD) ?`)) return;
    } else {
      // Déjà donné : un ancien bon (avant le 16/11) a son avance à lui ; sinon il fait partie d'un versement du portefeuille
      const { count } = await supabase.from("avances").select("id", { count: "exact", head: true }).eq("sale_id", s.id);
      if (!count) { alert(`Ce bon a déjà été donné à ${nom} avec le portefeuille : rien à annuler ici.\nPour corriger, modifie l'avance dans Fournisseurs → ${nom} → Historique.`); return; }
      if (!confirm(`Annuler le remboursement de ce bon ? La dette ${nom} remontera de ${cout.toFixed(0)} MAD.`)) return;
    }
    const r = await setBonRembourse({ id: s.id, date: s.date, clientNom: s.client?.nom }, false, creditIds);
    if (!r.ok) { alert(r.error); return; }
    setSales(prev => prev.map(x => x.id === s.id ? { ...x, fournisseur_paye: false } : x));
    setEnPortefeuille(prev => { const n = new Set(prev); n.delete(s.id); return n; });
    flash(`Bon sorti du portefeuille ${nom}`);
  }
  const creditIds = new Set(fournisseurs.filter(f => f.type === "credit").map(f => f.id));

  // Supprimer une vente : rend le stock (sauf commande préparée qui n'avait pas décrémenté)
  // et supprime le bon (les paiements dinoun liés partent en cascade via avances.sale_id).
  async function deleteSale(s: Sale & { client: Client }) {
    if (typeof navigator !== "undefined" && !navigator.onLine) { alert("Suppression impossible hors-ligne."); return; }
    // Bon dans le portefeuille : il en sort. Ancien bon remboursé (avant le 16/11) : son avance part avec lui (la dette remonte)
    const remb = s.fournisseur_paye ? [...coutCreditParFournisseur(s.items ?? [], creditIds).values()].reduce((a, b) => a + b, 0) : 0;
    const dansPortefeuille = enPortefeuille.has(s.id);
    if (!confirm(`Supprimer la vente de ${s.client?.nom ?? "ce client"} — ${s.total.toFixed(0)} MAD ?\nLe stock des articles sera rendu.`
      + (remb > 0 && dansPortefeuille ? `\n\nCe bon est dans le portefeuille dinoun (${remb.toFixed(0)} MAD) : il en sera retiré.` : "")
      + (remb > 0 && !dansPortefeuille ? `\n\n⚠ Ce bon a déjà été donné à dinoun (${remb.toFixed(0)} MAD). S'il avait son propre remboursement (avant le 16/11), celui-ci sera annulé et la dette remontera : enregistre alors ces ${remb.toFixed(0)} MAD en « Avance / paiement » (Fournisseurs).` : ""))) return;
    if (dansPortefeuille) await retirerDuPortefeuille(s.id);
    try {
      const prepared = (s.notes ?? "").startsWith("Commande WhatsApp"); // vente préparée = stock jamais retiré
      if (!prepared) {
        const { data } = await supabase.from("sale_items").select("product_id, quantite, equivalence_id").eq("sale_id", s.id);
        for (const it of (data ?? []) as { product_id: string; quantite: number; equivalence_id: string | null }[]) {
          if (it.equivalence_id) await supabase.rpc("decrement_equiv_stock", { e_id: it.equivalence_id, qty: -it.quantite });
          else await supabase.rpc("decrement_stock", { p_id: it.product_id, qty: -it.quantite });
        }
      }
      await supabase.from("sale_items").delete().eq("sale_id", s.id);
      await supabase.from("sales").delete().eq("id", s.id);
      flash("Vente supprimée ✓");
    } catch { alert("Erreur lors de la suppression."); }
    load();
  }

  // Modification rapide du paiement uniquement
  function openPayEdit(s: Sale & { client: Client }) {
    setPayEdit(s); setPayStatut(s.statut); setPayMontant(s.montant_paye);
    setPayMode("especes"); setPayCheque({ numero: "", banque: "", echeance: "" });
  }
  // Mode de l'argent reçu (caisse du jour, échéancier des chèques — BIBLE §8.41)
  const [payMode, setPayMode] = useState<"especes" | "cheque" | "virement">("especes");
  const [payCheque, setPayCheque] = useState({ numero: "", banque: "", echeance: "" });
  async function savePayEdit() {
    if (!payEdit) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { alert("Modification impossible hors-ligne."); return; }
    const montant = payStatut === "paye" ? payEdit.total : payMontant;
    await supabase.from("sales").update({ statut: payStatut, montant_paye: montant }).eq("id", payEdit.id);
    // L'argent reçu maintenant (différence avec ce qui était déjà payé) → caisse du jour / échéancier
    const recu = Math.round((montant - payEdit.montant_paye) * 100) / 100;
    if (recu !== 0) await noterPaiement(supabase, {
      sale_id: payEdit.id, client_id: payEdit.client_id, date: new Date().toISOString().slice(0, 10), montant: recu, mode: payMode,
      numero_cheque: payMode === "cheque" ? payCheque.numero || null : null, banque: payMode === "cheque" ? payCheque.banque || null : null,
      date_echeance: payMode === "cheque" ? payCheque.echeance || null : null, note: recu < 0 ? "correction du montant payé" : null,
    });
    // Parrainage (Bible §4.15) : cette vente (souvent créée depuis /commandes en 'en_attente')
    // devient la 1ère vente ENCAISSÉE du filleul → crédite le parrain maintenant.
    if (payStatut !== "en_attente") {
      const client = clients.find(c => c.id === payEdit.client_id);
      if (client?.parrain_id && !client.parrain_paye
        && !sales.some(s => s.client_id === payEdit.client_id && s.id !== payEdit.id && s.statut !== "en_attente")) {
        const parrain = clients.find(c => c.id === client.parrain_id);
        const { error: pErr } = await supabase.from("clients").update({ avoir: (parrain?.avoir ?? 0) + 100 }).eq("id", client.parrain_id);
        if (!pErr) await supabase.from("clients").update({ parrain_paye: true }).eq("id", payEdit.client_id);
      }
    }
    setPayEdit(null);
    load();
  }

  async function save() {
    if (editingSale) { saveEdit(); return; }
    const validLines = lines.filter(l => l.product_id && l.quantite > 0);
    if (!clientId || validLines.length === 0) return;
    // Rappel : sans source (bon ni ligne), la marchandise n'est comptée sur aucun fournisseur
    const sansSource = validLines.filter(l => !srcOf(l) && !estAvant(l)).length;
    if (sansSource > 0 && !confirm(`⚠️ ${sansSource} ligne(s) sans source (dinoun / filtropro).\nCette marchandise ne sera comptée sur aucun fournisseur, et le camion « dinoun payé » ne la comptera pas.\n\nEnregistrer quand même ?`)) return;
    const client = clients.find(c => c.id === clientId);
    const brut = validLines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    // Avoir déduit du total (Bible §4.15)
    const avoirDeduit = useAvoir ? Math.min(avoirDispo, brut) : 0;
    const saleTotal = brut - avoirDeduit;
    const saleNotes = avoirDeduit > 0 ? [notes, `Avoir déduit : ${avoirDeduit.toFixed(0)} MAD`].filter(Boolean).join(" · ") : notes;
    const montant = statut === "paye" ? saleTotal : montantPaye;
    const date = new Date().toISOString().split("T")[0];
    let parrainMsg: string | undefined;

    // La vente est d'abord GARDÉE SUR LE TÉLÉPHONE, puis envoyée par la même procédure que les ventes hors-ligne
    // (src/lib/offlineSales.ts) : si le réseau coupe au milieu, elle reprend plus tard sans doublon ni perte.
    const localId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    addPending({
      localId,
      client_id: clientId, clientNom: client?.nom ?? "", clientTel: client?.telephone ?? null, date,
      lines: validLines.map(l => ({ product_id: l.product_id, quantite: l.quantite, prix_unitaire: l.prix_unitaire, nom: l.nom, fournisseur_id: srcOf(l), equivalence_id: l.equivalence_id || null, cout_unitaire: l.cout_unitaire ?? null, stock_avant: estAvant(l) ? avantDe(l)!.depot : undefined })),
      total: saleTotal, statut, montant_paye: montant, notes: saleNotes || null, createdAt: Date.now(), mode_paiement: venteMode,
      depuis_voiture: depuisVoiture && piecesVoiture > 0,
      commercial_id: commercialId || null,
    });

    let savedOnline = false;
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        // Vente + articles + stock (étape par étape, sans doublon)
        if (!(await envoyerVente(supabase, localId))) throw new Error("pas envoyée");
        // Avoir utilisé → le retirer du crédit du client (Bible §4.15)
        if (avoirDeduit > 0) {
          await supabase.from("clients").update({ avoir: Math.max(0, (client?.avoir ?? 0) - avoirDeduit) }).eq("id", clientId);
        }
        // Parrainage : première vente ENCAISSÉE du filleul → 100 MAD d'avoir au parrain
        // (on regarde les ventes déjà encaissées, pas juste "une vente existe" — une vente
        // en_attente créée depuis /commandes ne doit pas bloquer le crédit à venir).
        if (client?.parrain_id && !client.parrain_paye && statut !== "en_attente"
          && !sales.some(s => s.client_id === clientId && s.statut !== "en_attente")) {
          const parrain = clients.find(c => c.id === client.parrain_id);
          const { error: pErr } = await supabase.from("clients").update({ avoir: (parrain?.avoir ?? 0) + 100 }).eq("id", client.parrain_id);
          if (!pErr) {
            await supabase.from("clients").update({ parrain_paye: true }).eq("id", clientId);
            parrainMsg = `🎁 Avoir de 100 MAD crédité à ${parrain?.nom ?? "son parrain"} (parrainage)`;
          }
        }
        savedOnline = true;
      } catch { savedOnline = false; }
    }
    // Pas envoyée (hors-ligne ou réseau coupé au milieu) : elle reste sur le téléphone avec son avancement
    setPendingCount(getPending().length);

    setVidVehicule(""); setVidDate(new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10)); setVidSaved(false);
    setLastSale({
      clientNom: client?.nom ?? "", clientTel: client?.telephone ?? null, ville: client?.ville ?? "", date,
      lines: validLines.map(l => ({ nom: l.nom, quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
      total: saleTotal, statut, montant_paye: montant, offline: !savedOnline, parrainMsg, clientId,
    });
    setShowForm(false); setLines([]); setClientId(""); setNotes(""); setMontantPaye(0); setStatut("paye"); setVenteMode("especes"); setCommercialId(monCommercial);
    setOilDismissed(false); setUseAvoir(false);
    if (savedOnline) load();
  }

  // Envoie un DEVIS (panier en cours) au client par WhatsApp, sans enregistrer la vente
  function sendDevis() {
    const validLines = lines.filter(l => l.product_id && l.quantite > 0);
    if (validLines.length === 0) return;
    const client = clients.find(c => c.id === clientId);
    const tot = validLines.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
    const date = new Date().toLocaleDateString("fr-FR");
    const L = validLines.map(l => `• ${l.nom}  ×${l.quantite} = ${(l.quantite * l.prix_unitaire).toFixed(2)} MAD`).join("\n");
    const text = [
      "📝 *Devis — FiltroPro*",
      client ? `👤 ${client.nom}` : "",
      `📅 ${date}`,
      "————————————", L, "————————————",
      `🧮 *TOTAL : ${tot.toFixed(2)} MAD*`,
      "", "✅ Valable 7 jours · sous réserve de disponibilité.",
      "📞 06 02 35 02 90",
    ].filter(Boolean).join("\n");
    sendWhatsApp(client?.telephone, text);
  }

  // Envoie la fiche d'une vente déjà enregistrée (récupère ses articles)
  async function whatsForSale(s: Sale & { client: Client }) {
    const { data } = await supabase.from("sale_items")
      .select("quantite, prix_unitaire, product:products(reference)").eq("sale_id", s.id);
    const lns = (data ?? []).map((i: { quantite: number; prix_unitaire: number; product: { reference: string } | null }) =>
      ({ nom: i.product?.reference ?? "Produit", quantite: i.quantite, prix_unitaire: i.prix_unitaire }));
    sendWhatsApp(s.client?.telephone, buildReceipt({
      clientNom: s.client?.nom, date: s.date, lines: lns, total: s.total, statut: s.statut, montant_paye: s.montant_paye,
    }));
  }

  function printReceipt(s: Sale & { client: Client }) {
    const items = (s.items ?? []).map(i =>
      `<tr><td>${(i.product as Product | undefined)?.reference ?? ""}</td><td style="text-align:center">${i.quantite}</td><td style="text-align:right">${i.prix_unitaire} MAD</td><td style="text-align:right">${(i.quantite * i.prix_unitaire).toFixed(2)} MAD</td></tr>`
    ).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon de livraison</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;font-size:13px}th{background:#f3f4f6}.total{font-weight:bold;font-size:16px;text-align:right;margin-top:8px}.footer{margin-top:24px;text-align:center;font-size:12px;color:#888}@media print{button{display:none}}</style>
    </head><body>
    <h2>Bon de Livraison</h2>
    <p><strong>Client :</strong> ${s.client?.nom ?? ""}</p>
    <p><strong>Ville :</strong> ${s.client?.ville ?? ""}</p>
    <p><strong>Date :</strong> ${s.date}</p>
    <table><thead><tr><th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead>
    <tbody>${items}</tbody></table>
    <p class="total">Total : ${s.total.toFixed(2)} MAD</p>
    <p class="total" style="color:${s.statut === "paye" ? "green" : "red"}">
      ${s.statut === "paye" ? "✓ Payé" : `Reste à payer : ${(s.total - s.montant_paye).toFixed(2)} MAD`}
    </p>
    <p class="footer">Gestion Filtres — Maroc</p>
    <button onclick="window.print()" style="margin-top:16px;padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">Imprimer</button>
    </body></html>`);
    w.document.close();
  }

  const badgeClass = (s: SaleStatus) =>
    s === "paye" ? "badge-paid" : s === "partiel" ? "badge-partial" : "badge-pending";

  return (
    <div>
      <Header title="sales" action={
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t("addSale")}
        </button>
      } />

      {pendingCount > 0 && (
        <div className="card p-3 mb-4 flex items-center justify-between" style={{ borderColor: "rgba(234,179,8,0.4)" }}>
          <span className="text-sm text-yellow-400 flex items-center gap-2">
            <CloudOff size={16} /> {pendingCount} vente(s) enregistrée(s) hors-ligne — en attente de synchronisation
          </span>
          <button onClick={doSync} disabled={syncing} className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Synchroniser
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 overflow-y-auto bg-black/40 flex items-start justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-2xl my-auto">
            <h3 className="font-semibold text-slate-800 mb-4">{editingSale ? "Modifier la vente" : t("addSale")}</h3>
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-1 block">{t("clients")}</label>
              <select className="input" value={clientId} onChange={e => changerClient(e.target.value)}>
                <option value="">-- Choisir client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.ville}</option>)}
              </select>
              {selectedClient && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {catalogueDuClient(selectedClient.type) !== "garage" && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">Prix {infoCatalogue(catalogueDuClient(selectedClient.type)).libelle}</span>
                  )}
                  {(selectedClient.remise_pct ?? 0) > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Remise {selectedClient.remise_pct}% appliquée</span>
                  )}
                  {fiabilite && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${fiabilite.cls}`}>{fiabilite.emoji} {fiabDays} j de dette</span>
                  )}
                </div>
              )}
            </div>

            <div className="mb-3">
              <ChoixVehicule value={typeV} onChange={setTypeV} className="mb-2" />
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500">{t("products")}</label>
                <div className="flex gap-2">
                  <button onClick={() => setCamOpen(true)} className="flex items-center gap-1 text-xs py-1 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium"><ScanLine size={12} /> Scanner</button>
                  <button onClick={addLine} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Plus size={12} /> Ajouter ligne</button>
                </div>
              </div>
              <div className="relative mb-2">
                <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                <input
                  className="input ps-9 font-mono"
                  placeholder="Scannez ici (douchette) ou tapez le code + Entrée"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleScan(scanInput); setScanInput(""); } }}
                />
              </div>
              {feedback && (
                <div className="mb-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 flex items-center gap-2">
                  <Check size={15} /> {feedback}
                </div>
              )}
              {lines.map((l, i) => (
                <div key={i} className="mb-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <ProductPicker preferStock products={products} variants={brandVariants} value={l.product_id} onSelect={(p, v, o) => { if (o) setProducts(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p]); if (v) setLineProductVariant(i, p, v.marque); else setLineProduct(i, p); }} />
                      <FiltronDe produit={productById(l.product_id)} className="block mt-0.5" />
                    </div>
                    <input type="number" className="input col-span-2" value={l.quantite} onChange={e => updateLine(i, "quantite", +e.target.value)} min={1} />
                    <input type="number" className="input col-span-3" value={l.prix_unitaire} onChange={e => updateLine(i, "prix_unitaire", +e.target.value)} />
                    <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="col-span-1 text-red-400 hover:text-red-600 flex items-center justify-center"><Trash2 size={15} /></button>
                    <div className="col-span-1 flex items-center gap-1 text-sm font-medium text-slate-600">
                      {/* Pastille de marge (Bible §4.3) — code couleur connu de moi seul */}
                      <span className={`h-2 w-2 shrink-0 rounded-full ${margeDot(l)}`} />
                      {(l.quantite * l.prix_unitaire).toFixed(0)}
                    </div>
                  </div>
                  {variants[l.product_id] && variants[l.product_id].length > 1 && (
                    <select className="input mt-1 py-1 text-xs" value={l.variant ?? "Filtron"} onChange={e => applyVariant(i, e.target.value)}>
                      {variants[l.product_id].map(v => (
                        <option key={v.marque + v.reference} value={v.marque}>{v.equivalence_id ? v.marque : (productById(l.product_id)?.marque || "Filtron")} · {v.reference} · {v.prix} MAD (stock {v.stock})</option>
                      ))}
                    </select>
                  )}
                  {/* Source de CETTE ligne : auto (dernière réception du filtre), 1 tap pour corriger */}
                  {fournisseurs.length > 0 && l.product_id && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {fournisseurs.map(f => {
                        const actif = !estAvant(l) && srcOf(l) === f.id;
                        return (
                          <button key={f.id} type="button" onClick={() => updateLine(i, "fournisseur_id", f.id)}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${actif ? (f.type === "capital" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
                            {f.nom}
                          </button>
                        );
                      })}
                      {avantDe(l) && (
                        <button type="button" onClick={() => updateLine(i, "fournisseur_id", estAvant(l) && l.fournisseur_id === AVANT ? "" : AVANT)}
                          title="Marchandise d'avant (cahier) : déjà comptée chez ce fournisseur, elle n'est pas comptée deux fois"
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${estAvant(l) ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
                          📒 cahier{avantDe(l)!.fournisseur_id ? ` · ${fournisseurs.find(f => f.id === avantDe(l)!.fournisseur_id)?.nom ?? ""}` : " · à moi"}
                        </button>
                      )}
                      {!l.fournisseur_id && (
                        <span className="text-[10px] text-slate-500">{estAvant(l) ? `auto · reste ${avantDe(l)!.quantite} du cahier` : sourceAuto(l) ? "auto · dernière réception" : "par défaut"}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {crossSell.filter(p => !lines.some(l => l.product_id === p.id)).length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1.5">💡 Filtres pour le même véhicule (clique pour ajouter) :</p>
                <div className="flex flex-wrap gap-1.5">
                  {crossSell.filter(p => !lines.some(l => l.product_id === p.id)).map(p => (
                    <button key={p.id} type="button" onClick={() => addProductToCart(p)} className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/25">
                      <Plus size={11} /> <span className="font-mono">{p.reference}</span> <span className="text-slate-400">· {p.prix_vente} MAD</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pack vidange (Bible §4.11) : filtre à huile au panier → proposer l'huile en 1 tap */}
            {oilSuggest.length > 0 && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-amber-300 font-medium">🛢️ + l&apos;huile ? (vidange complète = panier ×5)</p>
                  <button type="button" onClick={() => setOilDismissed(true)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {oilSuggest.map(p => (
                    <button key={p.id} type="button" onClick={() => addProductToCart(p)}
                      className="shrink-0 flex items-center gap-1 text-xs bg-amber-500/15 text-amber-200 px-2 py-1 rounded-lg hover:bg-amber-500/25">
                      <Plus size={11} /> {p.marque ? `${p.marque} · ` : ""}<span className="font-mono">{p.reference}</span> <span className="text-slate-400">· {p.prix_vente} MAD</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {creditDepasse > 0 && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium">
                ⚠ {selectedClient?.nom} dépasse sa limite de crédit de {creditDepasse.toFixed(0)} MAD (limite {selectedClient?.limite_credit} MAD)
              </div>
            )}

            {/* Avoir du client (Bible §4.15) — déduction en 1 tap */}
            {avoirDispo > 0 && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-between gap-2">
                <span className="text-sm text-yellow-300 font-medium">🎁 Avoir : {avoirDispo.toFixed(0)} MAD</span>
                <button type="button" onClick={() => setUseAvoir(v => !v)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium ${useAvoir ? "bg-yellow-500/30 text-yellow-200" : "bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25"}`}>
                  {useAvoir ? `✓ Déduit (−${avoirApplique.toFixed(0)} MAD)` : "Déduire"}
                </button>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="font-semibold">{t("total")}</span>
              <span className="text-lg font-bold text-blue-600">
                {avoirApplique > 0 && <span className="text-xs font-normal text-slate-500 me-2 line-through">{total.toFixed(0)}</span>}
                {totalNet.toFixed(2)} MAD
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("status")}</label>
                <select className="input" value={statut} onChange={e => setStatut(e.target.value as SaleStatus)}>
                  <option value="paye">{t("paid")}</option>
                  <option value="en_attente">{t("pending")}</option>
                  <option value="partiel">{t("partial")}</option>
                </select>
              </div>
              {statut !== "paye" && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Montant payé (MAD)</label>
                  <input type="number" className="input" value={montantPaye} onChange={e => setMontantPaye(+e.target.value)} />
                </div>
              )}
              {!editingSale && commerciaux.length > 0 && (
                <label className="col-span-2 text-xs text-slate-500">Commercial du bon
                  <select className="input mt-1" value={commercialId} onChange={e => setCommercialId(e.target.value)}>
                    <option value="">— moi (pas de commercial)</option>
                    {commerciaux.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </label>
              )}
              {!editingSale && (piecesVoiture > 0 || depuisVoiture) && (
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300 rounded-lg bg-slate-800/50 px-3 py-2">
                  <input type="checkbox" checked={depuisVoiture} onChange={e => { setDepuisVoiture(e.target.checked); choisirVenteVoiture(e.target.checked); }} />
                  🚗 Sorti de la voiture <span className="text-[11px] text-slate-500">({piecesVoiture} pièce(s) chargée(s) — la voiture se vide d&apos;autant)</span>
                </label>
              )}
              {(statut === "paye" || montantPaye > 0) && (
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Reçu en</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MODES_PAIEMENT.map(m => (
                      <button key={m.cle} type="button" onClick={() => setVenteMode(m.cle as "especes" | "cheque" | "virement")}
                        className={`rounded-lg py-1.5 text-xs font-medium ${venteMode === m.cle ? "bg-amber-500 text-black" : "btn-secondary"}`}>{m.libelle}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end items-center flex-wrap">
              <button onClick={resetForm} className="btn-secondary">{t("cancel")}</button>
              {!editingSale && (
                <button onClick={sendDevis} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/90 hover:bg-green-500 text-white text-sm font-medium" title="Envoyer un devis au client (sans enregistrer)">
                  <MessageCircle size={15} /> Devis
                </button>
              )}
              <button onClick={save} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {[[false, "Tous les bons"], [true, `Impayés (${sales.filter(s => s.statut !== "paye").length})`]].map(([v, label]) => (
          <button key={String(v)} onClick={() => setImpayesOnly(v as boolean)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${impayesOnly === v ? "bg-amber-500 text-black" : "btn-secondary"}`}>{label as string}</button>
        ))}
        {impayesOnly && <span className="text-[11px] text-slate-500 self-center">Touche 💰 sur un bon pour encaisser</span>}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t("date"), t("clients"), t("city"), t("total"), t("status"), ...(patron ? [t("profit")] : [])].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.filter(s => !impayesOnly || s.statut !== "paye").map(s => {
              const hasItems = (s.items ?? []).length > 0;
              const cost = (s.items ?? []).reduce((a, it) => a + it.quantite * (it.cout_unitaire ?? (it.product as Product | undefined)?.prix_achat ?? 0), 0);
              const benef = s.total - cost;
              // Coût dû à dinoun pour ce bon (marchandise crédit) : 0 = bon payé avec ton argent
              const coutDinoun = [...coutCreditParFournisseur(s.items ?? [], creditIds).values()].reduce((a, b) => a + b, 0);
              return (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{s.date}</td>
                <td className="px-4 py-3 font-medium">{s.client?.nom}</td>
                <td className="px-4 py-3 text-slate-500">{s.client?.ville}</td>
                <td className="px-4 py-3 font-semibold">{s.total.toFixed(2)} MAD
                  {retours.has(s.id) && <span className="block text-[11px] font-medium text-amber-400" title="Pièces rendues par le client">↩ −{(retours.get(s.id) ?? 0).toFixed(0)} rendu</span>}
                  {facturees.has(s.id) && <span className="block text-[11px] font-medium text-sky-400">🧾 {facturees.get(s.id)}</span>}
                </td>
                <td className="px-4 py-3"><span className={badgeClass(s.statut)}>{t(s.statut === "paye" ? "paid" : s.statut === "partiel" ? "partial" : "pending")}</span></td>
                {patron && <td className="px-4 py-3">
                  {!hasItems ? (
                    <span className="text-xs text-slate-500" title="Ancien impayé / bon sans détail">—</span>
                  ) : revealMargin.has(s.id) ? (
                    <div className="text-xs leading-tight">
                      <div className="font-semibold text-emerald-400">+{benef.toFixed(0)} MAD</div>
                      <div className="text-orange-400">coût {cost.toFixed(0)}</div>
                    </div>
                  ) : (
                    <button onClick={() => toggleMargin(s.id)} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                      <Eye size={12} /> Afficher
                    </button>
                  )}
                </td>}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Remboursement dinoun du bon : indépendant du paiement du client */}
                  {coutDinoun > 0 && (
                    <button onClick={() => toggleFournisseurPaye(s, coutDinoun)}
                      className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${!s.fournisseur_paye ? "bg-red-500/15 text-red-300 hover:bg-red-500/25" : enPortefeuille.has(s.id) ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-400"}`}
                      title={!s.fournisseur_paye ? "Mettre l'argent de ce bon de côté pour dinoun (la dette ne baisse pas encore)" : enPortefeuille.has(s.id) ? "Dans le portefeuille dinoun — clique pour le sortir" : "Déjà donné à dinoun"}>
                      <Truck size={13} /> {!s.fournisseur_paye ? `👛 Mettre de côté ${coutDinoun.toFixed(0)}` : enPortefeuille.has(s.id) ? "👛 De côté" : "✓ Donné"}
                    </button>
                  )}
                  <button onClick={() => openPayEdit(s)} className="text-amber-500 hover:text-amber-400" title="Modifier le paiement"><Wallet size={16} /></button>
                  <button onClick={() => openEditSale(s)} className="text-blue-400 hover:text-blue-300" title="Modifier la vente"><Pencil size={15} /></button>
                  {hasItems && <button onClick={() => factureBon(s)} className="text-sky-400 hover:text-sky-300" title={facturees.has(s.id) ? `Réimprimer la facture ${facturees.get(s.id)}` : "Faire la facture (numérotée)"}><Receipt size={15} /></button>}
                  {hasItems && <button onClick={() => setRetourSale(s)} className="text-amber-300 hover:text-amber-200" title="Retour de pièces (le client rend)"><Undo2 size={15} /></button>}
                  <button onClick={() => whatsForSale(s)} className="text-green-500 hover:text-green-400" title="Envoyer la fiche sur WhatsApp"><MessageCircle size={16} /></button>
                  <button onClick={() => printReceipt(s)} className="text-slate-400 hover:text-blue-600" title={t("printReceipt")}><Printer size={15} /></button>
                  <button onClick={() => deleteSale(s)} className="text-red-400 hover:text-red-300" title="Supprimer la vente"><Trash2 size={15} /></button>
                </div>
              </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {sales.filter(s => !impayesOnly || s.statut !== "paye").length === 0 && <p className="text-center text-slate-400 py-10">{impayesOnly ? "Aucun impayé 🎉" : t("noData")}</p>}
      </div>

      {/* Retour de pièces d'un bon (BIBLE §8.41) */}
      {retourSale && (
        <RetourClientModal sale={retourSale} onClose={() => setRetourSale(null)}
          onDone={(m) => { setRetourSale(null); flash(m); load(); }} />
      )}

      {/* Scanner caméra */}
      {camOpen && <BarcodeScanner onScan={handleScan} onClose={() => setCamOpen(false)} />}

      {/* Association d'un code inconnu */}
      {linkCode && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Link2 size={18} className="text-red-400" /> Associer un code-barres</h3>
              <button onClick={() => setLinkCode(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-1">Code scanné :</p>
            <p className="font-mono text-lg text-slate-100 bg-slate-800/60 rounded-lg px-3 py-2 mb-4">{linkCode}</p>
            <p className="text-sm text-slate-400 mb-2">Choisissez la référence correspondante :</p>
            <ProductPicker products={products} value="" onSelect={(p) => linkAndAdd(p)} />
          </div>
        </div>
      )}

      {/* Modification rapide du paiement */}
      {payEdit && (
        <div className="fixed inset-0 overflow-y-auto bg-black/55 flex items-start justify-center z-[60] p-4">
          <div className="card p-6 w-full max-w-sm my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Wallet size={18} className="text-amber-400" /> Paiement</h3>
              <button onClick={() => setPayEdit(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-1">{payEdit.client?.nom} · {payEdit.date}</p>
            <p className="text-lg font-bold text-blue-400 mb-4">Total : {payEdit.total.toFixed(2)} MAD</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("status")}</label>
                <select className="input" value={payStatut} onChange={e => setPayStatut(e.target.value as SaleStatus)}>
                  <option value="paye">{t("paid")}</option>
                  <option value="en_attente">{t("pending")}</option>
                  <option value="partiel">{t("partial")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Reçu en</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MODES_PAIEMENT.map(m => (
                    <button key={m.cle} type="button" onClick={() => setPayMode(m.cle as "especes" | "cheque" | "virement")}
                      className={`rounded-lg py-1.5 text-xs font-medium ${payMode === m.cle ? "bg-amber-500 text-black" : "btn-secondary"}`}>{m.libelle}</button>
                  ))}
                </div>
                {payMode === "cheque" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <label className="text-xs text-slate-500">N° du chèque<input className="input mt-1" value={payCheque.numero} onChange={e => setPayCheque({ ...payCheque, numero: e.target.value })} /></label>
                    <label className="text-xs text-slate-500">Banque<input className="input mt-1" value={payCheque.banque} onChange={e => setPayCheque({ ...payCheque, banque: e.target.value })} /></label>
                    <label className="text-xs text-slate-500 col-span-2">À encaisser le<input type="date" className="input mt-1" value={payCheque.echeance} onChange={e => setPayCheque({ ...payCheque, echeance: e.target.value })} /></label>
                  </div>
                )}
              </div>
              {payStatut !== "paye" && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Montant payé (MAD)</label>
                  <input type="number" className="input" value={payMontant} onChange={e => setPayMontant(+e.target.value)} />
                  <p className="text-xs text-orange-400 mt-1">Reste : {(payEdit.total - payMontant).toFixed(2)} MAD</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setPayEdit(null)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={savePayEdit} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation après-vente + envoi de la fiche */}
      {lastSale && (
        <div className="fixed inset-0 overflow-y-auto bg-black/55 flex items-start justify-center z-[60] p-4">
          <div className="card p-6 w-full max-w-sm text-center my-auto">
            <div className="text-4xl mb-2">{lastSale.offline ? "📴" : "✅"}</div>
            <h3 className="font-semibold text-slate-100 mb-1">
              {lastSale.offline ? "Vente enregistrée hors-ligne" : "Vente enregistrée"}
            </h3>
            <p className="text-sm text-slate-400">{lastSale.clientNom || "Client"} · <b className="text-blue-400">{lastSale.total.toFixed(2)} MAD</b></p>
            {lastSale.offline && <p className="text-xs text-yellow-400 mt-2">Elle sera synchronisée automatiquement dès le retour d&apos;internet.</p>}
            {lastSale.parrainMsg && <p className="text-xs text-yellow-300 mt-2">{lastSale.parrainMsg}</p>}
            {/* Rappel vidange (Bible §4.10) — optionnel, 5 secondes, dans 5 mois l'app te le rappelle */}
            {!lastSale.offline && (
              <div className="mt-4 text-left bg-[var(--surface-2)] rounded-lg p-3">
                {vidSaved ? (
                  <p className="text-xs text-green-400 font-medium">🔔 Rappel enregistré — je te préviens à la date prévue ✓</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-400 mb-2">🔔 Rappel vidange (optionnel) : quelle voiture ?</p>
                    <div className="grid grid-cols-3 gap-2">
                      <input className="input col-span-2 text-sm" placeholder="Ex : Dacia Dokker de Ahmed"
                        value={vidVehicule} onChange={e => setVidVehicule(e.target.value)} />
                      <input type="date" className="input text-sm" value={vidDate} onChange={e => setVidDate(e.target.value)} />
                    </div>
                    {vidVehicule.trim() && (
                      <button onClick={saveRappelVidange} className="mt-2 w-full text-xs bg-blue-500/15 text-blue-300 px-2 py-1.5 rounded-lg hover:bg-blue-500/25 font-medium">
                        Enregistrer le rappel
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2 mt-5">
              <button onClick={() => sendWhatsApp(lastSale.clientTel, buildReceipt(lastSale))}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium">
                <MessageCircle size={18} /> Envoyer la fiche au client (WhatsApp)
              </button>
              <button onClick={() => setLastSale(null)} className="btn-secondary">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
