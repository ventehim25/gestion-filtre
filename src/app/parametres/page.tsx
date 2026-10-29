"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { Bell, BellOff, Check } from "lucide-react";
import { pushSupported, pushPermission, isSubscribed, enablePush, disablePush } from "@/lib/push";

export default function ParametresPage() {
  const { t, lang, setLang } = useLang();

  const [notifState, setNotifState] = useState<"loading" | "unsupported" | "off" | "on" | "denied">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!pushSupported()) { setNotifState("unsupported"); return; }
      if (pushPermission() === "denied") { setNotifState("denied"); return; }
      setNotifState((await isSubscribed()) ? "on" : "off");
    })();
  }, []);

  async function activer() {
    setBusy(true); setMsg(null);
    const r = await enablePush();
    setBusy(false);
    if (r.ok) { setNotifState("on"); setMsg("✅ Notifications activées sur cet appareil."); }
    else { setMsg("⚠️ " + r.error); if (pushPermission() === "denied") setNotifState("denied"); }
  }
  async function desactiver() {
    setBusy(true); setMsg(null);
    await disablePush();
    setBusy(false); setNotifState("off"); setMsg("Notifications désactivées sur cet appareil.");
  }
  async function tester() {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("FiltroPro", {
        body: "🔔 Test réussi — c'est ici que s'afficheront tes relances clients.",
        icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "test",
      });
      setMsg("Notification de test envoyée 👍");
    } catch { setMsg("Impossible d'afficher la notif de test."); }
  }

  return (
    <div>
      <Header title="settings" />

      <div className="card p-6 max-w-md mb-4">
        <h3 className="font-semibold text-slate-700 mb-4">{t("language")}</h3>
        <div className="flex gap-3">
          <button onClick={() => setLang("fr")} className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${lang === "fr" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
            🇫🇷 Français
          </button>
          <button onClick={() => setLang("ar")} className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${lang === "ar" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
            🇲🇦 العربية
          </button>
        </div>
      </div>

      <div className="card p-6 max-w-md">
        <h3 className="font-semibold text-slate-700 mb-1 flex items-center gap-2"><Bell size={18} /> Notifications</h3>
        <p className="text-sm text-slate-500 mb-4">Rappels automatiques de relance clients (envoyer le catalogue) directement sur cet appareil.</p>

        {notifState === "loading" && <p className="text-sm text-slate-400">Chargement…</p>}

        {notifState === "unsupported" && (
          <p className="text-sm text-amber-600">Cet appareil/navigateur ne supporte pas les notifications. Sur iPhone : ouvre l'app depuis l'icône <b>installée sur l'écran d'accueil</b> (iOS 16.4+).</p>
        )}

        {notifState === "denied" && (
          <p className="text-sm text-amber-600">Les notifications sont <b>bloquées</b>. Autorise-les dans les réglages du navigateur pour ce site, puis recharge.</p>
        )}

        {notifState === "off" && (
          <button onClick={activer} disabled={busy} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Bell size={16} /> {busy ? "…" : "Activer les notifications"}
          </button>
        )}

        {notifState === "on" && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 px-3 py-2 rounded-lg bg-green-50"><Check size={16} /> Activées</span>
            <button onClick={tester} disabled={busy} className="btn-secondary flex items-center gap-2">🔔 Tester</button>
            <button onClick={desactiver} disabled={busy} className="btn-secondary flex items-center gap-2 text-slate-500"><BellOff size={16} /> Désactiver</button>
          </div>
        )}

        {msg && <p className="text-sm mt-3 text-slate-600">{msg}</p>}
      </div>
    </div>
  );
}
