// Cron quotidien (Vercel) : envoie à tes appareils abonnés
//   1) la relance CATALOGUE (cadence 15 j après vente / 5 j après relance sans vente) ;
//   2) la relance IMPAYÉS (clients avec solde dû non relancés depuis 15 j) ;
//   0) la veille d'une tournée prévue (tournees_prevues) : prévenir les clients des villes.
// Sécurisé par CRON_SECRET.
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { loadRelancesCatalogue, loadImpayesRelance, countReapproDue, loadEndormis } from "@/lib/relances";
import { buildBilanHebdo } from "@/lib/bilan";
import { chargerClients, clientsDesVilles, dateMaroc, type ClientTournee } from "@/lib/tourneesPrevues";

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

  // Calculs (tous les matins)
  const cata = await loadRelancesCatalogue();
  const imp = await loadImpayesRelance(15);
  const reappro = await countReapproDue();
  const endormis = await loadEndormis();
  const isFriday = new Date().getUTCDay() === 5; // vendredi (≈ matin au Maroc)

  const result: Record<string, number | boolean> = {
    catalogue_due: cata.length, impayes_due: imp.clients.length, impayes_total: Math.round(imp.total),
    reappro_due: reappro, endormis_due: endormis.length, vendredi: isFriday,
  };

  // Tournées de DEMAIN (heure du Maroc) : clients à prévenir pour qu'ils envoient leur commande
  type TDemain = { id: string; villes: string[]; envoyes: string[] };
  let demain: TDemain[] = [];
  let clientsTournee: ClientTournee[] = [];
  try {
    const { data, error } = await supabase.from("tournees_prevues").select("id, villes, envoyes").eq("date_tournee", dateMaroc(1));
    if (!error && data && data.length) { demain = data as TDemain[]; clientsTournee = await chargerClients(); }
  } catch { /* table absente (tournees_prevues.sql pas collé) */ }
  const aPrevenir = demain.map((t) => ({
    t, nb: clientsDesVilles(clientsTournee, t.villes).filter((c) => c.telephone && !t.envoyes.includes(c.id)).length,
  })).filter((x) => x.nb > 0);
  result.tournees_demain = demain.length;

  if (list.length === 0) return Response.json({ ok: true, sent: 0, ...result, note: "aucun appareil abonné" });

  // 0) VEILLE DE TOURNÉE : prévenir les clients des villes de demain
  for (const { t, nb } of aPrevenir) {
    result.tournee_sent = await sendToAll({
      title: `🚚 Tournée demain : ${t.villes.join(", ")}`,
      body: `Préviens tes ${nb} client${nb > 1 ? "s" : ""} pour qu'ils t'envoient leur commande aujourd'hui. Message prêt 👉`,
      url: `/tournees/prevenir?id=${t.id}`, tag: `tournee-${t.id}`,
    });
  }

  // 1) Relance CATALOGUE (15 j / 5 j)
  if (cata.length > 0) {
    const noms = cata.slice(0, 3).map(d => d.nom).join(", ");
    result.catalogue_sent = await sendToAll({
      title: "📋 Relance catalogue",
      body: cata.length === 1 ? `1 client à relancer : ${noms}. Envoie-lui le catalogue 👉`
        : `${cata.length} clients à relancer (${noms}${cata.length > 3 ? "…" : ""}). Envoie le catalogue 👉`,
      url: "/relances-catalogue", tag: "relance-catalogue",
    });
  }

  // 2) Relance IMPAYÉS (15 j)
  if (imp.clients.length > 0) {
    const noms = imp.clients.slice(0, 3).map(d => d.nom).join(", ");
    result.impayes_sent = await sendToAll({
      title: "💰 Impayés à relancer",
      body: imp.clients.length === 1 ? `1 impayé à relancer : ${noms} (${Math.round(imp.total)} MAD). Rappelle-le 👉`
        : `${imp.clients.length} impayés à relancer (${Math.round(imp.total)} MAD au total). ${noms}${imp.clients.length > 3 ? "…" : ""} 👉`,
      url: "/", tag: "relance-impayes",
    });
  }

  // 3) Réappro / ruptures (produits sous le seuil)
  if (reappro > 0) {
    result.reappro_sent = await sendToAll({
      title: "📦 Réappro",
      body: `${reappro} produit${reappro > 1 ? "s" : ""} à recommander (stock bas). Prépare ta commande 👉`,
      url: "/reappro", tag: "reappro",
    });
  }

  // 4) Clients endormis (à réveiller)
  if (endormis.length > 0) {
    const noms = endormis.slice(0, 3).map(d => d.nom).join(", ");
    result.endormis_sent = await sendToAll({
      title: "😴 Clients à réveiller",
      body: `${endormis.length} client${endormis.length > 1 ? "s" : ""} endormi${endormis.length > 1 ? "s" : ""} (${noms}${endormis.length > 3 ? "…" : ""}). Réveille-les 👉`,
      url: "/", tag: "endormis",
    });
  }

  // 5) VENDREDI : bilan de la semaine + rappel arrivages
  if (isFriday) {
    try {
      const bilan = await buildBilanHebdo();
      result.bilan_sent = await sendToAll({ title: "📊 Bilan de la semaine", body: bilan, url: "/stats", tag: "bilan" });
    } catch { /* bilan indispo */ }
    result.arrivages_sent = await sendToAll({
      title: "📣 Arrivages de la semaine",
      body: "Vendredi ! Poste tes arrivages/promos en statut WhatsApp (bouton « 📣 Arrivages » sur l'accueil) 👉",
      url: "/", tag: "arrivages",
    });
  }

  return Response.json({ ok: true, ...result });
}
