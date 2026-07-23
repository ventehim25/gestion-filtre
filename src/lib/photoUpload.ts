// Upload d'une photo produit (prise avec l'appareil du téléphone) vers Supabase Storage.
// Compresse d'abord (redimensionne + JPEG) pour que ce soit léger et rapide même en 4G.
import { supabase } from "./supabase";

async function compress(file: File, max = 1000, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error("compression échouée"))), "image/jpeg", quality));
}

// Retourne l'URL publique de la photo (à mettre dans products.image_url).
export async function uploadProductPhoto(file: File, reference: string): Promise<string> {
  const blob = await compress(file);
  const safe = (reference || "produit").toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 40);
  const path = `${safe}_${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("produits").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return supabase.storage.from("produits").getPublicUrl(path).data.publicUrl;
}
