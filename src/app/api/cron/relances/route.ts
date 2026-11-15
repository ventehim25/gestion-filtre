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

  // Garde la base Supabase éveillée (plan gratuit : pause après ~7 jours sans requête) — AVANT tout le reste,
  // pour que la requête parte même si une variable manque plus bas.
  await supabase.from("products").select("id", { count: "exact", head: true }).limit(1);

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

  // 6) Base presque pleine (plan gratuit Supabase = 500 Mo ; au-delà elle passe en lecture seule : plus de ventes
  //    enregistrées). taille_base() vient de supabase/protection.sql ; absente = on ne dit rien.
  try {
    const t = await supabase.rpc("taille_base");
    const mo = Math.round(Number(t.data ?? 0) / 1048576);
    if (mo > 0) result.taille_base_mo = mo;
    if (mo > 400) result.taille_sent = await sendToAll({
      title: "⚠️ Base FiltroPro presque pleine",
      body: `${mo} Mo sur 500 Mo (plan gratuit Supabase). Demande à Claude de faire de la place avant qu'elle soit pleine.`,
      url: "/", tag: "taille-base",
    });
  } catch { /* fonction pas encore créée */ }

  // 7) Sauvegarde du PC en retard (scripts/sauvegarde.mjs note sa date dans reglages « derniere_sauvegarde »)
  try {
    const { data } = await supabase.from("reglages").select("valeur").eq("cle", "derniere_sauvegarde").maybeSingle();
    const le = (data?.valeur as { le?: string } | null)?.le;
    if (le) {
      const jours = Math.floor((Date.now() - new Date(le).getTime()) / 864e5);
      result.sauvegarde_jours = jours;
      if (jours >= 2) result.sauvegarde_sent = await sendToAll({
        title: "💾 Sauvegarde FiltroPro en retard",
        body: `Dernière copie de la base il y a ${jours} jours. Allume le PC vers 13 h (la sauvegarde se fait toute seule), ou demande à Claude de vérifier.`,
        url: "/", tag: "sauvegarde",
      });
    }
  } catch { /* pas encore de date notée */ }

  // 8) Rappel : désactiver les anciennes clés Supabase (nouvelle clé publique en ligne depuis le 15/11/2026, BIBLE §8.24).
  //    À partir du 22/11/2026, tous les 3 jours, jusqu'à ce que Claude note reglages « anciennes_cles_desactivees »
  //    (ou jusqu'au 01/03/2027 : Supabase les aura arrêtées de toute façon).
  try {
    const debut = Date.parse("2026-11-22T00:00:00Z"), fin = Date.parse("2027-03-01T00:00:00Z");
    const jours = Math.floor((Date.now() - debut) / 864e5);
    if (jours >= 0 && Date.now() < fin && jours % 3 === 0) {
      const { data } = await supabase.from("reglages").select("cle").eq("cle", "anciennes_cles_desactivees").maybeSingle();
      if (!data) result.anciennes_cles_sent = await sendToAll({
        title: "🔑 Rappel FiltroPro : ancienne clé Supabase",
        body: "La nouvelle clé marche depuis une semaine. Ouvre FiltroPro sur chaque téléphone, puis dis à Claude « désactiver l'ancienne clé » (2 minutes, il te guide).",
        url: "/", tag: "anciennes-cles",
      });
    }
  } catch { /* rappel facultatif */ }

  return Response.json({ ok: true, ...result });
}
