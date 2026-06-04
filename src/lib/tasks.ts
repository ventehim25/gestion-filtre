// Gestion des tâches "Mon Quotidien" — 100% hors-ligne (localStorage).
// Même esprit que offlineSales.ts : aucune dépendance réseau, tout reste sur l'appareil.
// 5 mondes : filtres, ferme, maison, terrain, garage.
// + Rappels qui reviennent tout seuls : irrigation (vendredi/samedi) et vérif stock (hebdo).

export type World = "filtres" | "ferme" | "maison" | "terrain" | "garage";

export type Task = {
  id: string;
  title: string;
  world: World;
  due: string | null;   // échéance "YYYY-MM-DD" (ou null)
  priority: boolean;     // épinglée dans "Aujourd'hui"
  done: boolean;
  createdAt: number;
  doneAt: number | null;
};

export const WORLDS: { key: World; emoji: string; label: string; isProject: boolean }[] = [
  { key: "filtres", emoji: "🔧", label: "Filtres", isProject: false },
  { key: "ferme", emoji: "🫒", label: "Ferme", isProject: false },
  { key: "maison", emoji: "🏠", label: "Maison", isProject: false },
  { key: "terrain", emoji: "🏗️", label: "Terrain", isProject: true },
  { key: "garage", emoji: "🚗", label: "Garage", isProject: true },
];

export function worldMeta(w: World) {
  return WORLDS.find((x) => x.key === w) ?? WORLDS[0];
}

// ---------- dates ----------
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- tâches ----------
const TASKS_KEY = "filtropro_tasks";

export function getTasks(): Task[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); } catch { return []; }
}
function setTasks(list: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(list));
}

export function addTask(world: World, title: string, due: string | null = null, priority = false): Task {
  const t: Task = {
    id: (crypto.randomUUID?.() ?? String(Date.now() + Math.random())),
    title: title.trim(), world, due, priority, done: false,
    createdAt: Date.now(), doneAt: null,
  };
  setTasks([...getTasks(), t]);
  return t;
}

export function updateTask(id: string, patch: Partial<Task>) {
  setTasks(getTasks().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function toggleDone(id: string) {
  setTasks(getTasks().map((t) =>
    t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : null } : t
  ));
}

export function removeTask(id: string) {
  setTasks(getTasks().filter((t) => t.id !== id));
}

// Tâches du jour : en retard OU dues aujourd'hui OU épinglées priorité — non terminées.
// Triées : en retard d'abord, puis aujourd'hui, puis priorités sans date.
export function tasksForToday(all: Task[]): Task[] {
  const today = todayStr();
  const rank = (t: Task) => {
    if (t.due && t.due < today) return 0;   // en retard
    if (t.due === today) return 1;          // aujourd'hui
    return 2;                               // priorité sans date
  };
  return all
    .filter((t) => !t.done && ((t.due && t.due <= today) || t.priority))
    .sort((a, b) => rank(a) - rank(b) || (a.createdAt - b.createdAt));
}

// ---------- notes de projet (terrain / garage) ----------
const NOTES_KEY = "filtropro_project_notes";

type NotesMap = Partial<Record<World, string>>;

export function getNotes(world: World): string {
  if (typeof localStorage === "undefined") return "";
  try {
    const m: NotesMap = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
    return m[world] ?? "";
  } catch { return ""; }
}
export function setNotes(world: World, text: string) {
  let m: NotesMap = {};
  try { m = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"); } catch { /* */ }
  m[world] = text;
  localStorage.setItem(NOTES_KEY, JSON.stringify(m));
}

// ---------- rappels récurrents (cochés par date) ----------
const ROUTINE_KEY = "filtropro_routine_done";

type RoutineMap = Record<string, string>; // key -> dernière date "faite"

function getRoutineMap(): RoutineMap {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ROUTINE_KEY) || "{}"); } catch { return {}; }
}
export function isRoutineDone(key: string, periodId: string): boolean {
  return getRoutineMap()[key] === periodId;
}
export function markRoutineDone(key: string, periodId: string) {
  const m = getRoutineMap();
  m[key] = periodId;
  localStorage.setItem(ROUTINE_KEY, JSON.stringify(m));
}

// Numéro de semaine ISO (pour le rappel hebdo "stock faible")
export function weekId(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

// Rappels actifs aujourd'hui (cartes en haut de page).
export type Routine = {
  key: string; periodId: string; emoji: string; title: string; sub: string;
  href?: string; done: boolean;
};

export function activeRoutines(): Routine[] {
  const d = new Date();
  const day = d.getDay(); // 0 dim … 5 ven, 6 sam
  const today = todayStr();
  const out: Routine[] = [];

  // 🫒 Irrigation : vendredi (5) et samedi (6) — jours du puits
  if (day === 5 || day === 6) {
    out.push({
      key: "irrigation", periodId: today, emoji: "🫒",
      title: "Irrigation oliviers",
      sub: "Jour du puits — aujourd'hui",
      done: isRoutineDone("irrigation", today),
    });
  }

  // 🔧 Vérif stock filtres faible : une fois par semaine (lundi)
  if (day === 1) {
    const wk = weekId(d);
    out.push({
      key: "stock_check", periodId: wk, emoji: "🔧",
      title: "Vérifier le stock faible",
      sub: "Contrôle hebdomadaire des filtres",
      href: "/produits", done: isRoutineDone("stock_check", wk),
    });
  }

  return out;
}
