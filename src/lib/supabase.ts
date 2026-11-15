import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Valeurs publiques : la clé « publishable » est faite pour être visible côté client (ce sont les règles RLS qui protègent).
// 15/11/2026 : nouvelle clé sb_publishable_ à la place de l'ancienne clé « anon » (JWT), que Supabase arrête début 2027.
// L'ancienne variable Vercel NEXT_PUBLIC_SUPABASE_ANON_KEY n'est plus lue (elle contient encore l'ancienne clé).
const FALLBACK_URL = "https://wehsvgoolozqzxsgwibb.supabase.co";
const FALLBACK_KEY =
  "sb_publishable_9YlZnsqVPH_dQ-cmZBePug_bQgsFjt1";

// Supprime BOM / caractères hors Latin-1 qui font planter Headers.set côté navigateur.
function clean(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? "").replace(/[^\x00-\xFF]/g, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL, FALLBACK_URL);
export const SUPABASE_PUBLIC_URL = supabaseUrl;
const supabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, FALLBACK_KEY);

// Sécurité (supabase/securite.sql) : dans le NAVIGATEUR, clé publique + session de l'utilisateur connecté
// (les règles RLS ne laissent passer que l'équipe autorisée). Sur le SERVEUR (cron des relances, pages
// publiques /c/ et sitemap), clé « service » SUPABASE_SERVICE_ROLE_KEY si elle est définie dans Vercel.
// Cette variable n'a PAS le préfixe NEXT_PUBLIC_ : Next.js ne l'envoie jamais au navigateur.
const serviceKey = typeof window === "undefined" ? clean(process.env.SUPABASE_SERVICE_ROLE_KEY, "") : "";

export const supabase = serviceKey
  ? createClient<Database>(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : createClient<Database>(supabaseUrl, supabaseAnonKey);
