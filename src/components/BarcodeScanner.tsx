"use client";
import { useEffect, useRef, useState } from "react";
import { X, Camera, Flashlight, ZoomIn } from "lucide-react";

// Scanner caméra (codes-barres 1D + QR). Appelle onScan(code) à chaque lecture,
// avec anti-rebond pour ne pas compter le même code plusieurs fois d'affilée.
// 1) Détecteur NATIF du téléphone (BarcodeDetector, Chrome Android) : léger (accéléré
//    matériel), vidéo 1280×720 + mise au point continue = image nette.
// 2) Secours html5-qrcode (iPhone/Firefox), chargé seulement si le natif manque.
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"];
const VIDEO: MediaTrackConstraints = { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } };
const containerId = "barcode-reader";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function BarcodeScanner({ onScan, onClose, hint = "Visez le code-barres de la boîte.", status }: {
  onScan: (code: string) => void; onClose: () => void; hint?: string;
  status?: string; // retour en direct (ex. « ✓ OE640/1 +1 · 12 boîtes ») — la liste est cachée derrière la caméra
}) {
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"native" | "fallback" | null>(null);
  const [torch, setTorch] = useState<boolean | null>(null);   // null = non disponible
  const [zoom, setZoom] = useState<{ on: boolean; max: number } | null>(null);
  const [flash, setFlash] = useState(false);                  // retour visuel à chaque lecture
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let stopped = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let fallback: any = null;

    const emit = (code: string) => {
      const now = Date.now();
      // Ignore le même code lu il y a moins de 1,5 s
      if (!code || (code === lastRef.current.code && now - lastRef.current.at < 1500)) return;
      lastRef.current = { code, at: now };
      if (navigator.vibrate) navigator.vibrate(60);
      setFlash(true);
      setTimeout(() => setFlash(false), 250);
      onScanRef.current(code);
    };

    async function nativeDetector() {
      const BD = (window as any).BarcodeDetector;
      if (!BD) return null;
      try {
        const supported: string[] = await BD.getSupportedFormats();
        const formats = FORMATS.filter((f) => supported.includes(f));
        return formats.includes("ean_13") ? new BD({ formats }) : null;
      } catch { return null; }
    }

    async function startNative(detector: any) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: VIDEO });
      if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const caps: any = track.getCapabilities?.() ?? {};
      // Mise au point continue : la cause n°1 du flou sur les petits codes-barres
      if (caps.focusMode?.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] }).catch(() => {});
      }
      if (caps.torch) setTorch(false);
      if (caps.zoom?.max >= 1.5) setZoom({ on: false, max: Math.min(2, caps.zoom.max) });

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setReady(true);

      // Analyse ~7 fois/s, jamais deux analyses en parallèle (économise batterie et CPU)
      let busy = false;
      let last = 0;
      const loop = (t: number) => {
        if (stopped) return;
        raf = requestAnimationFrame(loop);
        if (busy || t - last < 140 || video.readyState < 2) return;
        busy = true;
        last = t;
        detector.detect(video)
          .then((codes: { rawValue: string }[]) => { if (codes[0]) emit(codes[0].rawValue); })
          .catch(() => {})
          .finally(() => { busy = false; });
      };
      raf = requestAnimationFrame(loop);
    }

    async function startFallback() {
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import("html5-qrcode");
      await new Promise((r) => setTimeout(r, 50)); // laisse React afficher le conteneur #barcode-reader
      if (stopped) return;
      fallback = new Html5Qrcode(containerId, {
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.QR_CODE],
        verbose: false,
      });
      await fallback.start(
        { facingMode: "environment" },
        {
          fps: 8,
          aspectRatio: 16 / 9,
          videoConstraints: VIDEO,
          qrbox: (w: number, h: number) => ({ width: Math.floor(w * 0.8), height: Math.floor(h * 0.45) }),
        },
        (decoded: string) => emit(decoded),
        () => { /* échecs de frame ignorés */ },
      );
      fallback.applyVideoConstraints?.({ advanced: [{ focusMode: "continuous" }] }).catch?.(() => {});
      if (!stopped) setReady(true);
    }

    (async () => {
      try {
        const detector = await nativeDetector();
        setMode(detector ? "native" : "fallback");
        if (detector) await startNative(detector);
        else await startFallback();
      } catch (e) {
        setError("Caméra indisponible. Autorisez l'accès ou utilisez une douchette USB.");
        console.error(e);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
      if (fallback) {
        try { fallback.stop().then(() => fallback.clear()).catch(() => {}); } catch { /* déjà arrêté */ }
      }
    };
  }, []);

  function toggleTorch() {
    const t = trackRef.current;
    if (!t || torch === null) return;
    t.applyConstraints({ advanced: [{ torch: !torch } as any] }).then(() => setTorch(!torch)).catch(() => {});
  }

  function toggleZoom() {
    const t = trackRef.current;
    if (!t || !zoom) return;
    t.applyConstraints({ advanced: [{ zoom: zoom.on ? 1 : zoom.max } as any] }).then(() => setZoom({ ...zoom, on: !zoom.on })).catch(() => {});
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3">
      <div className="card p-3 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Camera size={18} className="text-red-400" /> Scanner un code-barres</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={22} /></button>
        </div>

        {mode !== "fallback" && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            {/* Cadre de visée */}
            <div className={`absolute left-[10%] right-[10%] top-[27%] bottom-[27%] rounded-lg border-2 transition-colors ${flash ? "border-green-400 bg-green-400/10" : "border-white/80"}`} />
            <div className="absolute left-[12%] right-[12%] top-1/2 h-0.5 bg-red-500/80" />
            {ready && (torch !== null || zoom) && (
              <div className="absolute bottom-2 right-2 flex gap-2">
                {zoom && (
                  <button onClick={toggleZoom} className={`rounded-full p-2 ${zoom.on ? "bg-amber-400 text-black" : "bg-black/60 text-white"}`} aria-label="Zoom">
                    <ZoomIn size={18} />
                  </button>
                )}
                {torch !== null && (
                  <button onClick={toggleTorch} className={`rounded-full p-2 ${torch ? "bg-amber-400 text-black" : "bg-black/60 text-white"}`} aria-label="Lampe">
                    <Flashlight size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {mode === "fallback" && <div id={containerId} className="w-full rounded-lg overflow-hidden bg-black min-h-[200px]" />}

        {status && <p className="mt-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center text-sm font-medium text-emerald-300">{status}</p>}
        {!ready && !error && <p className="text-center text-slate-400 py-3 text-sm">Démarrage de la caméra…</p>}
        {error && <p className="text-center text-red-400 py-3 text-sm">{error}</p>}
        <p className="text-center text-slate-500 text-xs mt-2">{hint}{zoom ? " Code trop petit ou flou : reculez un peu et activez le zoom." : ""}</p>
      </div>
    </div>
  );
}
