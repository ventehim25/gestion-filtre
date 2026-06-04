"use client";
import { useState } from "react";
import { filterPhoto } from "@/lib/filterPhotos";
import { X } from "lucide-react";

// "OP540/1" -> "OP_540.1"  (nom d'asset Scene7 Filtron / MANN+HUMMEL)
function s7Name(ref: string) {
  const m = ref.toUpperCase().match(/^([A-Z]+)\s*(.+)$/);
  return m ? m[1] + "_" + m[2].replace(/\//g, ".") : ref.toUpperCase();
}
function s7(ref: string, suffix: string, wid: number) {
  return `https://s7g10.scene7.com/is/image/mannhummel/${s7Name(ref)}${suffix}?qlt=82&wid=${wid}`;
}
function bigger(src: string) {
  return src.replace(/([?&])wid=\d+/, "$1wid=1000").replace(/([?&])w=\d+/, "$1w=1000");
}

export default function FilterImage({
  reference, categorie, imageUrl, className, wid = 160, zoom = true,
}: { reference: string; categorie: string; imageUrl?: string | null; className?: string; wid?: number; zoom?: boolean }) {
  const candidates = [
    ...(imageUrl ? [`${imageUrl}?qlt=82&wid=${wid}`] : []),
    s7(reference, "-1", wid),
    s7(reference, "", wid),
    s7(reference, "-filter-with-box", wid),
    s7(reference, "-2", wid),
    s7(reference, "-3", wid),
    filterPhoto(categorie, wid),
  ];
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const src = candidates[i];

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={reference}
        loading="lazy"
        className={`${className ?? ""} ${zoom ? "cursor-zoom-in" : ""}`}
        onError={() => setI((p) => Math.min(p + 1, candidates.length - 1))}
        onClick={zoom ? () => setOpen(true) : undefined}
      />
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bigger(src)} alt={reference} className="max-h-[85vh] max-w-[90vw] rounded-xl bg-white p-3 object-contain shadow-2xl" />
            <button onClick={() => setOpen(false)} className="absolute -top-3 -right-3 bg-white text-black rounded-full p-1.5 shadow-lg hover:bg-slate-200">
              <X size={18} />
            </button>
            <div className="text-center text-white font-mono mt-3 text-sm">{reference}</div>
          </div>
        </div>
      )}
    </>
  );
}
