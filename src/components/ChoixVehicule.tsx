"use client";
// Deux gros boutons côte à côte « 🚗 Voitures | 🚛 Camions » (idée de l'utilisateur, comme les grands sites de pièces).
// Ne charge que les fiches du type choisi : appli plus légère (BIBLE §8.37).
import { Car, Truck } from "lucide-react";
import { useLang } from "@/context/LangContext";
import type { TypeVehicule } from "@/lib/typeVehicule";

export default function ChoixVehicule({ value, onChange, className = "" }: { value: TypeVehicule; onChange: (t: TypeVehicule) => void; className?: string }) {
  const { t } = useLang();
  const choix = [
    { v: "voiture" as const, label: t("vehCar"), Icone: Car },
    { v: "camion" as const, label: t("vehTruck"), Icone: Truck },
  ];
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`} role="group" aria-label="Type de véhicule">
      {choix.map(({ v, label, Icone }) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            value === v ? "bg-red-600 text-white shadow-lg shadow-red-950/40" : "btn-secondary"}`}>
          <Icone size={20} /> {label}
        </button>
      ))}
    </div>
  );
}
