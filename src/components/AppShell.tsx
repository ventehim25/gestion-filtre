"use client";
// Coquille de l'app : le catalogue public /c/ (Bible §4.8) s'affiche SANS le menu
// de gestion — page propre pour Google et les visiteurs.
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import AuthGate from "@/components/AuthGate";
import { estPagePatron, useRole } from "@/lib/role";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = useRole();
  // Pages client-facing (sans menu de gestion) : catalogue public /c/ et tarifs privés /tarif
  const isPublic = pathname === "/c" || pathname.startsWith("/c/") || pathname === "/tarif" || pathname === "/catalogue";
  if (isPublic) return <main className="min-h-screen">{children}</main>;
  // Pages de gestion : connexion obligatoire une fois supabase/securite.sql lancé (voir AuthGate)
  return (
    <>
      <ServiceWorkerRegister />
      <AuthGate>
        <InstallPrompt />
        <Sidebar />
        <main className="md:ms-56 min-h-screen p-4 md:p-6 pt-16 md:pt-6">
          {role === "vendeur" && estPagePatron(pathname)
            ? <div className="card p-6 text-center text-slate-300 mt-10">🔒 Page réservée au patron.<br /><span className="text-xs text-slate-500">Demande-lui si tu as besoin de cette information.</span></div>
            : children}
        </main>
      </AuthGate>
    </>
  );
}
