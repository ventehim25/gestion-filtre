"use client";
import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";

// Scanner caméra (1D barcodes) basé sur html5-qrcode, importé dynamiquement
// pour éviter tout problème de SSR. Appelle onScan(code) à chaque lecture,
// avec anti-rebond pour ne pas compter le même code plusieurs fois d'affilée.
export default function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const containerId = "barcode-reader";

  useEffect(() => {
    let stopped = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        const formats = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];
        instance = new Html5Qrcode(containerId, { formatsToSupport: formats, verbose: false });
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decoded: string) => {
            const now = Date.now();
            // Ignore le même code lu il y a moins de 1,5 s
            if (decoded === lastRef.current.code && now - lastRef.current.at < 1500) return;
            lastRef.current = { code: decoded, at: now };
            if (navigator.vibrate) navigator.vibrate(60);
            onScan(decoded);
          },
          () => { /* échecs de frame ignorés */ }
        );
        if (!stopped) setReady(true);
      } catch (e) {
        setError("Caméra indisponible. Autorisez l'accès ou utilisez une douchette USB.");
        console.error(e);
      }
    })();

    return () => {
      stopped = true;
      const s = scannerRef.current;
      if (s) {
        try {
          s.stop().then(() => s.clear()).catch(() => {});
        } catch { /* déjà arrêté */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card p-4 w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Camera size={18} className="text-red-400" /> Scanner un code-barres</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div id={containerId} className="w-full rounded-lg overflow-hidden bg-black min-h-[200px]" />
        {!ready && !error && <p className="text-center text-slate-400 py-3 text-sm">Démarrage de la caméra…</p>}
        {error && <p className="text-center text-red-400 py-3 text-sm">{error}</p>}
        <p className="text-center text-slate-500 text-xs mt-2">Visez le code-barres de la boîte. +1 au stock à chaque lecture.</p>
      </div>
    </div>
  );
}
