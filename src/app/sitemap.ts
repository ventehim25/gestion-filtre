// Sitemap du catalogue public (Bible §4.8) — une URL par référence produit.
import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE = "https://gestion-filtre.vercel.app";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const refs: string[] = [];
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from("products").select("reference").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    refs.push(...(data as { reference: string }[]).map(r => r.reference));
    if (data.length < 1000) break;
  }
  const urls: MetadataRoute.Sitemap = refs.map(ref => ({
    url: `${BASE}/c/` + ref.replace(/\s+/g, "").split("/").map(encodeURIComponent).join("/"),
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return urls;
}
