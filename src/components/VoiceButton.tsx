"use client";
import { useRef, useState } from "react";
import { Mic } from "lucide-react";

// Recherche vocale (Web Speech API) avec retour visuel fort + demande explicite
// d'autorisation micro + messages d'erreur lisibles.
// NB : la reconnaissance vocale du navigateur a besoin d'INTERNET et ne marche
// PAS dans une app installée sur iPhone (uniquement dans Safari).
export default function VoiceButton({ onResult, lang = "fr-FR", className = "" }:
  { onResult: (text: string) => void; lang?: string; className?: string }) {
  const [phase, setPhase] = useState<"idle" | "starting" | "listening">("idle");
  const [interim, setInterim] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  function toast(m: string) { setMsg(m); window.setTimeout(() => setMsg(null), 5000); }

  // Détecte le mode "app installée" sur iOS (où la voix ne marche pas)
  function isStandaloneIOS() {
    if (typeof window === "undefined") return false;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const standalone = (window.navigator as any).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
    return ios && standalone;
  }

  async function start() {
    setPhase("starting");
    if (!SR) {
      setPhase("idle");
      toast(isStandaloneIOS()
        ? "Sur iPhone, la voix marche dans Safari (pas dans l'app installée). Ouvre le site dans Safari."
        : "Recherche vocale non disponible sur ce navigateur — utilise Google Chrome.");
      return;
    }
    // Demande explicite d'autorisation micro (déclenche le popup de permission)
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      }
    } catch {
      setPhase("idle");
      toast("Micro bloqué. Autorise le microphone pour ce site (icône à gauche de l'adresse) puis réessaie.");
      return;
    }
    try {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = lang;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onstart = () => { setPhase("listening"); setInterim(""); };
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
          "not-allowed": "Micro refusé. Autorise le microphone pour ce site puis réessaie.",
          "service-not-allowed": "Micro non autorisé par le navigateur.",
          "no-speech": "Je n'ai rien entendu — réessaie en parlant plus près.",
          "audio-capture": "Aucun micro détecté sur l'appareil.",
          "network": "Pas de connexion à la reconnaissance vocale (besoin d'internet).",
          "aborted": "",
        };
        const m = map[e?.error] ?? ("Erreur vocale : " + (e?.error || "inconnue"));
        if (m) toast(m);
        setPhase("idle");
      };
      rec.onend = () => setPhase("idle");
      rec.start();
    } catch {
      setPhase("idle");
      toast("Impossible de démarrer le micro.");
    }
  }
  function stop() { try { recRef.current?.stop?.(); } catch { /* */ } setPhase("idle"); }

  const active = phase !== "idle";

  return (
    <>
      <button type="button" onClick={active ? stop : start} title="Recherche vocale"
        className={`flex items-center justify-center rounded-lg shrink-0 transition-colors ${
          active ? "bg-red-600 text-white animate-pulse" : "btn-secondary"} ${className || "h-9 w-9"}`}>
        <Mic size={16} />
      </button>

      {active && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900 border border-red-500/60 text-white rounded-full px-5 py-3 shadow-2xl max-w-[90vw]">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
          </span>
          <span className="text-sm truncate">
            {phase === "starting" ? "Activation du micro…" : <>🎤 Parlez maintenant… {interim && <span className="text-slate-300 italic">« {interim} »</span>}</>}
          </span>
        </div>
      )}

      {msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-yellow-500/60 text-yellow-300 rounded-xl px-4 py-3 shadow-2xl text-sm max-w-[90vw] text-center">
          {msg}
        </div>
      )}
    </>
  );
}
