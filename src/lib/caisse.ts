// Caisse du jour + dépenses (nouveauté n° 1, inspirée du logiciel de dinoun « GMP » — BIBLE §8.41).
// Chaque argent reçu d'un client est noté dans paiements_clients (à la vente ou à l'encaissement plus tard) avec son mode
// (espèces, chèque, virement) → la caisse du jour = fond + espèces reçues − dépenses en espèces − argent donné aux
// fournisseurs en espèces. Si les tables n'existent pas encore (SQL pas collé), rien ne bloque : les ventes continuent.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Avance, CaisseJournee, Depense, ModePaiement, PaiementClient } from "@/types/database";

export const CATEGORIES_DEPENSE = [
  { cle: "essence", libelle: "Essence", icone: "⛽" },
  { cle: "repas", libelle: "Repas", icone: "🍽️" },
  { cle: "telephone", libelle: "Téléphone / internet", icone: "📱" },
  { cle: "transport", libelle: "Transport / péage", icone: "🚕" },
  { cle: "voiture", libelle: "Réparation voiture", icone: "🔧" },
  { cle: "loyer", libelle: "Loyer", icone: "🏠" },
  { cle: "salaire", libelle: "Salaire", icone: "👷" },
  { cle: "fournitures", libelle: "Fournitures / emballage", icone: "📦" },
  { cle: "impots", libelle: "Impôts / taxes", icone: "🧾" },
  { cle: "autre", libelle: "Autre", icone: "•" },
] as const;
export const libelleDepense = (cle: string) => CATEGORIES_DEPENSE.find((c) => c.cle === cle) ?? CATEGORIES_DEPENSE[CATEGORIES_DEPENSE.length - 1];
export const MODES_PAIEMENT: { cle: ModePaiement; libelle: string }[] = [
  { cle: "especes", libelle: "💵 Espèces" }, { cle: "cheque", libelle: "🧾 Chèque" }, { cle: "virement", libelle: "🏦 Virement" },
];

type Paiement = {
  sale_id: string | null; client_id: string | null; date: string; montant: number; mode?: ModePaiement; cle?: string;
  numero_cheque?: string | null; banque?: string | null; date_echeance?: string | null; note?: string | null;
};

/** Note un argent reçu d'un client. cle « vente » = paiement à la création du bon (jamais en double, même si le réseau coupe).
 *  Ne bloque jamais : si la table n'existe pas encore, on continue sans rien dire. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function noterPaiement(db: SupabaseClient<any>, p: Paiement): Promise<void> {
  if (!p.montant) return;
  const mode = p.mode ?? "especes";
  const ligne = {
    sale_id: p.sale_id, client_id: p.client_id, date: p.date, montant: Math.round(p.montant * 100) / 100, mode, cle: p.cle ?? crypto.randomUUID(),
    numero_cheque: p.numero_cheque ?? null, banque: p.banque ?? null, date_echeance: p.date_echeance ?? null,
    encaisse: mode !== "cheque", note: p.note ?? null,
  };
  const { error } = await db.from("paiements_clients").upsert(ligne, { onConflict: "sale_id,cle", ignoreDuplicates: true });
  if (error && error.code !== "PGRST205" && error.code !== "42P01") console.warn("paiement non noté :", error.message);
}

export type JourCaisse = {
  date: string;
  paiements: (PaiementClient & { client_nom?: string })[];
  depenses: Depense[];
  avances: Avance[];
  journee: CaisseJournee | null;
  fondPropose: number;   // fond de départ proposé = argent compté à la dernière clôture
  tablesAbsentes: boolean;
};

export async function chargerJour(date: string): Promise<JourCaisse> {
  const [p, d, a, j, avant] = await Promise.all([
    supabase.from("paiements_clients").select("*, clients(nom)").eq("date", date).order("created_at"),
    supabase.from("depenses").select("*").eq("date", date).order("created_at"),
    supabase.from("avances").select("*").eq("date", date),
    supabase.from("caisse_journees").select("*").eq("date", date).maybeSingle(),
    supabase.from("caisse_journees").select("date, compte_fin").lt("date", date).not("compte_fin", "is", null).order("date", { ascending: false }).limit(1),
  ]);
  const absent = (e: { code?: string } | null) => !!e && (e.code === "PGRST205" || e.code === "42P01");
  return {
    date,
    paiements: ((p.data ?? []) as unknown as (PaiementClient & { clients?: { nom: string } | null })[]).map((x) => ({ ...x, client_nom: x.clients?.nom })),
    depenses: (d.data ?? []) as Depense[],
    avances: (a.data ?? []) as Avance[],
    journee: (j.data as CaisseJournee | null) ?? null,
    fondPropose: Number((avant.data?.[0] as { compte_fin: number } | undefined)?.compte_fin ?? 0),
    tablesAbsentes: absent(p.error) || absent(d.error),
  };
}

/** Calcul de la caisse du jour (espèces seulement : un chèque ou un virement ne sont pas dans la caisse). */
export function calculerCaisse(j: JourCaisse) {
  const fond = j.journee?.fond_debut ?? j.fondPropose;
  const entrees = j.paiements.filter((p) => p.mode === "especes").reduce((s, p) => s + Number(p.montant), 0);
  const autresEntrees = j.paiements.filter((p) => p.mode !== "especes").reduce((s, p) => s + Number(p.montant), 0);
  const depensesEspeces = j.depenses.filter((d) => d.mode === "especes").reduce((s, d) => s + Number(d.montant), 0);
  // argent donné aux fournisseurs en espèces (mode vide = avant le 16/11 : compté en espèces)
  const avancesEspeces = j.avances.filter((a) => !a.mode || a.mode === "especes").reduce((s, a) => s + Number(a.montant), 0);
  const theorique = fond + entrees - depensesEspeces - avancesEspeces;
  return { fond, entrees, autresEntrees, depensesEspeces, avancesEspeces, theorique, ecart: j.journee?.compte_fin != null ? Number(j.journee.compte_fin) - theorique : null };
}

/** Dépenses d'une période (bénéfice net dans Statistiques, résumé du mois). */
export async function depensesEntre(debut: string, fin: string): Promise<Depense[]> {
  const { data, error } = await supabase.from("depenses").select("*").gte("date", debut).lte("date", fin).order("date");
  return error ? [] : (data as Depense[]);
}
