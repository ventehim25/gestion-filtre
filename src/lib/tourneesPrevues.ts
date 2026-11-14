// Tournées prévues : la veille, on prévient les clients des villes de la tournée
// pour qu'ils envoient leur commande (supabase/tournees_prevues.sql, BIBLE §8.16).
// Utilisé par /tournees (programmer), /tournees/prevenir (envoi 1 tap) et le cron du matin (rappel).
// Pas d'envoi automatique : WhatsApp bannit les numéros qui envoient en masse.
import { supabase } from "./supabase";
import { TARIF_KEY } from "./catalogue";
import type { TourneePrevue } from "@/types/database";

export const TARIF_URL = `https://gestion-filtre.vercel.app/tarif?k=${TARIF_KEY}`;

// Date au Maroc (AAAA-MM-JJ), décalée de n jours (1 = demain)
export function dateMaroc(decalage = 0): string {
  return new Date(Date.now() + decalage * 86400000).toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
}

const JOURS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const JOURS_FR = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const jourSemaine = (date: string) => new Date(date + "T12:00:00Z").getUTCDay();
const jjmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

// « mar. 18/11 » (affichage dans l'app)
export const dateCourte = (date: string) => `${JOURS_FR[jourSemaine(date)]} ${jjmm(date)}`;

// « غدا الثلاثاء » la veille, « اليوم » le jour même, sinon « نهار الثلاثاء 18/11 »
export function jourDarija(date: string, aujourdhui = dateMaroc(0)): string {
  const j = JOURS_AR[jourSemaine(date)];
  if (date === aujourdhui) return "اليوم";
  if (date === addJours(aujourdhui, 1)) return `غدا ${j}`;
  return `نهار ${j} ${jjmm(date)}`;
}
function addJours(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Message par défaut. {nom}, {jour} et {ville} se remplissent pour chaque client.
export const MESSAGE_DEFAUT = [
  "السلام عليكم {nom} 👋",
  "{jour} إن شاء الله غادي نكونو ف {ville} 🚚",
  "صيفط ليا الكوموند ديالك اليوم باش نوجدوها ليك ونجيبوها معانا.",
  `📋 الأثمنة ديال اليوم : ${TARIF_URL}`,
  "FiltroPro · 📲 0602350290",
].join("\n");

export function remplirMessage(modele: string, c: { nom: string; ville: string }, dateTournee: string): string {
  return (modele || MESSAGE_DEFAUT)
    .replaceAll("{nom}", c.nom.trim())
    .replaceAll("{ville}", c.ville.trim())
    .replaceAll("{jour}", jourDarija(dateTournee));
}

// « Tétouan », « tetouan », « TETOUAN » → même ville
export const normVille = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export type ClientTournee = { id: string; nom: string; telephone: string | null; ville: string; quartier: string | null };

// Tous les clients (73 aujourd'hui ; paginé au cas où)
export async function chargerClients(): Promise<ClientTournee[]> {
  const out: ClientTournee[] = [];
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase.from("clients").select("id, nom, telephone, ville, quartier").order("nom").range(i * 1000, i * 1000 + 999);
    if (error) throw error;
    out.push(...((data ?? []) as ClientTournee[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// Clients des villes choisies, rangés par ville puis quartier puis nom
export function clientsDesVilles(clients: ClientTournee[], villes: string[]): ClientTournee[] {
  const voulues = new Set(villes.map(normVille));
  return clients
    .filter((c) => voulues.has(normVille(c.ville)))
    .sort((a, b) => normVille(a.ville).localeCompare(normVille(b.ville)) || (a.quartier ?? "").localeCompare(b.quartier ?? "") || a.nom.localeCompare(b.nom));
}

// Villes des clients avec leur nombre, la plus fournie d'abord (une seule écriture par ville)
export function villesAvecNombre(clients: ClientTournee[]): { ville: string; nb: number }[] {
  const m = new Map<string, { ville: string; nb: number }>();
  for (const c of clients) {
    const k = normVille(c.ville);
    if (!k) continue;
    const v = m.get(k) ?? { ville: c.ville.trim(), nb: 0 };
    v.nb++;
    m.set(k, v);
  }
  return [...m.values()].sort((a, b) => b.nb - a.nb || a.ville.localeCompare(b.ville));
}

// Code PGRST205 = la table n'existe pas encore (SQL pas collé)
export const tableAbsente = (e: { code?: string } | null | undefined) => e?.code === "PGRST205" || e?.code === "42P01";

// Tournées à venir (à partir d'aujourd'hui), la plus proche d'abord
export async function chargerTourneesAVenir(): Promise<{ tournees: TourneePrevue[]; absente: boolean }> {
  const { data, error } = await supabase.from("tournees_prevues").select("*").gte("date_tournee", dateMaroc(0)).order("date_tournee");
  if (error) {
    if (tableAbsente(error)) return { tournees: [], absente: true };
    throw error;
  }
  return { tournees: (data ?? []) as TourneePrevue[], absente: false };
}
