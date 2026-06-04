// Utilitaires WhatsApp : numéro au format international Maroc + reçu + envoi.
const TEL = "06 02 35 02 90";

export function waNumber(tel?: string | null): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("212")) return d;
  if (d.startsWith("0")) return "212" + d.slice(1);
  if (d.length === 9) return "212" + d; // numéro local sans le 0
  return d;
}

export type ReceiptLine = { nom: string; quantite: number; prix_unitaire: number };
export type ReceiptData = {
  clientNom?: string;
  date: string;
  lines: ReceiptLine[];
  total: number;
  statut: "paye" | "en_attente" | "partiel";
  montant_paye: number;
};

export function buildReceipt(r: ReceiptData): string {
  const L = r.lines.map((l) =>
    `• ${l.nom}  x${l.quantite} = ${(l.quantite * l.prix_unitaire).toFixed(2)} MAD`
  ).join("\n");
  const reste = r.total - r.montant_paye;
  let pay = "";
  if (r.statut === "paye") pay = "\n✅ *Payé*";
  else if (r.statut === "partiel") pay = `\n💵 Payé : ${r.montant_paye.toFixed(2)} MAD\n🔴 Reste : ${reste.toFixed(2)} MAD`;
  else pay = `\n🔴 *Reste à payer : ${reste.toFixed(2)} MAD*`;

  return [
    "🧾 *FiltroPro* — Reçu",
    r.clientNom ? `👤 Client : ${r.clientNom}` : "",
    `📅 ${r.date}`,
    "————————————",
    L,
    "————————————",
    `🧮 *TOTAL : ${r.total.toFixed(2)} MAD*${pay}`,
    "",
    `📞 ${TEL}  ·  Merci de votre confiance 🙏`,
  ].filter(Boolean).join("\n");
}

// Ouvre WhatsApp (vers le client si numéro connu, sinon choix du contact)
export function sendWhatsApp(tel: string | null | undefined, text: string) {
  const n = waNumber(tel);
  const base = n ? `https://wa.me/${n}` : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank");
}
