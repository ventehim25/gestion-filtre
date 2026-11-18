"use client";
// « = Filtron AP085/1 » à côté d'une référence ajoutée à la main (ex. boîte Flag 5801317097, numéro d'origine IVECO) :
// demande de l'utilisateur « afficher dans l'historique ou la vente la référence Filtron à côté de la référence ajoutée,
// pour connaître le filtre » (BIBLE §8.39). Seulement pour les filtres qui ne sont pas déjà des fiches Filtron.
import { useEffect, useState } from "react";
import type { Product } from "@/types/database";
import { familleDe } from "@/lib/categories";
import { filtronDeReference } from "@/lib/origine";

type Fiche = Pick<Product, "id" | "reference" | "marque" | "categorie">;

export default function FiltronDe({ produit, className = "" }: { produit?: Fiche | null; className?: string }) {
  const [filtron, setFiltron] = useState<string | null>(null);
  useEffect(() => {
    setFiltron(null);
    if (!produit || (produit.marque ?? "Filtron") === "Filtron" || familleDe(produit.categorie) !== "filtres_huile") return;
    let actif = true;
    filtronDeReference(produit.reference, produit.id).then((r) => { if (actif) setFiltron(r); }).catch(() => {});
    return () => { actif = false; };
  }, [produit?.id, produit?.reference]); // eslint-disable-line react-hooks/exhaustive-deps
  return filtron ? <span className={`text-[11px] text-amber-300 ${className}`}>{produit?.reference} = {filtron}</span> : null;
}
