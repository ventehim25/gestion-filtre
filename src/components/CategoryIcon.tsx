"use client";
import { Wind, Fuel, Car, Snowflake, Ellipsis, Droplet, type LucideProps } from "lucide-react";

// Icône burette d'huile (style ligne, comme Filtron) — pas disponible dans lucide
function OilCan(props: LucideProps) {
  const { size = 24, className, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
      <path d="M3 18v-5h11l3 2h2" />
      <path d="M3 13l1.5-3H12l2 3" />
      <path d="M14 13l4-1 3 2" />
      <path d="M21 14c0 1.5-1 2.5-2 3.5" />
      <path d="M7 10V8h3v2" />
      <line x1="3" y1="18" x2="14" y2="18" />
    </svg>
  );
}

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  filtre_air: Wind,
  filtre_huile: OilCan,
  filtre_carburant: Fuel,
  filtre_habitacle: Car,
  filtre_refroidissement: Snowflake,
  huile_moteur: Droplet,
  autre: Ellipsis,
};

export default function CategoryIcon({
  categorie, size = 16, className,
}: { categorie: string; size?: number; className?: string }) {
  const Icon = MAP[categorie] ?? Ellipsis;
  return <Icon size={size} className={className} />;
}
