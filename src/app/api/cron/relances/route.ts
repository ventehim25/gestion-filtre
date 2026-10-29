// Cron quotidien (Vercel) : calcule les clients « à relancer » (cadence 15 j / 5 j) et
// envoie UNE notification push à tous les appareils abonnés (toi). Sécurisé par CRON_SECRET.
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { loadRelancesCatalogue } from "@/lib/relances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BIC2aOpq0fySBst-Ot3xxgZdhzaNwM1uANOGo3HLk6iWDuSbtsujoJ0ZaldUr_3HrLexh1rucaQCeZpBb5J4hBk";

type Sub = { endpoint: string; p256dh: string; auth: string };

export async function GET(req: Request) {
  // --- Sécurité : Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> ».
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key"); // repli pour test manuel
    if (auth !== `Bearer ${secret}` && keyParam !== secret) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) return Response.json({ ok: false, error: "VAPID_PRIVATE_KEY manquante (à ajouter dans les variables Vercel)" }, { status: 500 });
  webpush.setVapidDetails("mailto:ventehim@gmail.com", VAPID_PUBLIC, priv);

  // 1) Clients à relancer aujourd'hui
  const dus = await loadRelancesCatalogue();
  const n = dus.length;
  if (n === 0) return Response.json({ ok: true, sent: 0, due: 0, note: "aucun client à relancer" });

  // 2) Abonnements (tes appareils)
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  const list = (subs ?? []) as Sub[];
  if (list.length === 0) return Response.json({ ok: true, sent: 0, due: n, note: "aucun appareil abonné" });

  // 3) Message
  const premiers = dus.slice(0, 3).map(d => d.nom).join(", ");
  const payload = JSON.stringify({
    title: "📋 Relance catalogue",
    body: n === 1
      ? `1 client à relancer : ${premiers}. Envoie-lui le catalogue 👉`
      : `${n} clients à relancer (${premiers}${n > 3 ? "…" : ""}). Envoie-leur le catalogue 👉`,
    url: "/relances-catalogue",
    tag: "relance-catalogue",
  });

  // 4) Envoi + nettoyage des abonnements expirés
  let sent = 0;
  await Promise.all(list.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e: unknown) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }));

  return Response.json({ ok: true, due: n, sent });
}
