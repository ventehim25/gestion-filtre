"use client";
import { useEffect } from "react";

// Enregistre le service worker (PWA / hors-ligne) ET gère les mises à jour
// automatiques : vérifie les nouvelles versions à l'ouverture, au retour sur
// l'app et toutes les minutes ; quand une mise à jour est prête, recharge tout seul.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let reloaded = false;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Vérifie une mise à jour maintenant, au retour sur l'onglet, et chaque minute
      const check = () => reg.update().catch(() => {});
      check();
      const interval = setInterval(check, 60 * 1000);
      const onVisible = () => { if (document.visibilityState === "visible") check(); };
      document.addEventListener("visibilitychange", onVisible);

      // Quand une nouvelle version est installée (et qu'une version tournait déjà),
      // on l'active et on recharge automatiquement.
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller && !reloaded) {
            reloaded = true;
            window.location.reload();
          }
        });
      });

      // Nettoyage (au cas où le composant est démonté)
      return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
    }).catch(() => {});
  }, []);

  return null;
}
