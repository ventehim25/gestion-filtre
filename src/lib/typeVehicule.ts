"use client";
// Mode de l'appli : voitures ou camions (products.vehicule, BIBLE §8.37). UN SEUL choix pour toute l'appli (demande de
// l'utilisateur : « ventes, stock, produits, recherche, VIN… affichent le mode sélectionné ») : bandeau du haut (Header)
// + gros boutons dans Vente / Réception. Les camions ne sont pas vendus aujourd'hui → « voiture » par défaut ; le choix
// est gardé sur l'appareil, et toutes les pages ouvertes suivent un changement (évènement « filtropro-type-vehicule »).
import { useEffect, useRef, useState } from "react";

export type TypeVehicule = "voiture" | "camion";
const CLE = "filtropro_type_vehicule";
const EVT = "filtropro-type-vehicule";

export function lireTypeVehicule(): TypeVehicule {
  try { return localStorage.getItem(CLE) === "camion" ? "camion" : "voiture"; } catch { return "voiture"; }
}

export function choisirTypeVehicule(t: TypeVehicule) {
  try { localStorage.setItem(CLE, t); } catch { /* navigation privée : choix non gardé */ }
  window.dispatchEvent(new Event(EVT));
}

/** Le mode courant ; se met à jour quand il change ailleurs (autre composant, autre onglet). */
export function useTypeVehicule(): [TypeVehicule, (t: TypeVehicule) => void] {
  const [type, setType] = useState<TypeVehicule>("voiture");
  useEffect(() => {
    const maj = () => setType(lireTypeVehicule());
    maj();
    window.addEventListener(EVT, maj);
    window.addEventListener("storage", maj);
    return () => { window.removeEventListener(EVT, maj); window.removeEventListener("storage", maj); };
  }, []);
  return [type, choisirTypeVehicule];
}

/** Une fiche (ou une ligne avec products) est-elle du mode courant ? Sans étiquette = voiture. */
export const duType = (vehicule: string | null | undefined, type: TypeVehicule) => (vehicule ?? "voiture") === type;

/** Appelle cb(type) quand le mode change APRÈS le premier affichage (le premier chargement lit déjà lireTypeVehicule()). */
export function useChangementType(type: TypeVehicule, cb: (t: TypeVehicule) => void) {
  const dernier = useRef<TypeVehicule | null>(null);
  useEffect(() => {
    if (dernier.current === null) { dernier.current = lireTypeVehicule(); return; }
    if (dernier.current !== type) { dernier.current = type; cb(type); }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
}
