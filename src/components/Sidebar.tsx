"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/context/LangContext";
import { LayoutDashboard, Package, Users, ShoppingCart, MapPin, Settings, Menu, X, AlertCircle, BarChart2, Car, Boxes, FileText, ClipboardList, Barcode, Truck, Target, Wallet, CalendarClock, Receipt, ClipboardCheck, CarFront, Landmark, UserCog, ChevronDown, ChevronUp } from "lucide-react";
import { estPagePatron, useRole } from "@/lib/role";
import Logo from "@/components/Logo";
import clsx from "clsx";
import { useEffect, useState } from "react";

// Menu simplifié (22/11/2026, demande : « retire Saisie stock et ce qui n'est pas utile pour que ce soit plus facile ») —
// BIBLE §8.52. Rien n'est supprimé : en haut ce qui sert tous les jours, le reste sous « Plus… » (replié).
// « Saisie stock » (/stock) n'est plus dans le menu : le stock bouge par Réception / Vente / Retour, et se corrige dans
// Inventaire (avec un motif) ; la page reste joignable par son adresse.
const navItems = [
  { href: "/", icon: LayoutDashboard, key: "dashboard" as const },
  { href: "/recherche", icon: Car, key: "vehicleSearch" as const },
  { href: "/ventes", icon: ShoppingCart, key: "sales" as const },
  { href: "/fournisseurs", icon: Truck, key: "suppliers" as const },
  { href: "/mon-stock", icon: Boxes, key: "myStock" as const },
  { href: "/clients", icon: Users, key: "clients" as const },
  { href: "/caisse", icon: Wallet, key: "cash" as const },
  { href: "/voiture", icon: CarFront, key: "vanStock" as const },
  { href: "/tournees", icon: MapPin, key: "tours" as const },
];
const navPlus = [
  { href: "/produits", icon: Package, key: "products" as const },
  { href: "/reappro", icon: ClipboardList, key: "reorder" as const },
  { href: "/etiquettes", icon: Barcode, key: "labels" as const },
  { href: "/catalogues", icon: FileText, key: "catalogues" as const },
  { href: "/commandes", icon: ClipboardList, key: "orders" as const },
  { href: "/rappels", icon: AlertCircle, key: "reminders" as const },
  { href: "/echeancier", icon: CalendarClock, key: "schedule" as const },
  { href: "/factures", icon: Receipt, key: "invoices" as const },
  { href: "/inventaire", icon: ClipboardCheck, key: "inventory" as const },
  { href: "/banque", icon: Landmark, key: "bank" as const },
  { href: "/equipe", icon: UserCog, key: "team" as const },
  { href: "/stats", icon: BarChart2, key: "stats" as const },
  { href: "/prospects", icon: Target, key: "prospects" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, isRtl } = useLang();
  const [open, setOpen] = useState(false);
  const role = useRole(); // vendeur : pages du patron cachées (BIBLE §8.41 n° 8)
  // « Plus… » : ouvert si on est sur une de ces pages, sinon comme la dernière fois (gardé sur l'appareil)
  const [plus, setPlus] = useState(false);
  useEffect(() => {
    let garde = false; try { garde = localStorage.getItem("fp_menu_plus") === "1"; } catch { /* rien */ }
    setPlus(garde || navPlus.some(({ href }) => pathname === href || pathname.startsWith(href + "/")));
  }, [pathname]);
  const basculerPlus = () => setPlus((v) => { try { localStorage.setItem("fp_menu_plus", v ? "0" : "1"); } catch { /* rien */ } return !v; });
  const visible = ({ href }: { href: string }) => role === "admin" || !estPagePatron(href);
  const lien = ({ href, icon: Icon, key }: (typeof navItems)[number] | (typeof navPlus)[number]) => (
    <Link key={href} href={href} onClick={() => setOpen(false)}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
        pathname === href
          ? "bg-red-600 text-white shadow-lg shadow-red-950/50 font-medium"
          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
      )}>
      <Icon size={18} />
      <span>{t(key)}</span>
    </Link>
  );

  const nav = (
    <>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={40} className="drop-shadow-lg" />
          <div>
            <h1 className="font-bold text-base text-white leading-tight">{t("appName")}</h1>
            <p className="text-[10px] text-slate-400 tracking-[0.15em] uppercase mt-0.5">Pièces Auto · Maroc</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        {navItems.filter(visible).map(lien)}
        {navPlus.some(visible) && (
          <button type="button" onClick={basculerPlus}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300">
            {plus ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Plus…
          </button>
        )}
        {plus && navPlus.filter(visible).map(lien)}
      </nav>
      <div className={clsx("p-3 border-t border-slate-700", role !== "admin" && "hidden")}>
        <Link href="/parametres" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
          <Settings size={18} />
          <span>{t("settings")}</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-gradient-to-r from-slate-900 to-slate-950 flex items-center px-4 py-3 border-b border-slate-800">
        <button onClick={() => setOpen(true)} className="text-white me-3"><Menu size={22} /></button>
        <Logo size={28} className="me-2" />
        <h1 className="font-bold text-white">{t("appName")}</h1>
      </div>

      {/* Mobile overlay */}
      {open && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setOpen(false)} />}

      {/* Mobile drawer */}
      <aside className={clsx(
        "md:hidden fixed top-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col z-40 transition-transform duration-200",
        isRtl ? "right-0" : "left-0",
        open ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"
      )}>{nav}</aside>

      {/* Desktop sidebar */}
      <aside className={clsx(
        "hidden md:flex fixed top-0 h-full w-56 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex-col z-10",
        isRtl ? "right-0" : "left-0"
      )}>{nav}</aside>
    </>
  );
}
