"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { TrendingUp, Users, Package, AlertTriangle, Wallet, Search, Car, Tag, ShieldCheck, Truck, ArrowUp, Star, Eye, ChevronDown, ChevronUp, ShoppingCart, ClipboardList, MapPin, CloudOff, Banknote } from "lucide-react";
// Truck déjà importé pour la tuile Fournisseurs
import BrandLogo from "@/components/BrandLogo";
import Logo from "@/components/Logo";
import VoiceButton from "@/components/VoiceButton";
import { getPending } from "@/lib/offlineSales";

type Stats = {
  totalVentes: number; totalClients: number; totalProduits: number;
  stockFaible: number; benefice: number; coutMarchandise: number;
  toRecommend: number; unpaid: number; encaisseJour: number; encaisseSemaine: number;
};

const BRANDS = [
  { name: "FILTRON", slug: "filtron", color: "#1b4f9c" },
  { name: "MANN-FILTER", slug: "mann-filter", color: "#c8102e" },
  { name: "MAHLE", slug: "mahle", color: "#e2001a" },
  { name: "BOSCH", slug: "bosch", color: "#ea0016" },
  { name: "TRW", slug: "trw", color: "#d81e05" },
  { name: "GATES", slug: "gates", color: "#111111" },
  { name: "LUK", slug: "luk", color: "#111111" },
  { name: "SKF", slug: "skf", color: "#0033a0" },
  { name: "BREMBO", slug: "brembo", color: "#e2001a" },
  { name: "PURFLUX", slug: "purflux", color: "#0a59a8" },
  { name: "VALEO", slug: "valeo", color: "#00a651" },
  { name: "FEBI", slug: "febi", color: "#d81e05" },
  { name: "SACHS", slug: "sachs", color: "#1a1a1a" },
  { name: "NGK", slug: "ngk", color: "#e60012" },
  { name: "HENGST", slug: "hengst", color: "#1f6fc0" },
  { name: "MONROE", slug: "monroe", color: "#e8631a" },
];

const REVIEWS = [
  { name: "Karim B.", city: "Fès", text: "J'ai trouvé mon filtre en 2 minutes par référence. Service rapide et pro." },
  { name: "Mohammed A.", city: "Meknès", text: "Très bon prix et livraison à l'heure. Le catalogue est très complet." },
  { name: "Youssef E.", city: "Ifrane", text: "Enfin une plateforme claire pour trouver le bon filtre. Je recommande !" },
];

const FEATURES = [
  { icon: Package, title: "+3 000 RÉFÉRENCES", sub: "Catalogue Filtron complet" },
  { icon: Search, title: "RECHERCHE RAPIDE", sub: "Référence · véhicule · VIN" },
  { icon: ShieldCheck, title: "QUALITÉ MANN+HUMMEL", sub: "Filtres d'origine garantis" },
  { icon: Truck, title: "LIVRAISON AU MAROC", sub: "Tournées & WhatsApp" },
];

const HERO = [
  "photo-1486262715619-67b85e0b08d3", // moteur
  "photo-1606577924006-27d39b132ae2", // disque de frein
  "photo-1600880292089-90a7e086ee0c", // mécanicien / garage (nouveau)
  "photo-1530046339160-ce3e530c7d2f", // garage
  "photo-1486006920555-c77dcf18193c", // moteur / pièces (nouveau)
];

