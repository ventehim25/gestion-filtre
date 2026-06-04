"use client";
import { useEffect } from "react";

// Enregistre le service worker (PWA / hors-ligne). Sans effet en dev.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
