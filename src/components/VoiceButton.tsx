"use client";
import { useRef, useState } from "react";
import { Mic } from "lucide-react";

// Bouton de recherche vocale (Web Speech API). Mains libres — utile en voiture.
// Appelle onResult(texte) à la fin de la dictée. Se masque si non supporté.
export default function VoiceButton({ onResult, lang = "fr-FR", className = "" }:
  { onResult: (text: string) => void; lang?: string; className?: string }) {
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  if (!SR) return null; // navigateur non compatible -> on n'affiche rien

  function start() {
    try {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        const txt = e.results?.[0]?.[0]?.transcript ?? "";
        if (txt) onResult(txt.trim());
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      setListening(true);
      rec.start();
    } catch { setListening(false); }
  }
  function stop() { try { recRef.current?.stop?.(); } catch { /* */ } setListening(false); }

  return (
    <button type="button" onClick={listening ? stop : start} title="Recherche vocale"
      className={`flex items-center justify-center rounded-lg shrink-0 transition-colors ${
        listening ? "bg-red-600 text-white animate-pulse" : "btn-secondary"} ${className || "h-9 w-9"}`}>
      <Mic size={16} />
    </button>
  );
}