export default function Dashboard() {
  const { t } = useLang();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalVentes: 0, totalClients: 0, totalProduits: 0, stockFaible: 0, benefice: 0, coutMarchandise: 0, toRecommend: 0, unpaid: 0, encaisseJour: 0, encaisseSemaine: 0 });
  const [dbError, setDbError] = useState("");
  const [pendingOffline, setPendingOffline] = useState(0);
  const [relances, setRelances] = useState<{ id: string; nom: string; days: number; freq: number }[]>([]);
  // Montants sensibles masqués par défaut — révélés au clic
  const [showMoney, setShowMoney] = useState<{ f: boolean; b: boolean; e: boolean }>({ f: false, b: false, e: false });
  const [showVitrine, setShowVitrine] = useState(false);

  useEffect(() => {
    const tmr = setInterval(() => setIdx((i) => (i + 1) % HERO.length), 5000);
    return () => clearInterval(tmr);
  }, []);

  useEffect(() => {
    setPendingOffline(getPending().length);
    async function load() {
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("sales").select("total, montant_paye, statut, date, client_id"),
        supabase.from("products").select("id").gt("stock", 0).lte("stock", 2),
      ]);
      const errors = [r1.error, r2.error, r3.error, r4.error].filter(Boolean);
      if (errors.length > 0) { setDbError(errors.map((e) => e?.message).join(" | ")); return; }
      const sales = (r3.data ?? []) as { total: number; montant_paye: number; statut: string; date: string; client_id: string }[];
      const stockFaible = r4.data;
      // Articles vendus paginés → coût marchandise & bénéfice exacts
      const saleItems: { quantite: number; prix_unitaire: number; product: { prix_achat: number } | null }[] = [];
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.from("sale_items").select("quantite, prix_unitaire, product:products(prix_achat)").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        saleItems.push(...(data as unknown as typeof saleItems));
        if (data.length < 1000) break;
      }
      const totalVentes = sales.reduce((s, v) => s + v.total, 0);
      const coutMarchandise = saleItems.reduce((s, i) => s + i.quantite * (i.product?.prix_achat ?? 0), 0);
      const benefice = saleItems.reduce((s, i) => s + (i.prix_unitaire - (i.product?.prix_achat ?? 0)) * i.quantite, 0);
      const unpaid = sales.filter((s) => s.statut !== "paye").length;
      const todayStr = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
      const encaisseJour = sales.filter((s) => s.date === todayStr).reduce((a, s) => a + s.montant_paye, 0);
      const encaisseSemaine = sales.filter((s) => s.date >= weekAgo).reduce((a, s) => a + s.montant_paye, 0);

      // Produits à recommander (stock <= seuil) — pagination
      const lowList: { stock: number; stock_min: number }[] = [];
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.from("products").select("stock, stock_min").range(i * 1000, i * 1000 + 999);
        if (!data || data.length === 0) break;
        lowList.push(...(data as { stock: number; stock_min: number }[]));
        if (data.length < 1000) break;
      }
      const toRecommend = lowList.filter((p) => p.stock <= p.stock_min).length;

      // Clients/garages à relancer : intervalle d'achat dépassé
      const { data: cl } = await supabase.from("clients").select("id, nom");
      const names: Record<string, string> = {};
      (cl ?? []).forEach((c: { id: string; nom: string }) => { names[c.id] = c.nom; });
      const byClient: Record<string, string[]> = {};
      for (const s of sales) { if (s.client_id && s.date) (byClient[s.client_id] ??= []).push(s.date); }
      const todayMs = Date.now();
      const rel: { id: string; nom: string; days: number; freq: number }[] = [];
      for (const [cid, dates] of Object.entries(byClient)) {
        if (dates.length < 2) continue;
        const sorted = [...dates].sort();
        const first = new Date(sorted[0]).getTime();
        const last = new Date(sorted[sorted.length - 1]).getTime();
        const freq = (last - first) / (86400000 * (sorted.length - 1));
        if (!(freq > 0)) continue;
        const daysSince = Math.round((todayMs - last) / 86400000);
        if (daysSince > freq * 1.2 && daysSince >= 7) rel.push({ id: cid, nom: names[cid] ?? "Client", days: daysSince, freq: Math.round(freq) });
      }
      rel.sort((a, b) => (b.days / b.freq) - (a.days / a.freq));
      setRelances(rel.slice(0, 6));

      setStats({
        totalVentes, totalClients: r1.count ?? 0, totalProduits: r2.count ?? 0,
        stockFaible: stockFaible?.length ?? 0, benefice, coutMarchandise,
        toRecommend, unpaid, encaisseJour, encaisseSemaine,
      });
    }
    load();
  }, []);

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
  }

  const cards = [
    { label: t("totalSales"), value: `${stats.totalVentes.toFixed(0)} ${t("moroccanDirham")}`, icon: TrendingUp, color: "bg-sky-500/15 text-sky-400", href: "/ventes" },
    { label: t("totalClients"), value: stats.totalClients, icon: Users, color: "bg-violet-500/15 text-violet-400", href: "/clients" },
    { label: t("totalProducts"), value: stats.totalProduits, icon: Package, color: "bg-teal-500/15 text-teal-400", href: "/produits" },
    { label: t("lowStock"), value: stats.stockFaible, icon: AlertTriangle, color: "bg-amber-500/15 text-amber-400", href: "/reappro" },
  ];

  return (
    <div>
      {/* Alertes utiles (cliquables) */}
      {(stats.toRecommend > 0 || stats.unpaid > 0 || pendingOffline > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {stats.toRecommend > 0 && (
            <button onClick={() => router.push("/reappro")} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors">
              <ClipboardList size={15} /> {stats.toRecommend} à recommander
            </button>
          )}
          {stats.unpaid > 0 && (
            <button onClick={() => router.push("/rappels")} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-colors">
              <AlertTriangle size={15} /> {stats.unpaid} vente(s) impayée(s)
            </button>
          )}
          {pendingOffline > 0 && (
            <button onClick={() => router.push("/ventes")} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/25 transition-colors">
              <CloudOff size={15} /> {pendingOffline} à synchroniser
            </button>
          )}
        </div>
      )}

      {/* HERO : carrousel + recherche */}
      <div className="relative rounded-2xl overflow-hidden mb-6 min-h-[190px] md:min-h-[240px] flex items-center">
        {HERO.map((id, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={id}
            src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`}
            alt="Atelier automobile"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === idx ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />

        <div className="relative w-full px-6 md:px-10 py-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-500 text-[10px] font-semibold tracking-[0.25em] uppercase">Pièces &amp; Filtres Auto · Maroc</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">{t("appName")}</h1>
          <p className="hidden md:block text-slate-300 text-sm mt-1.5 mb-4 max-w-lg">
            Trouvez le bon filtre en quelques secondes — par référence, véhicule ou marque.
          </p>
          <div className="md:hidden mb-3" />

          {/* Barre de recherche */}
          <form onSubmit={go} className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value.toUpperCase())}
                placeholder="Référence (ex: OP540, AP082, K1175…)"
                className="w-full bg-white/10 backdrop-blur border border-white/20 text-white placeholder-slate-400 rounded-xl ps-10 pe-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="flex gap-2 items-stretch">
              <VoiceButton className="w-12 rounded-xl" onResult={(txt) => { setQ(txt.toUpperCase()); router.push(`/recherche?q=${encodeURIComponent(txt.trim())}`); }} />
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/40">
                <Search size={18} /> Rechercher
              </button>
            </div>
          </form>

          {/* Accès rapides */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => router.push("/recherche?tab=vehicule")} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              <Car size={15} /> {t("tabByVehicle")}
            </button>
            <button onClick={() => router.push("/recherche?tab=vehicule")} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              <Tag size={15} /> {t("make")}
            </button>
          </div>

          {/* Indicateurs carrousel */}
          <div className="flex gap-1.5 mt-3">
            {HERO.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-red-500" : "w-1.5 bg-white/40"}`} aria-label={`image ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>

      {dbError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono">{dbError}</div>}

      {/* Raccourcis rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: t("addSale"), icon: ShoppingCart, href: "/ventes", color: "bg-blue-500/15 text-blue-400" },
          { label: t("suppliers"), icon: Truck, href: "/fournisseurs", color: "bg-violet-500/15 text-violet-400" },
          { label: t("reorder"), icon: ClipboardList, href: "/reappro", color: "bg-amber-500/15 text-amber-400" },
          { label: t("tours"), icon: MapPin, href: "/tournees", color: "bg-emerald-500/15 text-emerald-400" },
        ].map((s) => (
          <button key={s.href} onClick={() => router.push(s.href)} className="card p-4 flex items-center gap-3 text-left hover:-translate-y-0.5">
            <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${s.color}`}><s.icon size={20} /></div>
            <span className="font-semibold text-slate-100 text-sm">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <button key={c.label} onClick={() => router.push(c.href)} className="card p-5 hover:-translate-y-0.5 flex items-center gap-4 text-left w-full">
            <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center ${c.color}`}>
              <c.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium truncate">{c.label}</p>
              <p className="text-xl font-bold text-slate-100 mt-0.5">{c.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Encaissé / Dû fournisseur / Bénéfice — masqués, révélés au clic */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <button onClick={() => setShowMoney(m => ({ ...m, e: !m.e }))} className="card p-4 flex items-center gap-3 text-left hover:-translate-y-0.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center"><Banknote size={20} /></div>
          <div className="min-w-0">
            <h3 className="text-xs font-medium text-slate-400">Encaissé</h3>
            {showMoney.e
              ? <p className="text-base md:text-xl font-bold text-sky-400 mt-0.5 leading-tight">{stats.encaisseJour.toFixed(0)} <span className="text-xs font-normal text-slate-500">aujourd&apos;hui</span><br /><span className="text-xs text-slate-400">{stats.encaisseSemaine.toFixed(0)} MAD / 7j</span></p>
              : <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><Eye size={13} /> Afficher</p>}
          </div>
        </button>
        <button onClick={() => setShowMoney(m => ({ ...m, f: !m.f }))} className="card p-4 flex items-center gap-3 text-left hover:-translate-y-0.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center"><Wallet size={20} /></div>
          <div className="min-w-0">
            <h3 className="text-xs font-medium text-slate-400">Coût marchandise</h3>
            {showMoney.f
              ? <p className="text-lg md:text-2xl font-bold text-orange-400 mt-0.5">{stats.coutMarchandise.toFixed(2)} {t("moroccanDirham")}</p>
              : <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><Eye size={13} /> Afficher</p>}
          </div>
        </button>
        <button onClick={() => setShowMoney(m => ({ ...m, b: !m.b }))} className="card p-4 flex items-center gap-3 text-left hover:-translate-y-0.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><TrendingUp size={20} /></div>
          <div className="min-w-0">
            <h3 className="text-xs font-medium text-slate-400">{t("profit")}</h3>
            {showMoney.b
              ? <p className="text-lg md:text-2xl font-bold text-emerald-400 mt-0.5">{stats.benefice.toFixed(2)} {t("moroccanDirham")}</p>
              : <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><Eye size={13} /> Afficher</p>}
          </div>
        </button>
      </div>

      {/* Garages à relancer (réassort) */}
      {relances.length > 0 && (
        <div className="card p-5 mt-6">
          <h3 className="font-semibold text-slate-200 mb-1 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> À relancer (réassort)</h3>
          <p className="text-xs text-slate-500 mb-3">Garages qui n'ont pas commandé depuis plus longtemps que d'habitude.</p>
          <div className="space-y-2">
            {relances.map(r => (
              <button key={r.id} onClick={() => router.push("/clients")} className="w-full flex items-center justify-between gap-2 text-sm bg-[var(--surface-2)] rounded-lg px-3 py-2 hover:bg-slate-800 text-left">
                <span className="text-slate-200 font-medium truncate">{r.nom}</span>
                <span className="text-xs text-slate-400 shrink-0">il y a {r.days} j · ~tous les {r.freq} j</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vitrine (marques + atouts + avis) — repliée par défaut */}
      <div className="mt-6">
        <button onClick={() => setShowVitrine(v => !v)} className="w-full card p-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-slate-100">
          Découvrir FiltroPro {showVitrine ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showVitrine && (
          <div className="mt-4 space-y-4">
            {/* Bandeau grandes marques */}
            <div className="card p-3 overflow-hidden">
              <p className="text-[11px] text-slate-500 font-semibold tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-red-500" /> Grandes marques compatibles
              </p>
              <div className="relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-[var(--surface)] to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-[var(--surface)] to-transparent pointer-events-none" />
                <div className="flex gap-4 animate-marquee w-max">
                  {[...BRANDS, ...BRANDS].map((b, i) => (
                    <BrandLogo key={i} name={b.name} slug={b.slug} color={b.color} />
                  ))}
                </div>
              </div>
            </div>

            {/* Atouts / garanties */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="card p-3 flex items-center gap-2.5">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center"><f.icon size={16} /></div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-100 text-xs tracking-wide truncate">{f.title}</h4>
                    <p className="text-[10px] text-slate-500 truncate">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Avis clients */}
            <div>
              <h3 className="text-center font-semibold text-slate-300 text-sm mb-3">Avis clients</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {REVIEWS.map((r) => (
                  <div key={r.name} className="card p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-6 w-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px]">{r.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">{r.name} <span className="text-slate-500 font-normal">· {r.city}</span></div>
                      </div>
                      <div className="flex gap-0.5 text-red-500">
                        {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                      </div>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-400 italic line-clamp-2">“{r.text}”</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-3">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-secondary inline-flex items-center gap-2">
          <ArrowUp size={15} /> Retour en haut
        </button>
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-bold text-slate-200">{t("appName")}</span>
        </div>
        <p className="text-xs text-slate-500">Pièces &amp; Filtres Auto · Maroc — © 2026</p>
      </footer>
    </div>
  );
}
