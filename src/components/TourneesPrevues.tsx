"use client";
// Bloc « Prévenir les clients » de /tournees : on programme une tournée (date + villes).
// La veille à 9 h, la notification du matin rappelle d'envoyer le message (page /tournees/prevenir).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { TourneePrevue } from "@/types/database";
import {
  MESSAGE_DEFAUT, chargerClients, chargerTourneesAVenir, clientsDesVilles, dateCourte, dateMaroc,
  remplirMessage, villesAvecNombre, type ClientTournee,
} from "@/lib/tourneesPrevues";
import { CalendarClock, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function TourneesPrevues() {
  const [clients, setClients] = useState<ClientTournee[]>([]);
  const [tournees, setTournees] = useState<TourneePrevue[]>([]);
  const [absente, setAbsente] = useState(false);
  const [date, setDate] = useState(dateMaroc(1));
  const [villes, setVilles] = useState<string[]>([]);
  const [message, setMessage] = useState(MESSAGE_DEFAUT);
  const [voirMessage, setVoirMessage] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [cl, t] = await Promise.all([chargerClients(), chargerTourneesAVenir()]);
      setClients(cl); setTournees(t.tournees); setAbsente(t.absente);
    } catch (e) { console.error(e); }
  }
  useEffect(() => { load(); }, []);

  const listeVilles = useMemo(() => villesAvecNombre(clients), [clients]);
  const choisis = useMemo(() => clientsDesVilles(clients, villes), [clients, villes]);
  const exemple = choisis[0] ? remplirMessage(message, choisis[0], date) : "";

  function basculer(v: string) {
    setVilles((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function programmer() {
    if (!date || villes.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("tournees_prevues").insert({ date_tournee: date, villes, message: message === MESSAGE_DEFAUT ? "" : message });
    setBusy(false);
    if (error) { alert("Impossible d'enregistrer : " + error.message); return; }
    setVilles([]); setMessage(MESSAGE_DEFAUT); setVoirMessage(false);
    load();
  }

  async function supprimer(t: TourneePrevue) {
    if (!confirm(`Supprimer la tournée du ${dateCourte(t.date_tournee)} (${t.villes.join(", ")}) ?`)) return;
    await supabase.from("tournees_prevues").delete().eq("id", t.id);
    load();
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
        <CalendarClock size={16} className="text-red-400" /> Prévenir les clients
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Choisis le jour de la tournée et les villes. La veille à 9 h, ton téléphone te rappelle d&apos;envoyer le message
        WhatsApp aux clients de ces villes, pour qu&apos;ils envoient leur commande.
      </p>

      {absente ? (
        <p className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">
          Pas encore activé : il faut coller une fois <code>supabase/tournees_prevues.sql</code> dans Supabase.
        </p>
      ) : (
        <>
          {/* Tournées déjà programmées */}
          {tournees.length > 0 && (
            <div className="space-y-2 mb-4">
              {tournees.map((t) => {
                const nb = clientsDesVilles(clients, t.villes).length;
                const faits = t.envoyes.length;
                const demain = t.date_tournee === dateMaroc(1);
                return (
                  <div key={t.id} className={`rounded-lg px-3 py-2 bg-[var(--surface-2)] ${demain ? "ring-1 ring-amber-400/60" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">
                          {demain && <span className="text-amber-300">Demain · </span>}{dateCourte(t.date_tournee)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{t.villes.join(", ")}</p>
                        <p className={`text-xs ${faits >= nb && nb > 0 ? "text-green-400" : "text-slate-400"}`}>{Math.min(faits, nb)}/{nb} prévenus</p>
                      </div>
                      <button onClick={() => supprimer(t)} className="text-slate-500 hover:text-red-400 shrink-0" title="Supprimer"><Trash2 size={14} /></button>
                    </div>
                    <Link href={`/tournees/prevenir?id=${t.id}`} className="btn-primary text-xs mt-2 inline-flex items-center gap-1.5">
                      <Send size={13} /> Envoyer le message
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nouvelle tournée */}
          <label className="text-xs text-slate-400 mb-1 block">Jour de la tournée</label>
          <input type="date" className="input mb-3" value={date} min={dateMaroc(0)} onChange={(e) => setDate(e.target.value)} />

          <label className="text-xs text-slate-400 mb-1 block">Villes</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {listeVilles.map(({ ville, nb }) => (
              <button key={ville} onClick={() => basculer(ville)}
                className={`text-xs px-2.5 py-1 rounded-full ${villes.includes(ville) ? "bg-red-600 text-white" : "btn-secondary"}`}>
                {ville} · {nb}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {villes.length === 0 ? "Choisis une ou plusieurs villes." : `${choisis.length} client${choisis.length > 1 ? "s" : ""} à prévenir.`}
          </p>

          <button onClick={() => setVoirMessage(!voirMessage)} className="text-xs text-blue-400 hover:underline flex items-center gap-1 mb-2">
            {voirMessage ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Voir ou modifier le message
          </button>
          {voirMessage && (
            <div className="mb-3">
              <textarea dir="auto" className="input text-sm" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
              <p className="text-[11px] text-slate-500 mt-1">{"{nom}"}, {"{ville}"} et {"{jour}"} se remplissent tout seuls pour chaque client.</p>
              {exemple && (
                <div className="mt-2 text-xs text-slate-300 bg-[var(--surface-2)] rounded-lg px-3 py-2 whitespace-pre-line" dir="auto">
                  <span className="text-slate-500">Exemple pour {choisis[0].nom} :</span>{"\n"}{exemple}
                </div>
              )}
              {message !== MESSAGE_DEFAUT && (
                <button onClick={() => setMessage(MESSAGE_DEFAUT)} className="text-[11px] text-slate-400 hover:text-white mt-1">Remettre le message de départ</button>
              )}
            </div>
          )}

          <button onClick={programmer} disabled={busy || villes.length === 0 || !date} className="btn-primary w-full disabled:opacity-50">
            {busy ? "…" : "📅 Programmer la tournée"}
          </button>
        </>
      )}
    </div>
  );
}
