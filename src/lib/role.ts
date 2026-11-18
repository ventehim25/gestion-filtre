"use client";
// Rôles (nouveauté n° 8, BIBLE §8.41) : « admin » = le patron (tout), « vendeur » = vend sans voir les prix d'achat,
// les bénéfices, la caisse, les fournisseurs ni l'équipe. Le rôle vient de la base (fonction mon_role, liste
// utilisateurs_autorises) et est gardé sur le téléphone pour marcher hors-ligne.
// ⚠ C'est un masquage dans l'appli : la base protège l'accès à l'équipe, pas encore chaque colonne de prix.
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Role = "admin" | "vendeur";
const CLE = "fp_role";
const lire = (): Role => { try { return localStorage.getItem(CLE) === "vendeur" ? "vendeur" : "admin"; } catch { return "admin"; } };

/** Pages réservées au patron. */
export const PAGES_PATRON = ["/stats", "/fournisseurs", "/caisse", "/echeancier", "/inventaire", "/parametres", "/equipe", "/banque"];
export const estPagePatron = (chemin: string) => PAGES_PATRON.some((p) => chemin === p || chemin.startsWith(p + "/"));

let promesse: Promise<Role> | null = null;
function demander(): Promise<Role> {
  promesse ??= (async () => {
    const { data, error } = await supabase.rpc("mon_role");
    if (error) return lire(); // hors-ligne ou fonction absente : dernier rôle connu
    const r: Role = data === "vendeur" ? "vendeur" : "admin";
    const change = r !== lire();
    try { localStorage.setItem(CLE, r); } catch { /* rien */ }
    if (change) window.dispatchEvent(new Event("filtropro-role"));
    return r;
  })();
  return promesse;
}

export function useRole(): Role {
  const [role, setRole] = useState<Role>("admin");
  useEffect(() => {
    setRole(lire());
    demander().then(setRole).catch(() => {});
    const maj = () => setRole(lire());
    window.addEventListener("filtropro-role", maj);
    return () => window.removeEventListener("filtropro-role", maj);
  }, []);
  return role;
}
