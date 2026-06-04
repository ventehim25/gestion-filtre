"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import VoiceButton from "@/components/VoiceButton";
import {
  Task, World, WORLDS, worldMeta, getTasks, addTask, toggleDone, removeTask,
  updateTask, tasksForToday, getNotes, setNotes, activeRoutines, markRoutineDone,
  todayStr, Routine,
} from "@/lib/tasks";
import { Plus, Check, Trash2, Star, Calendar, ChevronRight, WifiOff } from "lucide-react";

export default function QuotidienPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [tab, setTab] = useState<World>("filtres");
  const [draft, setDraft] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [notes, setNotesState] = useState("");

  function reload() { setTasks(getTasks()); setRoutines(activeRoutines()); }

  useEffect(() => { reload(); }, []);
  useEffect(() => { setNotesState(getNotes(tab)); }, [tab]);

  const meta = worldMeta(tab);
  const today = tasksForToday(tasks);
  const tabTasks = tasks.filter((t) => t.world === tab).sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt);

  function add(title: string, due: string | null) {
    if (!title.trim()) return;
    addTask(tab, title, due || null, false);
    setDraft(""); setDraftDue("");
    reload();
  }
  function onToggle(id: string) { toggleDone(id); reload(); }
  function onRemove(id: string) { removeTask(id); reload(); }
  function onPriority(t: Task) { updateTask(t.id, { priority: !t.priority }); reload(); }
  function saveNotes(text: string) { setNotesState(text); setNotes(tab, text); }
  function doneRoutine(r: Routine) { markRoutineDone(r.key, r.periodId); reload(); }

  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <Header title="myDay" />

      {/* Date + statut hors-ligne */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-slate-400 text-sm capitalize">{dateLabel}</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          <WifiOff size={12} /> Marche hors-ligne
        </span>
      </div>

      {/* Rappels automatiques (irrigation / stock) */}
      {routines.length > 0 && (
        <div className="space-y-3 mb-6">
          {routines.map((r) => (
            <div key={r.key}
              className={`card p-4 flex items-center gap-4 border-l-4 ${r.done ? "border-l-slate-600 opacity-60" : "border-l-emerald-500"}`}>
              <span className="text-2xl shrink-0">{r.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${r.done ? "text-slate-400 line-through" : "text-slate-100"}`}>{r.title}</p>
                <p className="text-xs text-slate-500">{r.sub}</p>
              </div>
              {r.href && !r.done && (
                <Link href={r.href} className="btn-secondary text-xs inline-flex items-center gap-1 shrink-0">
                  Voir <ChevronRight size={13} />
                </Link>
              )}
              <button onClick={() => doneRoutine(r)} disabled={r.done}
                className={`shrink-0 h-9 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${
                  r.done ? "bg-slate-700 text-slate-400" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}>
                <Check size={15} /> {r.done ? "Fait" : "Fait ✓"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mes priorités du jour */}
      <div className="card p-5 mb-6">
        <h3 className="flex items-center gap-2 font-semibold text-slate-100 mb-3">
          <Star size={17} className="text-amber-400" fill="currentColor" /> Mes priorités du jour
        </h3>
        {today.length === 0 ? (
          <p className="text-sm text-slate-500 py-3 text-center">
            Rien d&apos;urgent aujourd&apos;hui 🎉 — ajoute une échéance ou une ⭐ priorité à une tâche pour la voir ici.
          </p>
        ) : (
          <div className="space-y-1.5">
            {today.map((t) => {
              const m = worldMeta(t.world);
              const overdue = t.due && t.due < todayStr();
              return (
                <div key={t.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                  <button onClick={() => onToggle(t.id)}
                    className="h-5 w-5 shrink-0 rounded-md border-2 border-slate-500 hover:border-emerald-500 flex items-center justify-center transition-colors" />
                  <span className="flex-1 text-sm text-slate-200">{t.title}</span>
                  {overdue && <span className="text-[10px] text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">en retard</span>}
                  <span className="text-base shrink-0" title={m.label}>{m.emoji}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Onglets : les 5 mondes */}
      <div className="flex flex-wrap gap-2 mb-4">
        {WORLDS.map((w) => {
          const count = tasks.filter((t) => t.world === w.key && !t.done).length;
          return (
            <button key={w.key} onClick={() => setTab(w.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === w.key ? "bg-red-600 text-white shadow-lg shadow-red-950/40" : "btn-secondary"}`}>
              <span>{w.emoji}</span> {w.label}
              {count > 0 && <span className={`text-[10px] rounded-full px-1.5 ${tab === w.key ? "bg-white/25" : "bg-red-500/20 text-red-400"}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-100 mb-4">
          <span className="text-xl">{meta.emoji}</span> {meta.label}
        </h3>

        {/* Projet (terrain/garage) : prochaine action + notes */}
        {meta.isProject && (
          <div className="mb-5">
            <p className="text-xs text-slate-500 mb-2">📝 Idées / notes du projet :</p>
            <textarea value={notes} onChange={(e) => saveNotes(e.target.value)} rows={4}
              placeholder={tab === "garage"
                ? "Ex : Ville Tétouan ou Salé ? · vidange rapide + vente produits · budget de départ…"
                : "Ex : zones à visiter · prix au m² · contacts agents · superficie souhaitée…"}
              className="input resize-y" />
            <p className="text-[11px] text-slate-600 mt-1">Sauvegarde automatique, hors-ligne.</p>
            <p className="text-xs text-slate-500 mt-4 mb-1">➜ Prochaines actions :</p>
          </div>
        )}

        {/* Liste des tâches du monde */}
        {tabTasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">Aucune tâche ici pour l&apos;instant.</p>
        ) : (
          <div className="space-y-1.5 mb-4">
            {tabTasks.map((t) => (
              <div key={t.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${t.done ? "opacity-50" : "bg-slate-50"}`}>
                <button onClick={() => onToggle(t.id)}
                  className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                    t.done ? "bg-emerald-600 border-emerald-600" : "border-slate-500 hover:border-emerald-500"}`}>
                  {t.done && <Check size={13} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${t.done ? "line-through text-slate-500" : "text-slate-200"}`}>{t.title}</span>
                  {t.due && (
                    <span className="ms-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar size={11} /> {t.due}
                    </span>
                  )}
                </div>
                <button onClick={() => onPriority(t)} title="Épingler en priorité"
                  className={`shrink-0 ${t.priority ? "text-amber-400" : "text-slate-600 hover:text-amber-400"}`}>
                  <Star size={16} fill={t.priority ? "currentColor" : "none"} />
                </button>
                <button onClick={() => onRemove(t.id)} className="shrink-0 text-slate-600 hover:text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ajout rapide + voix */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
          <div className="relative flex-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(draft, draftDue); }}
              placeholder={`+ Note rapide dans ${meta.label}…`} className="input" />
          </div>
          <input type="date" value={draftDue} onChange={(e) => setDraftDue(e.target.value)}
            title="Échéance (optionnel)" className="input sm:w-auto" />
          <div className="flex gap-2">
            <VoiceButton className="h-[42px] w-12 rounded-lg" onResult={(txt) => add(txt, draftDue)} />
            <button onClick={() => add(draft, draftDue)}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 rounded-lg font-medium inline-flex items-center justify-center gap-1.5">
              <Plus size={17} /> Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
