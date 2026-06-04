"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Garage } from "@/types/database";
import { STATUT_INFO, KENITRA, type LatLng } from "@/lib/tournee";

type Props = {
  garages: Garage[];
  base?: LatLng;
  routeLine?: LatLng[];           // polyligne du circuit affiché
  orderMap?: Record<string, number>; // id garage -> numéro d'ordre (badge)
  adding?: boolean;               // mode "clic = ajouter un point"
  focusId?: string | null;        // centrer la carte sur ce garage
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (g: Garage) => void;
};

function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:#fff;font-size:12px;font-weight:700;line-height:1;">${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

const baseIcon = L.divIcon({
  className: "",
  html: `<div style="background:#0a0b10;width:30px;height:30px;border-radius:50%;border:2px solid #ef4444;box-shadow:0 2px 5px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-size:15px;">🏠</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export default function GarageMap({
  garages, base = KENITRA, routeLine, orderMap, adding, focusId,
  onMapClick, onMarkerClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  // Refs pour garder les callbacks/flags à jour sans réinitialiser la carte.
  const cbRef = useRef({ adding, onMapClick, onMarkerClick });
  cbRef.current = { adding, onMapClick, onMarkerClick };

  // Init carte (une seule fois)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [33.6, -7.4], zoom: 7, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    routeRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (cbRef.current.adding) cbRef.current.onMapClick?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Curseur "crosshair" en mode ajout
  useEffect(() => {
    if (containerRef.current) containerRef.current.style.cursor = adding ? "crosshair" : "";
  }, [adding]);

  // Rendu des marqueurs (garages + base)
  useEffect(() => {
    const grp = markersRef.current;
    if (!grp) return;
    grp.clearLayers();

    L.marker([base.lat, base.lng], { icon: baseIcon, zIndexOffset: 1000 })
      .bindTooltip(base.nom ?? "Base", { direction: "top" })
      .addTo(grp);

    for (const g of garages) {
      if (typeof g.latitude !== "number" || typeof g.longitude !== "number") continue;
      const info = STATUT_INFO[g.statut] ?? STATUT_INFO.a_livrer;
      const order = orderMap?.[g.id];
      const m = L.marker([g.latitude, g.longitude], {
        icon: pinIcon(info.color, order != null ? String(order) : ""),
      });
      m.bindTooltip(`${order != null ? order + ". " : ""}${g.nom}`, { direction: "top" });
      m.on("click", () => cbRef.current.onMarkerClick?.(g));
      m.addTo(grp);
    }
  }, [garages, orderMap, base]);

  // Rendu de la polyligne du circuit
  useEffect(() => {
    const grp = routeRef.current;
    if (!grp) return;
    grp.clearLayers();
    if (routeLine && routeLine.length >= 2) {
      const pts = routeLine.map((p) => [p.lat, p.lng]) as [number, number][];
      L.polyline(pts, { color: "#ef4444", weight: 3, opacity: 0.75, dashArray: "1,8", lineCap: "round" }).addTo(grp);
    }
  }, [routeLine]);

  // Recentrage
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusId) {
      const g = garages.find((x) => x.id === focusId);
      if (g) { map.flyTo([g.latitude, g.longitude], 13, { duration: 0.6 }); return; }
    }
  }, [focusId, garages]);

  // Ajuste la vue aux garages au premier chargement de données
  const fittedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || garages.length === 0) return;
    const pts = garages
      .filter((g) => typeof g.latitude === "number")
      .map((g) => [g.latitude, g.longitude]) as [number, number][];
    pts.push([base.lat, base.lng]);
    if (pts.length >= 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.2));
      fittedRef.current = true;
    }
  }, [garages, base]);

  return <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden z-0" />;
}
