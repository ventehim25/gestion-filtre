"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import Logo from "@/components/Logo";

// Bannière d'installation PWA (Android / Chrome).
// Utilise l'événement natif `beforeinstallprompt` : le bouton "Installer" déclenche
// la vraie boîte de dialogue système qui pose l'icône sur l'écran d'accueil.
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "fp-install-dismissed";
const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000; // 2 jours

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Déjà installée ? (lancée en mode standalone)
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Récemment fermée ?
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed = Date.now() - dismissedAt < COOLDOWN_MS;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      if (!recentlyDismissed) setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferred(null);
    }
  }

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-3 inset-x-3 z-[60] md:left-auto md:right-4 md:w-96">
      <div className="card p-4 brand-gradient border border-red-500/30 shadow-2xl flex items-center gap-3">
        <div className="bg-black/30 rounded-xl p-1.5 shrink-0">
          <Logo size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">Installer FiltroPro</p>
          <p className="text-[11px] text-white/80 leading-tight mt-0.5">
            Ajoute l'app sur ton écran d'accueil — ouverture en un clic, même hors-ligne.
          </p>
        </div>
        <button
          onClick={install}
          className="bg-white text-red-700 font-semibold text-sm px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-red-50 transition-colors shrink-0"
        >
          <Download size={15} /> Installer
        </button>
        <button onClick={dismiss} className="text-white/70 hover:text-white shrink-0" aria-label="Fermer">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
