"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/tournee";

// Petite carte pour poser/corriger la position exacte d'un client :
// clic sur la carte = place le repère ; le repère se déplace au doigt.
const pin = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#ef4444;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

export default function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!boxRef.current) return;
    const map = L.map(boxRef.current, { center: value ? [value.lat, value.lng] : [35.6, -5.6], zoom: value ? 17 : 9 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suit la valeur (position GPS, lien collé, clic) : repère + recentrage
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (!markerRef.current) {
      markerRef.current = L.marker([value.lat, value.lng], { icon: pin, draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 17));
  }, [value]);

  return <div ref={boxRef} className="w-full h-56 rounded-lg overflow-hidden" />;
}
