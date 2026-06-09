"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/context/LangContext";
import { LayoutDashboard, Package, Users, ShoppingCart, MapPin, Settings, Menu, X, AlertCircle, BarChart2, Car, Boxes, FileText, ClipboardList, Barcode, Truck } from "lucide-react";
import Logo from "@/components/Logo";
import clsx from "clsx";
import { useState } from "react";

const navItems = [
  { href: "/", icon: LayoutDashboard, key: "dashboard" as const },
  { href: "/recherche", icon: Car, key: "vehicleSearch" as const },
  { href: "/produits", icon: Package, key: "products" as const },
  { href: "/stock", icon: Boxes, key: "stockEntry" as const },
  { href: "/reappro", icon: ClipboardList, key: "reorder" as const },
  { href: "/fournisseurs", icon: Truck, key: "suppliers" as const },
  { href: "/etiquettes", icon: Barcode, key: "labels" as const },
  { href: "/catalogues", icon: FileText, key: "catalogues" as const },
  { href: "/clients", icon: Users, key: "clients" as const },
  { href: "/ventes", icon: ShoppingCart, key: "sales" as const },
  { href: "/rappels", icon: AlertCircle, key: "reminders" as const },
  { href: "/stats", icon: BarChart2, key: "stats" as const },
  { href: "/tournees", icon: MapPin, key: "tours" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, isRtl } = useLang();
  const [open, setOpen] = useState(false);

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
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, icon: Icon, key }) => (
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
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
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
