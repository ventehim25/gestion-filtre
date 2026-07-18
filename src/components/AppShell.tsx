"use client";
// Coquille de l'app : le catalogue public /c/ (Bible §4.8) s'affiche SANS le menu
// de gestion — page propre pour Google et les visiteurs.
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/c" || pathname.startsWith("/c/");
  if (isPublic) return <main className="min-h-screen">{children}</main>;
  return (
    <>
      <ServiceWorkerRegister />
      <InstallPrompt />
      <Sidebar />
      <main className="md:ms-56 min-h-screen p-4 md:p-6 pt-16 md:pt-6">
        {children}
      </main>
    </>
  );
}
