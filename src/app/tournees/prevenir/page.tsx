"use client";
export const dynamic = "force-dynamic";
// Page ouverte par la notification de la veille (ou par « Envoyer le message » dans /tournees).
// Liste les clients des villes de la tournée ; 1 tap = WhatsApp ouvert avec le message prêt,
// le client est coché « prévenu ». L'envoi reste à toi (pas d'envoi en masse : risque de bannissement).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/whatsapp";
import type { TourneePrevue } from "@/types/database";
import {
  chargerClients, clientsDesVilles, dateCourte, dateMaroc, remplirMessage, tableAbsente, type ClientTournee,
} from "@/lib/tourneesPrevues";
import { Send, Check, ArrowLeft, PhoneOff } from "lucide-react";

export default function PrevenirPage() {
  const [tournee, setTournee] = useState<TourneePrevue | null>(null);
  const [clients, setClients] = useState<ClientTournee[]>([]);
  const [etat, setEtat] = useState<"chargement" | "ok" | "introuvable" | "absente">("chargement");

  useEffect(() => {
    (async () => {
      const id = new URLSearchParams(window.location.search).get("id");
      // Sans id (ancienne notification) : la prochaine tournée à venir
      const q = supabase.from("tournees_prevues").select("*");
      const { data, error } = id
        ? await q.eq("id", id).maybeSingle()
        : await q.gte("date_tournee", dateMaroc(0)).order("date_tournee").limit(1).maybeSingle();
      if (error) { setEtat(tableAbsente(error) ? "absente" : "introuvable"); return; }
      if (!data) { setEtat("introuvable"); return; }
      setTournee(data as TourneePrevue);
      setClients(await chargerClients());
      setEtat("ok");
    })().catch(() => setEtat("introuvable"));
  }, []);

  const liste = useMemo(() => (tournee ? clientsDesVilles(clients, tournee.villes) : []), [clients, tournee]);
  const envoyes = new Set(tournee?.envoyes ?? []);
  const reste = liste.filter((c) => !envoyes.has(c.id) && c.telephone).length;

  async function envoyer(c: ClientTournee) {
    if (!tournee) return;
    sendWhatsApp(c.telephone, remplirMessage(tournee.message, c, tournee.date_tournee));
    if (envoyes.has(c.id)) return;
    const maj = [...tournee.envoyes, c.id];
    setTournee({ ...tournee, envoyes: maj });
    await supabase.from("tournees_prevues").update({ envoyes: maj }).eq("id", tournee.id);
  }

  return (
    <div>
      <Header title="tours" action={
        <Link href="/tournees" className="btn-secondary flex items-center gap-2"><ArrowLeft size={15} /> Tournées</Link>
      } />

      {etat === "chargement" && <p className="text-slate-400 p-6 text-center">Chargement…</p>}
      {etat === "absente" && (
        <div className="card p-6 text-center text-amber-300">Pas encore activé : il faut coller une fois <code>supabase/tournees_prevues.sql</code> dans Supabase.</div>
      )}
      {etat === "introuvable" && (
        <div className="card p-6 text-center text-slate-400">
          Aucune tournée trouvée. Programme-la dans <Link href="/tournees" className="text-blue-400 hover:underline">Tournées</Link> → « Prévenir les clients ».
        </div>
      )}

      {etat === "ok" && tournee && (
        <>
          <div className="card p-4 mb-4">
            <h2 className="font-semibold text-slate-100">🚚 Tournée du {dateCourte(tournee.date_tournee)} · {tournee.villes.join(", ")}</h2>
            <p className="text-sm text-slate-400 mt-1">
              Touche « Envoyer » : WhatsApp s&apos;ouvre avec le message prêt, tu n&apos;as plus qu&apos;à appuyer sur envoyer.
              {" "}{reste === 0 && liste.length > 0 ? <span className="text-green-400">Tout le monde est prévenu ✓</span> : <span>Encore {reste} à prévenir.</span>}
            </p>
          </div>

          {liste.length === 0 ? (
            <div className="card p-6 text-center text-slate-400">Aucun client dans ces villes.</div>
          ) : (
            <div className="space-y-2">
              {liste.map((c) => {
                const fait = envoyes.has(c.id);
                return (
                  <div key={c.id} className={`card p-3 flex items-center gap-3 ${fait ? "opacity-60" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate">{c.nom}</div>
                      <div className="text-xs text-slate-400">{[c.ville, c.quartier].filter(Boolean).join(" · ")}</div>
                    </div>
                    {!c.telephone ? (
                      <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0"><PhoneOff size={13} /> pas de numéro</span>
                    ) : (
                      <button onClick={() => envoyer(c)} className={`${fait ? "btn-secondary" : "btn-primary"} flex items-center gap-2 shrink-0`}>
                        {fait ? <><Check size={15} /> Prévenu</> : <><Send size={15} /> Envoyer</>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
