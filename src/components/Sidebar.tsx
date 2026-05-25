"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/context/LangContext";
import { LayoutDashboard, Package, Users, ShoppingCart, MapPin, Settings } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", icon: LayoutDashboard, key: "dashboard" as const },
  { href: "/produits", icon: Package, key: "products" as const },
  { href: "/clients", icon: Users, key: "clients" as const },
  { href: "/ventes", icon: ShoppingCart, key: "sales" as const },
  { href: "/tournees", icon: MapPin, key: "tours" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, isRtl } = useLang();

  return (
    <aside className={clsx(
      "fixed top-0 h-full w-56 bg-slate-900 text-white flex flex-col z-10",
      isRtl ? "right-0" : "left-0"
    )}>
      <div className="p-5 border-b border-slate-700">
        <h1 className="font-bold text-lg text-blue-400">{t("appName")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">Maroc</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, icon: Icon, key }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              pathname === href
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon size={18} />
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <Link href="/parametres" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
          <Settings size={18} />
          <span>{t("settings")}</span>
        </Link>
      </div>
    </aside>
  );
}
