"use client";
export const dynamic = "force-dynamic";
// Page ouverte par la notification push « Relance catalogue ».
// Liste les clients à relancer (cadence 15 j après vente / 5 j après relance sans vente)
// et permet d'envoyer le catalogue en 1 tap sur WhatsApp.
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/whatsapp";
import { TARIF_KEY } from "@/lib/catalogue";
import { loadRelancesCatalogue, RelanceClient } from "@/lib/relances";
import { Send, RefreshCw } from "lucide-react";

const TARIF_URL = `https://gestion-filtre.vercel.app/tarif?k=${TARIF_KEY}`;

export default function RelancesCataloguePage() {
  const [list, setList] = useState<RelanceClient[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setList(await loadRelancesCatalogue());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function envoyer(c: RelanceClient) {
    const msg = `Salam ${c.nom} 🙏 Voici notre *catalogue à jour* (prix du jour) : ${TARIF_URL}\nDis-moi ce qu'il te faut, je te prépare ça et je te livre 👍`;
    sendWhatsApp(c.telephone, msg);
    const today = new Date().toISOString().slice(0, 10);
    try { await supabase.from("clients").update({ derniere_relance_catalogue: today }).eq("id", c.id); } catch { /* colonne absente */ }
    setList(prev => prev.filter(x => x.id !== c.id)); // sort de la liste (reviendra dans 5 j s'il n'achète pas)
  }

  return (
    <div>
      <Header title="dashboard" action={
        <button onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={15} /> <span className="hidden sm:inline">Rafraîchir</span></button>
      } />

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-slate-700">📋 Clients à relancer avec le catalogue</h2>
        <p className="text-sm text-slate-500 mt-1">Vendu → relance 15 j après · Relancé sans vente → 5 j après. Envoie le catalogue, le client ressortira de la liste.</p>
      </div>

      {loading ? (
        <p className="text-slate-400 p-6 text-center">Chargement…</p>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <div className="text-4xl mb-2">🎉</div>
          Aucun client à relancer aujourd'hui.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(c => (
            <div key={c.id} className="card p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-800 truncate">{c.nom}</div>
                <div className="text-xs text-slate-500">
                  {c.lastSale ? `Dernier achat : ${c.lastSale}` : "Jamais acheté"}
                  {c.jours > 0 && <span className="text-amber-600"> · en retard de {c.jours} j</span>}
                </div>
              </div>
              <button onClick={() => envoyer(c)} className="btn-primary flex items-center gap-2 shrink-0">
                <Send size={15} /> Envoyer le catalogue
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
