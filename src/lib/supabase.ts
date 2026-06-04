import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Valeurs publiques (la clé anon est conçue pour être exposée côté client).
// Utilisées en repli si la variable d'env est absente ou corrompue.
const FALLBACK_URL = "https://wehsvgoolozqzxsgwibb.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaHN2Z29vbG96cXp4c2d3aWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTA3NzYsImV4cCI6MjA5NTgyNjc3Nn0.8z624yNoX-CQirJM5VQvYyMdeOCj5jau_0BvTaMKj1c";

// Supprime BOM / caractères hors Latin-1 qui font planter Headers.set côté navigateur.
function clean(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? "").replace(/[^\x00-\xFF]/g, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL, FALLBACK_URL);
const supabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, FALLBACK_KEY);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
