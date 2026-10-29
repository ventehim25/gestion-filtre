// Cron quotidien (Vercel) : envoie à tes appareils abonnés
//   1) la relance CATALOGUE (cadence 15 j après vente / 5 j après relance sans vente) ;
//   2) la relance IMPAYÉS (clients avec solde dû non relancés depuis 15 j).
// Sécurisé par CRON_SECRET.
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { loadRelancesCatalogue, loadImpayesRelance } from "@/lib/relances";

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
    const keyParam = new URL(req.url).searchParams.get("key"); // repli pour test manuel
    if (auth !== `Bearer ${secret}` && keyParam !== secret) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) return Response.json({ ok: false, error: "VAPID_PRIVATE_KEY manquante (à ajouter dans les variables Vercel)" }, { status: 500 });
  webpush.setVapidDetails("mailto:ventehim@gmail.com", VAPID_PUBLIC, priv);

  // Appareils abonnés (tes téléphones/PC)
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  const list = (subs ?? []) as Sub[];

  // Envoie un message à tous les appareils + nettoie les abonnements expirés.
  async function sendToAll(payload: object): Promise<number> {
    let sent = 0;
    await Promise.all(list.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }));
    return sent;
  }

  // 1) Relance CATALOGUE
  const cata = await loadRelancesCatalogue();
  // 2) Relance IMPAYÉS (15 j)
  const imp = await loadImpayesRelance(15);

  if (list.length === 0) {
    return Response.json({ ok: true, sent: 0, catalogue_due: cata.length, impayes_due: imp.clients.length, note: "aucun appareil abonné" });
  }

  let sentCata = 0, sentImp = 0;

  if (cata.length > 0) {
    const noms = cata.slice(0, 3).map(d => d.nom).join(", ");
    sentCata = await sendToAll({
      title: "📋 Relance catalogue",
      body: cata.length === 1
        ? `1 client à relancer : ${noms}. Envoie-lui le catalogue 👉`
        : `${cata.length} clients à relancer (${noms}${cata.length > 3 ? "…" : ""}). Envoie le catalogue 👉`,
      url: "/relances-catalogue",
      tag: "relance-catalogue",
    });
  }

  if (imp.clients.length > 0) {
    const noms = imp.clients.slice(0, 3).map(d => d.nom).join(", ");
    const total = Math.round(imp.total);
    sentImp = await sendToAll({
      title: "💰 Impayés à relancer",
      body: imp.clients.length === 1
        ? `1 impayé à relancer : ${noms} (${total} MAD). Rappelle-le 👉`
        : `${imp.clients.length} impayés à relancer (${total} MAD au total). ${noms}${imp.clients.length > 3 ? "…" : ""} 👉`,
      url: "/",
      tag: "relance-impayes",
    });
  }

  return Response.json({
    ok: true,
    catalogue_due: cata.length, catalogue_sent: sentCata,
    impayes_due: imp.clients.length, impayes_total: Math.round(imp.total), impayes_sent: sentImp,
  });
}
