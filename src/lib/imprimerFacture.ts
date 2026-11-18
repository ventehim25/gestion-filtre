// Impression d'une facture / d'un avoir (BIBLE §8.41, nouveauté n° 5) : page A4 propre dans une nouvelle fenêtre,
// « Imprimer » ou « Enregistrer en PDF » depuis le navigateur. Même méthode que le bon de livraison des Ventes.
// La fenêtre est ouverte AVANT d'attendre le réseau (sinon le téléphone bloque la fenêtre) : ouvrirFenetre() au clic,
// puis ecrireFacture() quand la facture est prête.
import type { Facture } from "@/types/database";
import { montantEnLettres, type Societe } from "./factures";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const mad = (n: number) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function ouvrirFenetre(): Window | null {
  const w = window.open("", "_blank");
  if (w) w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facture…</title></head><body style="font-family:Arial;padding:40px;color:#555">Préparation de la facture…</body></html>`);
  return w;
}

export function ecrireFacture(w: Window, f: Facture, s: Societe, origine?: string | null) {
  const avoir = f.type === "avoir";
  const taux = Number(f.taux_tva);
  const lignes = (f.lignes ?? []).map((l) => {
    const puHt = l.prix_ttc / (1 + taux / 100);
    return `<tr><td>${esc(l.reference)}</td><td>${esc(l.designation)}</td><td class="c">${l.quantite}</td><td class="r">${mad(puHt)}</td><td class="r">${mad(puHt * l.quantite)}</td></tr>`;
  }).join("");
  const ids = [s.ice && `ICE : ${esc(s.ice)}`, s.rc && `RC : ${esc(s.rc)}`, s.if_fiscal && `IF : ${esc(s.if_fiscal)}`, s.patente && `Patente : ${esc(s.patente)}`, s.cnss && `CNSS : ${esc(s.cnss)}`].filter(Boolean).join(" · ");
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${avoir ? "Avoir" : "Facture"} ${esc(f.numero)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2328; margin: 0; padding: 24px; max-width: 820px; margin-inline: auto; font-size: 13px; }
  .tete { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #b8860b; padding-bottom: 14px; }
  .soc h1 { margin: 0 0 4px; font-size: 22px; color: #8a6508; }
  .soc p, .cli p { margin: 2px 0; }
  .doc { text-align: right; }
  .doc h2 { margin: 0; font-size: 24px; letter-spacing: 1px; ${avoir ? "color:#b42318;" : ""} }
  .doc .num { font-size: 15px; font-weight: bold; margin-top: 4px; }
  .cli { margin: 18px 0; padding: 12px 14px; border: 1px solid #d0d7de; border-radius: 6px; max-width: 360px; margin-left: auto; }
  .cli .t { font-size: 11px; color: #57606a; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f6f1e3; text-align: left; font-size: 12px; }
  th, td { border: 1px solid #d0d7de; padding: 7px 8px; }
  .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
  .tot { width: 300px; margin-left: auto; margin-top: 12px; }
  .tot td { border: none; padding: 4px 8px; } .tot .g td { font-size: 15px; font-weight: bold; border-top: 2px solid #1f2328; }
  .lettres { margin-top: 16px; font-style: italic; }
  .pied { margin-top: 36px; border-top: 1px solid #d0d7de; padding-top: 8px; font-size: 11px; color: #57606a; text-align: center; }
  .sign { margin-top: 28px; display: flex; justify-content: flex-end; } .sign div { width: 220px; text-align: center; border-top: 1px dashed #8c959f; padding-top: 4px; font-size: 11px; color: #57606a; }
  .barre { position: sticky; top: 0; background: #fff; padding: 8px 0 12px; display: flex; gap: 8px; }
  .barre button { font-size: 14px; padding: 8px 14px; border-radius: 6px; border: 1px solid #b8860b; background: #b8860b; color: #fff; cursor: pointer; }
  .barre button.sec { background: #fff; color: #8a6508; }
  @media print { .barre { display: none; } body { padding: 0; } }
</style></head><body>
<div class="barre"><button onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button><button class="sec" onclick="window.close()">Fermer</button></div>
<div class="tete">
  <div class="soc">
    <h1>${esc(s.nom || "FiltroPro")}</h1>
    ${s.activite ? `<p>${esc(s.activite)}</p>` : ""}
    ${s.adresse || s.ville ? `<p>${esc([s.adresse, s.ville].filter(Boolean).join(", "))}</p>` : ""}
    ${s.telephone || s.email ? `<p>${esc([s.telephone && "Tél. " + s.telephone, s.email].filter(Boolean).join(" · "))}</p>` : ""}
  </div>
  <div class="doc">
    <h2>${avoir ? "AVOIR" : "FACTURE"}</h2>
    <div class="num">N° ${esc(f.numero)}</div>
    <p>Date : ${dateFr(f.date)}</p>
    ${avoir && origine ? `<p>Sur facture n° ${esc(origine)}</p>` : ""}
  </div>
</div>
<div class="cli">
  <div class="t">${avoir ? "Avoir au nom de" : "Facturé à"}</div>
  <p><b>${esc(f.client_nom || "Client comptoir")}</b></p>
  ${f.client_adresse ? `<p>${esc(f.client_adresse)}</p>` : ""}
  ${f.client_ice ? `<p>ICE : ${esc(f.client_ice)}</p>` : ""}
</div>
<table>
  <thead><tr><th style="width:18%">Référence</th><th>Désignation</th><th class="c" style="width:8%">Qté</th><th class="r" style="width:15%">P.U. HT</th><th class="r" style="width:16%">Montant HT</th></tr></thead>
  <tbody>${lignes}</tbody>
</table>
<table class="tot">
  <tr><td>Total HT</td><td class="r">${mad(f.total_ht)} DH</td></tr>
  <tr><td>TVA ${taux} %</td><td class="r">${mad(f.tva)} DH</td></tr>
  <tr class="g"><td>Total TTC</td><td class="r">${mad(f.total_ttc)} DH</td></tr>
</table>
<p class="lettres">Arrêté${avoir ? " le présent avoir" : "e la présente facture"} à la somme de : <b>${esc(montantEnLettres(f.total_ttc))}</b> TTC.</p>
${f.note ? `<p style="font-size:12px;color:#57606a">${esc(f.note)}</p>` : ""}
<div class="sign"><div>Cachet et signature</div></div>
<div class="pied">${ids || "ICE · RC · IF : à compléter (page Factures → Mes informations)"}${s.rib ? `<br>RIB : ${esc(s.rib)}` : ""}${s.pied ? `<br>${esc(s.pied)}` : ""}</div>
</body></html>`);
  w.document.close();
}
