"use client";
export const dynamic = "force-dynamic";
import { Fragment, useEffect, useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { loadAll } from "@/lib/pagedFetch";
import { DEPART, chargerMarques, ajouterMarque, marquesPour, marqueVarianteDefaut as varDefaut } from "@/lib/brands";
import { CATEGORY_KEYS as categoryKeys, estFiltre, familleDe, correspondCategorie, avecDents, normDents, dentsValides, MSG_DENTS } from "@/lib/categories";
import CategoryOptions from "@/components/CategoryOptions";
import { Product, ProductCategory, Equivalence } from "@/types/database";
import { Plus, Search, Pencil, Trash2, X, Repeat, Eye, EyeOff, Car, Truck, Megaphone, ChevronDown, ChevronUp, Barcode, MessageCircle, Camera } from "lucide-react";
import { sendWhatsApp } from "@/lib/whatsapp";
import { uploadProductPhoto } from "@/lib/photoUpload";
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import CategoryIcon from "@/components/CategoryIcon";
import VoiceButton from "@/components/VoiceButton";
import { lireTypeVehicule, useTypeVehicule, useChangementType } from "@/lib/typeVehicule";
import { CATALOGUES, POURCENTAGES_DEFAUT, chargerPourcentages, prixPour, type Pourcentages, type TypeCatalogue } from "@/lib/prixCatalogues";

// Prix corrigés à la main pour les 3 autres catalogues (0 = calculé avec le pourcentage)
const MANUELS_VIDES = { prix_particulier: 0, prix_location: 0, prix_magasin: 0 };
const COL_CAT = { particulier: "prix_particulier", location: "prix_location", magasin: "prix_magasin" } as const;

// Catégories : liste commune en 9 familles (src/lib/categories.ts, BIBLE §8.31) ; marques par métier (src/lib/brands.ts)
const ERREUR_CATEGORIE = "La base n'accepte pas encore cette catégorie.\nColle d'abord le fichier supabase/categories_produits.sql dans l'éditeur SQL de Supabase, puis réessaie.";
const msgErreur = (e: { message: string } | null) => e && (/categorie_(check|fkey)/i.test(e.message) ? ERREUR_CATEGORIE : `Erreur : ${e.message}`);

const empty = { nom_fr: "", nom_ar: "", reference: "", marque: "Filtron", categorie: "filtre_huile" as ProductCategory, prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 2, notes: "", prix_promo: 0, code_barre: "", image_url: "", dimensions: "" };

// Tri naturel par référence : préfixe (lettres) puis numéro puis variante /n puis suffixe
function refCompare(a: string, b: string) {
  const parse = (r: string): [string, number, number, string] => {
    const m = r.toUpperCase().match(/^([A-Z]+)\s*(\d+)(?:\/(\d+))?(.*)$/);
    return m ? [m[1], parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : 0, m[4] || ""] : [r.toUpperCase(), 0, 0, ""];
  };
  const ka = parse(a), kb = parse(b);
  return ka[0].localeCompare(kb[0]) || ka[1] - kb[1] || ka[2] - kb[2] || ka[3].localeCompare(kb[3]);
}

export default function ProduitsPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [manuels, setManuels] = useState(MANUELS_VIDES);
  const [pctCat, setPctCat] = useState<Pourcentages>(POURCENTAGES_DEFAUT);
  useEffect(() => { chargerPourcentages().then(setPctCat); }, []);
  const [uploading, setUploading] = useState(false);
  const [equivs, setEquivs] = useState<{ id?: string; marque: string; reference: string; prix?: number; prix_achat?: number; stock?: number; code_barre?: string }[]>([]);
  const [newEquiv, setNewEquiv] = useState({ marque: "Flag", reference: "", prix: 0, prix_achat: 0, stock: 0, code_barre: "" });
  const [showAutoEquivs, setShowAutoEquivs] = useState(false);
  // Scanner code-barres : cible = "product" | "new" (ligne d'ajout) | index de variante
  const [scanTarget, setScanTarget] = useState<null | "product" | "new" | number>(null);
  const [vehMap, setVehMap] = useState<Record<string, { makes: string[]; nb: number }>>({});
  const [equivMap, setEquivMap] = useState<Record<string, { id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number }[]>>({});

  // kind : « voiture » / « camion » (products.vehicule, BIBLE §8.37) → seules ces fiches sont chargées ; "" = tout
  async function load(kind: "" | "voiture" | "camion" = kindFilter) {
    const parType = (q: any) => (kind ? q.eq("vehicule", kind) : q); // eslint-disable-line @typescript-eslint/no-explicit-any
    const eqParType = (q: any) => (kind ? q.eq("products.vehicule", kind) : q); // eslint-disable-line @typescript-eslint/no-explicit-any
    // Chargements en PARALLÈLE. IMPORTANT : sur 23 000+ équivalences, seules ~23 sont des
    // variantes de MARQUE (affichées) ; les 23 000 autres sont des codes OE constructeur qui
    // ne servent QU'À la recherche par référence. On charge donc d'abord les variantes de
    // marque (affichage instantané), puis les codes OE EN FOND pour la recherche.
    type EqRow = { id: string; product_id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number | null };
    type VehRow = { product_id: string; makes: string[] | null; nb: number | null };
    const buildEqMap = (rows: EqRow[]) => {
      const m: Record<string, { id: string; marque: string; reference: string; prix: number | null; prix_achat: number | null; stock: number }[]> = {};
      for (const e of rows) (m[e.product_id] ??= []).push({ id: e.id, marque: e.marque, reference: e.reference, prix: e.prix, prix_achat: e.prix_achat, stock: e.stock ?? 0 });
      return m;
    };
    const EQ_COLS = "id, product_id, marque, reference, prix, prix_achat, stock";
    const marquesChargees = await chargerMarques();
    setBrands(marquesChargees);
    const [all, brandedEq, vehRows] = await Promise.all([
      loadAll<Product>("products", "*", { filter: q => parType(q).order("nom_fr") }),
      loadAll<EqRow>("equivalences", EQ_COLS + ", products!inner(vehicule)", { filter: q => eqParType(q).in("marque", marquesChargees), countSelect: "id, products!inner(vehicule)" }),
      loadAll<VehRow>("product_vehicles", "*", { cleUnique: "product_id" }),
    ]);
    setProducts(all);
    setEquivMap(buildEqMap(brandedEq)); // affichage des variantes prêt tout de suite

    // Résumé véhicules (marques compatibles) par produit
    const map: Record<string, { makes: string[]; nb: number }> = {};
    for (const r of vehRows) map[r.product_id] = { makes: r.makes ?? [], nb: r.nb ?? 0 };
    setVehMap(map);

    // Recherche par n'importe quelle référence (codes OE inclus) : enrichi EN FOND,
    // non bloquant. L'affichage des variantes ne change pas (filtré aux marques connues).
    loadAll<EqRow>("equivalences", EQ_COLS + ", products!inner(vehicule)", { filter: eqParType, countSelect: "id, products!inner(vehicule)" })
      .then(full => setEquivMap(buildEqMap(full))).catch(() => {});
  }

  function vehSummary(p: Product) {
    const v = vehMap[p.id];
    if (v && v.makes.length) return v.makes.join(", ") + (v.nb > v.makes.length ? ` +${v.nb - v.makes.length}` : "");
    const dash = p.nom_fr.split("—")[1];
    return dash ? dash.trim() : "";
  }

  useEffect(() => { const t0 = lireTypeVehicule(); setKindFilter(t0); load(t0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    let productId = editing?.id;
    if (!form.marque.trim()) { alert("Choisis la marque de la pièce (Gates, Dayco, Dolz…)."); return; }
    // Kit / courroie de distribution : nombre de dents / largeur (ex. 141/25) gardé dans « dimensions » (BIBLE §8.33)
    const dents = avecDents(form.categorie) ? normDents(form.dimensions) : form.dimensions.trim();
    if (avecDents(form.categorie) && dents && !dentsValides(dents)) { alert(MSG_DENTS); return; }
    const payload = { ...form, dimensions: dents || null, prix_promo: form.prix_promo > 0 ? form.prix_promo : null, image_url: form.image_url || null };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { alert(msgErreur(error)); return; }
    } else {
      // Empêche de créer une fiche en double (même référence, casse/espaces différents) —
      // redirige plutôt vers la fiche existante pour y ajouter la marque comme variante.
      const dup = products.find(p => norm(p.reference) === norm(form.reference));
      if (dup) {
        const triedMarque = form.marque;
        alert(`« ${form.reference} » existe déjà sous « ${dup.reference} ».\nJ'ouvre cette fiche : ajoute ${triedMarque !== "Filtron" ? triedMarque : "la marque"} dans « Variantes de marque » juste en dessous, au lieu de créer un doublon.`);
        await startEdit(dup);
        if (triedMarque && triedMarque !== "Filtron") setNewEquiv(n => ({ ...n, marque: triedMarque }));
        return;
      }
      const { data: inserted, error } = await supabase.from("products").insert(payload).select().single();
      if (error) { alert(msgErreur(error)); return; }
      productId = (inserted as Product | null)?.id;
    }
    // Prix par catalogue corrigés à la main : envoyés à part (sans effet tant que le SQL n'est pas collé)
    if (productId) {
      const m = { prix_particulier: manuels.prix_particulier > 0 ? manuels.prix_particulier : null, prix_location: manuels.prix_location > 0 ? manuels.prix_location : null, prix_magasin: manuels.prix_magasin > 0 ? manuels.prix_magasin : null };
      try { await supabase.from("products").update(m).eq("id", productId); } catch { /* colonnes absentes */ }
    }
    // Synchronise les équivalences SANS tout effacer (16/11/2026) : avant, tout était supprimé puis recréé avec de
    // nouveaux identifiants → les ventes perdaient la marque vendue (lien remis à vide), les réceptions ne
    // retrouvaient plus leur variante (annulation du stock) et les prix par catalogue des variantes étaient perdus.
    // Maintenant : on modifie seulement ce qui a changé, on supprime seulement ce qui a été retiré, on ajoute le nouveau.
    if (productId) {
      const { data: avant } = await supabase.from("equivalences").select("id, marque, reference, prix, prix_achat, stock, code_barre").eq("product_id", productId);
      const valeurs = (e: typeof equivs[number]) => ({ marque: e.marque.trim(), reference: e.reference.trim(), prix: e.prix && e.prix > 0 ? e.prix : null, prix_achat: e.prix_achat && e.prix_achat > 0 ? e.prix_achat : null, stock: e.stock ?? 0, code_barre: e.code_barre?.trim() || null });
      const gardes = equivs.filter(e => e.marque.trim() && e.reference.trim());
      const idsGardes = new Set(gardes.map(e => e.id).filter(Boolean));
      const aRetirer = ((avant ?? []) as { id: string }[]).filter(a => !idsGardes.has(a.id)).map(a => a.id);
      if (aRetirer.length) await supabase.from("equivalences").delete().in("id", aRetirer);
      for (const e of gardes.filter(e => e.id)) {
        const a = ((avant ?? []) as (Equivalence & { code_barre: string | null })[]).find(x => x.id === e.id);
        if (!a) continue;
        const v = valeurs(e);
        const change = Object.fromEntries(Object.entries(v).filter(([k, val]) => (a as unknown as Record<string, unknown>)[k] !== val && !(k === "code_barre" && !val && !a.code_barre)));
        if (Object.keys(change).length) await supabase.from("equivalences").update(change as Partial<Equivalence>).eq("id", e.id!);
      }
      const nouvelles = gardes.filter(e => !e.id).map(e => {
        const { code_barre, ...v } = valeurs(e);
        return { product_id: productId!, ...v, ...(code_barre ? { code_barre } : {}) };
      });
      if (nouvelles.length) await supabase.from("equivalences").insert(nouvelles);
    }
    setShowForm(false); setEditing(null); setForm(empty); setManuels(MANUELS_VIDES); setEquivs([]); setNewEquiv({ marque: varDefaut(empty.categorie), reference: "", prix: 0, prix_achat: 0, stock: 0, code_barre: "" });
    load();
  }

  // Photo prise avec l'appareil → compressée → uploadée → URL mise dans le produit
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductPhoto(file, form.reference || "produit");
      setForm(f => ({ ...f, image_url: url }));
    } catch (err) {
      alert("Échec de l'envoi de la photo.\nAs-tu collé le SQL supabase/storage_produits.sql dans Supabase ?\n\n" + (err instanceof Error ? err.message : ""));
    } finally { setUploading(false); e.target.value = ""; }
  }

  async function remove(id: string) {
    if (confirm(t("confirm") + " " + t("delete") + "?")) {
      await supabase.from("products").delete().eq("id", id);
      load();
    }
  }

  async function removeVariant(equivId: string, label: string) {
    if (confirm(`Supprimer la variante « ${label} » ?`)) {
      await supabase.from("equivalences").delete().eq("id", equivId);
      load();
    }
  }

  async function startEdit(p: Product) {
    setEditing(p);
    setForm({ nom_fr: p.nom_fr, nom_ar: p.nom_ar, reference: p.reference, marque: p.marque ?? "Filtron", categorie: p.categorie, prix_achat: p.prix_achat, prix_vente: p.prix_vente, stock: p.stock, stock_min: p.stock_min, notes: p.notes ?? "", prix_promo: p.prix_promo ?? 0, code_barre: p.code_barre ?? "", image_url: p.image_url ?? "", dimensions: p.dimensions ?? "" });
    setManuels({ prix_particulier: p.prix_particulier ?? 0, prix_location: p.prix_location ?? 0, prix_magasin: p.prix_magasin ?? 0 });
    const { data } = await supabase.from("equivalences").select("*").eq("product_id", p.id);
    setEquivs((data as Equivalence[] | null)?.map(e => ({ id: e.id, marque: e.marque, reference: e.reference, prix: e.prix ?? undefined, prix_achat: e.prix_achat ?? undefined, stock: e.stock ?? 0, code_barre: e.code_barre ?? "" })) ?? []);
    setNewEquiv({ marque: varDefaut(p.categorie, p.marque), reference: "", prix: 0, prix_achat: 0, stock: 0, code_barre: "" });
    setShowAutoEquivs(false);
    setShowForm(true);
  }

  function openNew() {
    setShowForm(true); setEditing(null); setForm(empty); setManuels(MANUELS_VIDES); setEquivs([]); setNewEquiv({ marque: varDefaut(empty.categorie), reference: "", prix: 0, prix_achat: 0, stock: 0, code_barre: "" }); setShowAutoEquivs(false);
  }

  // Diffuse les produits en promo (prix_promo > 0) par WhatsApp
  function promoWhatsApp() {
    const promos = products.filter(p => (p.prix_promo ?? 0) > 0);
    if (promos.length === 0) { alert("Aucun produit en promo. Mets un « prix promo » sur des produits d'abord (Modifier)."); return; }
    const lignes = promos.map(p => `• ${p.reference} — ${p.nom_fr}\n   ${p.prix_vente} ➜ *${p.prix_promo} MAD*`).join("\n");
    const text = ["🔥 *PROMOS FiltroPro* 🔥", "", lignes, "", "Dispo jusqu'à épuisement du stock.", "📞 06 02 35 02 90"].join("\n");
    sendWhatsApp(null, text);
  }

  // Fiche produit WhatsApp (Bible §4.5) : photo mentale de la boîte en 5 secondes —
  // compatibilités = UNIQUEMENT la table applications, jamais inventées.
  async function ficheWhatsApp(p: Product) {
    const { data: apps, count } = await supabase.from("applications")
      .select("marque, modele, moteur", { count: "exact" }).eq("product_id", p.id).limit(4);
    const variantes = (equivMap[p.id] ?? []).filter(e => e.stock > 0).map(e => e.marque);
    const lignes = [
      `🔧 *${p.nom_fr || (estFiltre(p.categorie) ? "Filtre" : t(categoryKeys[p.categorie] ?? "other"))} ${p.marque || "Filtron"} ${p.reference}*`,
    ];
    if (p.dimensions) lignes.push(avecDents(p.categorie) ? `🦷 Dents / largeur : ${p.dimensions}` : `📏 ${p.dimensions}`);
    const appRows = (apps ?? []) as { marque: string; modele: string; moteur: string | null }[];
    if (appRows.length > 0) {
      lignes.push("", "🚗 Compatible :");
      for (const a of appRows) lignes.push(`• ${a.marque} ${a.modele}${a.moteur ? ` ${a.moteur}` : ""}`);
      const reste = (count ?? appRows.length) - appRows.length;
      if (reste > 0) lignes.push(`… et ${reste} autres véhicules`);
    }
    if (variantes.length > 0) lignes.push("", `🏷️ Marques dispo : ${[...new Set(variantes)].join(", ")}`);
    lignes.push("", "📞 *FiltroPro* — 06 02 35 02 90 · on livre 🚚");
    sendWhatsApp(null, lignes.join("\n"));
  }

  function addEquivRow() {
    if (!newEquiv.reference.trim()) return;
    setEquivs([...equivs, { marque: newEquiv.marque, reference: newEquiv.reference.trim(), prix: newEquiv.prix || undefined, prix_achat: newEquiv.prix_achat || undefined, stock: newEquiv.stock || 0, code_barre: newEquiv.code_barre || "" }]);
    setNewEquiv({ marque: newEquiv.marque, reference: "", prix: 0, prix_achat: 0, stock: 0, code_barre: "" });
  }

  // Reçoit un code scanné et l'affecte à la bonne cible (produit / nouvelle ligne / variante)
  function onScanCode(code: string) {
    const c = code.trim();
    if (scanTarget === "product") setForm(f => ({ ...f, code_barre: c }));
    else if (scanTarget === "new") setNewEquiv(n => ({ ...n, code_barre: c }));
    else if (typeof scanTarget === "number") setEquivs(prev => prev.map((x, j) => j === scanTarget ? { ...x, code_barre: c } : x));
    setScanTarget(null);
  }

  // Marques de FILTRES (Filtron = produit principal, les autres = variantes équivalentes) : celles de départ
  // + celles ajoutées par l'utilisateur (« ➕ Nouvelle marque… », gardées dans la base, src/lib/brands.ts).
  const [BRANDS, setBrands] = useState<string[]>(DEPART);
  // Marques reconnues (hors Filtron, + "OE") : toujours visibles dans les variantes, jamais
  // mélangées avec les codes constructeur (Citroën, Ford…) importés automatiquement.
  const KNOWN_BRANDS = new Set([...BRANDS.filter(b => b !== "Filtron"), "OE"].map(b => b.toLowerCase()));
  // Toutes les marques possibles pour un PRODUIT (filtres + distribution + huiles moteur, produits indépendants
  // sans système de variantes) — utilisé pour le filtre de la liste.
  const PRODUCT_BRANDS = BRANDS; // filtres, huile, distribution, freinage… + marques ajoutées
  // Fiche produit : les marques du métier de la pièce (filtres ou distribution), la marque choisie toujours présente
  const formFiltre = estFiltre(form.categorie);
  const FORM_BRANDS = marquesPour(BRANDS, form.categorie, form.marque);
  const VARIANT_BRANDS = marquesPour(BRANDS, form.categorie, newEquiv.marque).filter(b => b !== "Filtron" && b !== form.marque);
  const marquePrincipale = form.marque || "Filtron";
  const [brandFilter, setBrandFilter] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showCost, setShowCost] = useState(false);
  const [kindFilter, setKindFilter] = useState<"" | "voiture" | "camion">("voiture"); // défaut : voitures (mode de l'appli)
  const [typeV, setTypeV] = useTypeVehicule();
  useChangementType(typeV, (t) => { setKindFilter(t); load(t); });

  // Normalise une référence : sans espaces, en majuscules (wl 7510 ↔ wl7510)
  const norm = (s: string) => s.toUpperCase().replace(/\s+/g, "");
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const qn = norm(search);
    const eqs = equivMap[p.id] ?? [];
    const dentsP = avecDents(p.categorie) && p.dimensions ? norm(p.dimensions) : ""; // « 141/25 » trouvé aussi
    const matchSearch = !q || p.nom_fr.toLowerCase().includes(q) || norm(p.reference).includes(qn) || p.nom_ar.includes(search) || (!!dentsP && dentsP.includes(qn))
      || eqs.some(e => norm(e.reference).includes(qn) || e.marque.toLowerCase().includes(q));
    const refN = norm(refSearch);
    const matchRef = !refSearch || norm(p.reference).startsWith(refN) || eqs.some(e => norm(e.reference).startsWith(refN)) || (!!dentsP && dentsP.startsWith(refN));
    const matchBrand = !brandFilter || (p.marque ?? "Filtron").toLowerCase() === brandFilter.toLowerCase();
    const matchCat = correspondCategorie(catFilter, p.categorie); // une catégorie ou « toute la famille »
    // Voiture / camion : étiquette calculée par scripts/classer_vehicules.mjs (règle de classifyKind, src/lib/vehicleType.ts)
    const matchKind = !kindFilter || (p.vehicule ?? "voiture") === kindFilter;
    return matchSearch && matchRef && matchBrand && matchCat && matchKind;
  }).sort((a, b) => {
    // Disponibles en HAUT, ruptures en BAS (un produit est « dispo » si son stock
    // principal ou l'une de ses variantes a du stock), puis tri par référence.
    const dispo = (p: typeof a) => (p.stock > 0 || (equivMap[p.id] ?? []).some(e => e.stock > 0)) ? 0 : 1;
    return dispo(a) - dispo(b) || refCompare(a.reference, b.reference);
  });

  return (
    <div>
      <Header title="products" action={
        <div className="flex items-center gap-2">
          <button onClick={promoWhatsApp} className="btn-secondary flex items-center gap-2" title="Diffuser les promos sur WhatsApp">
            <Megaphone size={15} /> <span className="hidden sm:inline">Promo WhatsApp</span>
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">{t("addProduct")}</span>
          </button>
        </div>
      } />

      {/* Sélecteur type véhicule : sépare voitures et bus/camions */}
      <div className="flex gap-1.5 mb-4">
        {([
          { v: "voiture", label: t("vehCar"), icon: Car },
          { v: "camion", label: t("vehTruck"), icon: Truck },
          { v: "", label: t("vehAll"), icon: null },
        ] as const).map(({ v, label, icon: Icon }) => (
          <button key={v} onClick={() => { if (v) setTypeV(v); else { setKindFilter(""); load(""); } }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              kindFilter === v ? "bg-red-600 text-white shadow-lg shadow-red-950/40" : "btn-secondary"}`}>
            {Icon && <Icon size={16} />} {label}
          </button>
        ))}
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9 font-mono uppercase" placeholder={t("searchByRef")} value={refSearch} onChange={e => setRefSearch(e.target.value.toUpperCase())} />
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input ps-9" placeholder={t("searchByCar")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <VoiceButton onResult={(txt) => setSearch(txt)} />
        <select className="input w-40" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="">{t("allBrands")}</option>
          {PRODUCT_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="input w-44" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">{t("category")} — tous</option>
          <CategoryOptions t={t} avecFamilles />
        </select>
        <button onClick={() => setShowCost(v => !v)} title={t("buyPrice")}
          className="btn-secondary flex items-center gap-2 shrink-0">
          {showCost ? <EyeOff size={15} /> : <Eye size={15} />}
          <span className="hidden sm:inline">{showCost ? t("buyPrice") : t("buyPrice") + " 🔒"}</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 overflow-y-auto bg-black/40 flex items-start justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="font-semibold text-slate-800 mb-4">{editing ? t("edit") : t("addProduct")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500 mb-1 block">{t("reference")}</label><input className="input font-mono uppercase" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value.toUpperCase() })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Marque</label>
                <select className="input" value={form.marque} onChange={e => { const m = e.target.value; setForm({ ...form, marque: m }); if (newEquiv.marque === m) setNewEquiv(n => ({ ...n, marque: varDefaut(form.categorie, m) })); }}>
                  {!form.marque && <option value="">— choisis la marque —</option>}
                  {FORM_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("category")}</label>
                <select className="input" value={form.categorie} onChange={e => {
                  const c = e.target.value as ProductCategory;
                  // Filtron ne fait que des filtres : hors filtres, on fait choisir la vraie marque (et l'inverse)
                  const marque = !estFiltre(c) && form.marque === "Filtron" ? "" : estFiltre(c) && !form.marque ? "Filtron" : form.marque;
                  setForm({ ...form, categorie: c, marque });
                  if (familleDe(c) !== familleDe(form.categorie) || c === "huile_moteur" || form.categorie === "huile_moteur") setNewEquiv(n => ({ ...n, marque: varDefaut(c, marque) }));
                }}>
                  <CategoryOptions t={t} />
                </select>
              </div>
              {avecDents(form.categorie) && (
                <div><label className="text-xs text-amber-400 mb-1 block">🦷 Nombre de dents / largeur</label>
                  <input className={`input font-mono ${form.dimensions && !dentsValides(normDents(form.dimensions)) ? "ring-2 ring-red-500/70" : ""}`} placeholder="ex. 141/25" inputMode="decimal"
                    value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} onBlur={e => setForm(f => ({ ...f, dimensions: normDents(e.target.value) }))} />
                </div>
              )}
              <div><label className="text-xs text-slate-500 mb-1 block">{t("buyPrice")} (MAD)</label><input type="number" className="input" value={form.prix_achat} onChange={e => setForm({ ...form, prix_achat: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("sellPrice")} (MAD)</label><input type="number" className="input" value={form.prix_vente} onChange={e => setForm({ ...form, prix_vente: +e.target.value })} /></div>
              <div><label className="text-xs text-rose-400 mb-1 block">Prix promo (MAD) — 0 = pas de promo</label><input type="number" className="input" value={form.prix_promo} onChange={e => setForm({ ...form, prix_promo: +e.target.value })} /></div>
              {/* 4 catalogues (BIBLE §8.18) : vide = prix garage ± pourcentage (en gris), sinon ce prix-là */}
              <div className="col-span-2">
                <label className="text-xs text-sky-300 mb-1 block">Prix par catalogue (vide = calculé, en gris)</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATALOGUES.filter(c => c.type !== "garage").map(c => {
                    const t = c.type as Exclude<TypeCatalogue, "garage">;
                    return (
                      <div key={t}>
                        <span className="text-[11px] text-slate-400 block mb-0.5">{c.court} ({pctCat[t] > 0 ? "+" : ""}{pctCat[t]} %)</span>
                        <input type="number" className="input" value={manuels[COL_CAT[t]] || ""} placeholder={form.prix_vente > 0 ? String(prixPour(t, form.prix_vente, null, pctCat)) : "—"}
                          onChange={e => setManuels({ ...manuels, [COL_CAT[t]]: +e.target.value })} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">{t("stock")}</label><input type="number" className="input" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Stock min</label><input type="number" className="input" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: +e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Code-barres ({marquePrincipale})</label>
                <div className="flex gap-2">
                  <input className="input font-mono flex-1" placeholder="scanne ou tape le code" value={form.code_barre} onChange={e => setForm({ ...form, code_barre: e.target.value })} />
                  <button type="button" onClick={() => setScanTarget("product")} className="btn-secondary shrink-0 flex items-center gap-1.5"><Barcode size={16} /> Scanner</button>
                </div>
              </div>
              {/* Photo du filtre (pour le catalogue) */}
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">📷 Photo {formFiltre ? "du filtre" : "de la pièce"} (catalogue)</label>
                <div className="flex items-center gap-3">
                  <FilterImage reference={form.reference || "?"} categorie={form.categorie} imageUrl={form.image_url || undefined} wid={160} zoom={false}
                    className="h-16 w-16 rounded-lg object-contain bg-white p-1 border border-slate-300 shrink-0" />
                  <label className={`btn-secondary text-sm cursor-pointer flex items-center gap-2 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                    <Camera size={15} /> {uploading ? "Envoi…" : (form.image_url ? "Changer" : "Prendre / choisir")}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                  </label>
                  {form.image_url && <button type="button" onClick={() => setForm(f => ({ ...f, image_url: "" }))} className="text-red-400 hover:text-red-600 text-sm">Retirer</button>}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Prends la boîte en photo — elle s&apos;affichera à côté de la référence dans le catalogue.</p>
              </div>
            </div>

            {/* Variantes de marque — Filtron + équivalents sur une seule grille */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Repeat size={15} /> Variantes de marque</label>
              <p className="text-xs text-slate-400 mb-2">La ligne {marquePrincipale} reprend les infos du produit ci-dessus. Ajoute les marques équivalentes avec leur référence, prix et quantité.</p>

              <div className="rounded-lg border border-slate-200 overflow-x-auto">
                {/* En-tête */}
                <div className="grid grid-cols-[76px_minmax(120px,1fr)_56px_56px_50px_58px] gap-1.5 items-center px-2.5 py-1.5 bg-slate-100 text-[10px] font-semibold uppercase text-slate-500 min-w-[420px]">
                  <span>Marque</span>
                  <span>Référence</span>
                  <span className="text-center">Achat</span>
                  <span className="text-center">Vente</span>
                  <span className="text-center">Qté</span>
                  <span></span>
                </div>

                {/* Ligne Filtron (le produit lui-même, lecture seule) */}
                <div className="grid grid-cols-[76px_minmax(120px,1fr)_56px_56px_50px_58px] gap-1.5 items-center px-2.5 py-2 bg-amber-50 border-t border-slate-200 min-w-[420px]">
                  <span className="text-xs font-bold text-amber-700 truncate" title={marquePrincipale}>{marquePrincipale}</span>
                  <span className="text-sm font-mono truncate text-slate-700">{form.reference || <span className="text-slate-300">— réf. —</span>}</span>
                  <span className="text-xs text-center text-slate-600">{form.prix_achat || "—"}</span>
                  <span className="text-xs text-center text-slate-600">{form.prix_vente || "—"}</span>
                  <span className="text-xs text-center text-slate-600">{form.stock || "—"}</span>
                  <span></span>
                </div>

                {/* Marques équivalentes éditables — seuls les codes CONSTRUCTEUR (OE, hors liste de
                    marques connues) sont masqués par défaut. Une vraie marque (Flag, Mann, Wix…)
                    reste toujours visible, même sans prix, avec un ⚠️ pour ne pas l'oublier.
                    Liste plafonnée + défilement interne pour garder la ligne d'ajout visible. */}
                <div className="max-h-[34vh] overflow-y-auto">
                {equivs.map((e, i) => {
                  const isKnownBrand = KNOWN_BRANDS.has(e.marque.trim().toLowerCase());
                  const isAuto = !isKnownBrand && (e.prix == null && e.prix_achat == null);
                  if (isAuto && !showAutoEquivs) return null;
                  const noPrice = isKnownBrand && e.prix == null;
                  return (
                  <div key={i} className="grid grid-cols-[76px_minmax(120px,1fr)_56px_56px_50px_58px] gap-1.5 items-center px-2.5 py-1.5 border-t border-slate-100 min-w-[420px]">
                    <span className="text-xs font-semibold text-indigo-700 truncate" title={e.marque}>{e.marque}</span>
                    <input className="input font-mono py-1 text-xs" value={e.reference} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, reference: ev.target.value } : x))} />
                    <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={e.prix_achat ?? ""} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, prix_achat: ev.target.value === "" ? undefined : +ev.target.value } : x))} />
                    <input type="number" className={`input py-1 text-xs text-center ${noPrice ? "ring-1 ring-amber-500" : ""}`} placeholder="0" title={noPrice ? "Sans prix vente : n'apparaîtra pas dans les ventes" : undefined} value={e.prix ?? ""} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, prix: ev.target.value === "" ? undefined : +ev.target.value } : x))} />
                    <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={e.stock ?? 0} onChange={ev => setEquivs(equivs.map((x, j) => j === i ? { ...x, stock: +ev.target.value } : x))} />
                    <div className="flex items-center justify-center gap-1.5">
                      {noPrice && <span title="Sans prix vente : n'apparaîtra pas dans les ventes" className="text-amber-500 text-xs">⚠️</span>}
                      <button type="button" onClick={() => setScanTarget(i)} className={e.code_barre ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"} title={e.code_barre ? `Code : ${e.code_barre} (re-scanner)` : "Scanner le code-barres"}><Barcode size={15} /></button>
                      <button onClick={() => setEquivs(equivs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600" title="Retirer"><X size={14} /></button>
                    </div>
                  </div>
                  );
                })}

                {/* Bascule pour les codes constructeur (OE) automatiques */}
                {equivs.filter(e => !KNOWN_BRANDS.has(e.marque.trim().toLowerCase()) && e.prix == null && e.prix_achat == null).length > 0 && (
                  <button type="button" onClick={() => setShowAutoEquivs(v => !v)}
                    className="w-full text-xs font-medium text-blue-500 hover:text-blue-400 flex items-center justify-center gap-1 py-1.5 border-t border-slate-100 bg-slate-50/40">
                    {showAutoEquivs
                      ? <>Masquer les codes constructeur (OE) <ChevronUp size={13} /></>
                      : <>Voir {equivs.filter(e => !KNOWN_BRANDS.has(e.marque.trim().toLowerCase()) && e.prix == null && e.prix_achat == null).length} codes constructeur (OE) <ChevronDown size={13} /></>}
                  </button>
                )}
                </div>

                {/* Ligne d'ajout — toujours visible sous la liste */}
                <div className="grid grid-cols-[76px_minmax(120px,1fr)_56px_56px_50px_58px] gap-1.5 items-center px-2.5 py-2 border-t border-slate-200 bg-slate-50/70 min-w-[420px]">
                  <select className="input py-1 text-xs px-1" value={newEquiv.marque} onChange={async e => {
                    if (e.target.value !== "__ajout__") { setNewEquiv({ ...newEquiv, marque: e.target.value }); return; }
                    // Nouvelle marque écrite par l'utilisateur : enregistrée pour toujours avec les autres
                    const nom = window.prompt("Nom de la nouvelle marque (comme sur la boîte) :");
                    if (!nom) return;
                    const r = await ajouterMarque(nom, form.categorie); // rattachée à la famille de la fiche (BIBLE §8.31)
                    setBrands(r.marques);
                    if (r.erreur) { alert(r.erreur); return; }
                    if (r.marque) setNewEquiv({ ...newEquiv, marque: r.marque });
                  }}>
                    {VARIANT_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="OE">OE</option>
                    <option value="__ajout__">➕ Nouvelle marque…</option>
                  </select>
                  <input className="input font-mono py-1 text-xs" placeholder="réf (ex Z555)" value={newEquiv.reference}
                    onChange={e => setNewEquiv({ ...newEquiv, reference: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEquivRow(); } }} />
                  <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={newEquiv.prix_achat || ""} onChange={e => setNewEquiv({ ...newEquiv, prix_achat: +e.target.value })} />
                  <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={newEquiv.prix || ""} onChange={e => setNewEquiv({ ...newEquiv, prix: +e.target.value })} />
                  <input type="number" className="input py-1 text-xs text-center" placeholder="0" value={newEquiv.stock || ""} onChange={e => setNewEquiv({ ...newEquiv, stock: +e.target.value })} />
                  <div className="flex items-center justify-center gap-1.5">
                    <button type="button" onClick={() => setScanTarget("new")} className={newEquiv.code_barre ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"} title={newEquiv.code_barre ? `Code : ${newEquiv.code_barre}` : "Scanner le code-barres"}><Barcode size={15} /></button>
                    <button onClick={addEquivRow} className="text-emerald-500 hover:text-emerald-600" title="Ajouter cette marque"><Plus size={16} /></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-secondary">{t("cancel")}</button>
              <button onClick={save} className="btn-primary">{t("save")}</button>
            </div>
          </div>
        </div>
      )}

      {scanTarget !== null && <BarcodeScanner onScan={onScanCode} onClose={() => setScanTarget(null)} />}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t("reference"), t("vehicleType"), t("category"), ...(showCost ? [t("buyPrice")] : []), t("sellPrice"), t("stock"), t("actions")].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => {
              // Toutes les vraies marques (Flag, Mann, Wix…) s'affichent, même sans prix —
              // seuls les codes constructeur (OE) importés automatiquement restent masqués ici.
              const variants = (equivMap[p.id] ?? []).filter(e => KNOWN_BRANDS.has(e.marque.trim().toLowerCase()))
                // Variantes disponibles en haut, ruptures en bas.
                .sort((a, b) => (a.stock > 0 ? 0 : 1) - (b.stock > 0 ? 0 : 1) || refCompare(a.reference, b.reference));
              return (
              <Fragment key={p.id}>
              <tr className={p.stock <= p.stock_min ? "bg-red-50" : "hover:bg-slate-50"}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <FilterImage reference={p.reference} categorie={p.categorie} imageUrl={p.image_url} wid={80} className="h-9 w-9 rounded object-contain bg-white shrink-0 border border-slate-700/50 p-0.5" />
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-slate-300">{p.reference}</span>
                      <span className="ms-2 text-[10px] font-semibold text-amber-400">{p.marque || "Filtron"}</span>
                      {avecDents(p.categorie) && p.dimensions && <div className="text-[10px] text-slate-400">🦷 {p.dimensions}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 max-w-xs">
                  {vehSummary(p) || <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><CategoryIcon categorie={p.categorie} size={15} className="text-red-400" /> {t(categoryKeys[p.categorie])}</span>
                </td>
                {showCost && <td className="px-4 py-3 text-slate-400">{p.prix_achat} MAD</td>}
                <td className="px-4 py-3 font-medium text-blue-600">
                  {(p.prix_promo ?? 0) > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-slate-500 text-xs">{p.prix_vente}</span>
                      <span className="text-rose-400 font-bold">{p.prix_promo} MAD</span>
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full font-semibold">PROMO</span>
                    </span>
                  ) : `${p.prix_vente} MAD`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StockBadge stock={p.stock} stockMin={p.stock_min} />
                    <span className="text-xs text-slate-400">{p.stock}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => ficheWhatsApp(p)} className="text-green-500 hover:text-green-400" title="Fiche produit WhatsApp"><MessageCircle size={15} /></button>
                    <button onClick={() => startEdit(p)} className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                    <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
              {variants.map((e, i) => (
                <tr key={p.id + "-eq-" + i} className="bg-slate-900/20">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 ps-11">
                      <span className="text-indigo-300">↳</span>
                      <span className="font-mono text-xs text-slate-300">{e.reference}</span>
                      <span className="text-xs font-semibold text-indigo-300">{e.marque}</span>
                    </div>
                  </td>
                  <td></td>
                  <td></td>
                  {showCost && <td className="px-4 py-2 text-xs text-slate-400">{e.prix_achat != null ? `${e.prix_achat} MAD` : "—"}</td>}
                  <td className="px-4 py-2 font-medium text-blue-600">
                    {e.prix != null
                      ? `${e.prix} MAD`
                      : <span className="text-amber-500 text-xs font-normal" title="Sans prix vente — n'apparaîtra pas dans les ventes">⚠️ sans prix</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <StockBadge stock={e.stock} stockMin={0} />
                      <span className="text-xs text-slate-400">{e.stock}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} title="Modifier la variante (dans la fiche)" className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                      <button onClick={() => removeVariant(e.id, `${e.reference} ${e.marque}`)} title="Supprimer la variante" className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-slate-400 py-10">{t("noData")}</p>}
      </div>
    </div>
  );
}
