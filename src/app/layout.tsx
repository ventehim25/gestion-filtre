import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/context/LangContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "FiltroPro — Pièces & Filtres Auto · Maroc",
  description: "Plateforme professionnelle de gestion de filtres et pièces auto au Maroc — stock, ventes, clients, recherche par référence et véhicule.",
  manifest: "/manifest.json",
  applicationName: "FiltroPro",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FiltroPro" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <LangProvider>
          <AppShell>{children}</AppShell>
        </LangProvider>
      </body>
    </html>
  );
}
