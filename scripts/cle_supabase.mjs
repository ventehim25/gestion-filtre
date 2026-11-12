// Connexion des scripts à Supabase (sécurité, supabase/securite.sql).
// Utilise la clé « service » SUPABASE_SERVICE_ROLE_KEY écrite dans .env.local (jamais sur GitHub : .env*.local est ignoré).
// Sans elle, repli sur la clé publique : ça marche tant que la base n'est pas protégée, puis les écritures sont refusées.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaHN2Z29vbG96cXp4c2d3aWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTA3NzYsImV4cCI6MjA5NTgyNjc3Nn0.8z624yNoX-CQirJM5VQvYyMdeOCj5jau_0BvTaMKj1c";

function lireEnvLocal() {
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return {};
  const out = {};
  for (const ligne of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/[^\x00-\xFF]/g, "");
  }
  return out;
}

const env = { ...lireEnvLocal(), ...process.env };
export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || "https://wehsvgoolozqzxsgwibb.supabase.co";
export const SUPABASE_CLE = env.SUPABASE_SERVICE_ROLE_KEY || ANON;
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠ SUPABASE_SERVICE_ROLE_KEY absente de .env.local : clé publique utilisée (bloquée une fois la base protégée).");
}
