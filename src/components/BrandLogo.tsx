"use client";
import { useState } from "react";

// Affiche le vrai logo /public/logos/{slug}.png si présent, sinon le nom en couleur de marque.
export default function BrandLogo({ name, slug, color }: { name: string; slug: string; color: string }) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="h-16 w-36 shrink-0 rounded-xl flex items-center justify-center px-4 border border-slate-200 shadow-md"
      style={{ backgroundColor: "#ffffff" }}
    >
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/logos/${slug}.png`}
          alt={name}
          onError={() => setErr(true)}
          className="max-h-9 max-w-[112px] object-contain"
        />
      ) : (
        <span style={{ color }} className="font-extrabold italic tracking-wide text-[15px] whitespace-nowrap">
          {name}
        </span>
      )}
    </div>
  );
}
