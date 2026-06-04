"use client";
import { useRef, useState } from "react";
import { Mic } from "lucide-react";

// Bouton de recherche vocale (Web Speech API) avec retour visuel clair :
// indicateur "écoute en cours" + texte capté en direct + messages d'erreur lisibles.
// NB : la reconnaissance vocale du navigateur a besoin d'INTERNET (serveur Google).
export default function VoiceButton({ onResult, lang = "fr-FR", className = "" }:
  { onResult: (text: string) => void; lang?: string; className?: string }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  function toast(m: string) { setMsg(m); window.setTimeout(() => setMsg(null), 4000); }

  function start() {
    if (!SR) {
      toast("Recherche vocale non disponible sur ce navigateur — utilise Google Chrome (Android) ou Safari (iPhone).");
      return;
    }
    try {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = lang;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onstart = () => { setListening(true); setInterim(""); };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        let fin = "", itp = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) fin += r[0].transcript; else itp += r[0].transcript;
        }
        if (itp) setInterim(itp);
        if (fin) { setInterim(fin); onResult(fin.trim()); }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (e: any) => {
        const map: Record<string, string> = {
          "not-allowed": "Micro refusé. Autorise le microphone pour ce site (icône 🔒 dans la barre d'adresse).",
          "service-not-allowed": "Micro non autorisé par le navigateur.",
          "no-speech": "Je n'ai rien entendu — réessaie en parlant plus près.",
          "audio-capture": "Aucun micro détecté sur l'appareil.",
          "network": "Pas de connexion : la reconnaissance vocale a besoin d'internet.",
          "aborted": "",
        };
        const m = map[e?.error] ?? ("Erreur vocale : " + (e?.error || "inconnue"));
        if (m) toast(m);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      rec.start();
    } catch {
      toast("Impossible de démarrer le micro.");
      setListening(false);
    }
  }
  function stop() { try { recRef.current?.stop?.(); } catch { /* */ } setListening(false); }

  return (
    <>
      <button type="button" onClick={listening ? stop : start} title="Recherche vocale"
        className={`flex items-center justify-center rounded-lg shrink-0 transition-colors ${
          listening ? "bg-red-600 text-white animate-pulse" : "btn-secondary"} ${className || "h-9 w-9"}`}>
        <Mic size={16} />
      </button>

      {/* Indicateur d'écoute + texte capté en direct */}
      {listening && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900 border border-red-500/60 text-white rounded-full px-5 py-3 shadow-2xl max-w-[90vw]">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
          </span>
          <span className="text-sm truncate">🎤 Parlez maintenant… {interim && <span className="text-slate-300 italic">« {interim} »</span>}</span>
        </div>
      )}

      {/* Message d'erreur / info */}
      {msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-yellow-500/60 text-yellow-300 rounded-xl px-4 py-3 shadow-2xl text-sm max-w-[90vw] text-center">
          {msg}
        </div>
      )}
    </>
  );
}
