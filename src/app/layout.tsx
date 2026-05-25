import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/context/LangContext";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Gestion Filtres | إدارة الفلاتر",
  description: "Gestion des filtres et pièces auto au Maroc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <LangProvider>
          <Sidebar />
          <main className="ms-56 min-h-screen p-6">
            {children}
          </main>
        </LangProvider>
      </body>
    </html>
  );
}
