"use client";
import { Wind, Fuel, Car, Snowflake, Ellipsis, Droplet, Link, Infinity as Boucle, Droplets, Package, PackagePlus, Boxes, Repeat, Disc, Disc3, Filter, Nut, Wrench, MoveVertical, Spline, Cog, Compass, CircleDot, RectangleHorizontal, Disc2, Pipette, Drum, Cable, Torus, Joystick, Settings2, BatteryFull, Zap, Power, PlugZap, BatteryCharging, Brush, Lightbulb, AppWindow, Lock, ChevronsUpDown, SlidersHorizontal, Plug, type LucideProps } from "lucide-react";

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
  filtration_autre: Filter,
  accessoires_vidange: Nut,
  outils_vidange: Wrench,
  kit_distribution: Package,
  kit_distribution_pompe: PackagePlus,
  courroie_distribution: Boucle,
  galet_distribution: Disc,
  chaine_distribution: Link,
  pompe_eau: Droplets,
  kit_courroie_accessoire: Boxes,
  courroie_accessoire: Repeat,
  poulie: Disc3,
  plaquette_frein: RectangleHorizontal,
  disque_frein: Disc2,
  frein_hydraulique: Pipette,
  frein_tambour: Drum,
  capteur_cable_frein: Cable,
  kit_embrayage: Torus,
  accessoire_boite: Joystick,
  embrayage_autre: Settings2,
  batterie: BatteryFull,
  alternateur: Zap,
  demarreur: Power,
  outil_batterie: PlugZap,
  alterno_demarreur: BatteryCharging,
  essuie_glace: Brush,
  essuyage_phares: Lightbulb,
  leve_vitre: AppWindow,
  serrure: Lock,
  verin: ChevronsUpDown,
  commande_pedalier: SlidersHorizontal,
  electricite_habitacle: Plug,
  amortisseur: MoveVertical,
  suspension_essieu: Spline,
  transmission: Cog,
  rotule_direction: Compass,
  moyeu_roulement: CircleDot,
  autre: Ellipsis,
};

export default function CategoryIcon({
  categorie, size = 16, className,
}: { categorie: string; size?: number; className?: string }) {
  const Icon = MAP[categorie] ?? Ellipsis;
  return <Icon size={size} className={className} />;
}
