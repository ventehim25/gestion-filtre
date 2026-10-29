// Notifications push côté client : demander la permission, s'abonner, enregistrer
// l'abonnement dans Supabase. La clé VAPID PUBLIQUE est publique par nature (comme la
// clé anon Supabase) → repli en dur pour marcher même sans variable d'env.
import { supabase } from "./supabase";

const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BIC2aOpq0fySBst-Ot3xxgZdhzaNwM1uANOGo3HLk6iWDuSbtsujoJ0ZaldUr_3HrLexh1rucaQCeZpBb5J4hBk";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch { return false; }
}

// Demande la permission + abonne + enregistre dans Supabase.
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Ton navigateur ne supporte pas les notifications (sur iPhone : installe d'abord l'app sur l'écran d'accueil)." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Permission refusée. Autorise les notifications dans les réglages du navigateur." };
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
    const { error } = await supabase.from("push_subscriptions").upsert({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
    }, { onConflict: "endpoint" });
    if (error) return { ok: false, error: "Enregistrement impossible : " + error.message + " (as-tu collé le SQL push_notifications.sql ?)" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Abonnement échoué : " + (e as Error).message };
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch { /* ignore */ }
}
