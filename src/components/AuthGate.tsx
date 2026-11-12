"use client";
// Porte d'entrée des pages de gestion (sécurité, supabase/securite.sql).
// - Tant que securite.sql n'a pas été lancé (table utilisateurs_autorises absente) : l'appli reste ouverte
//   comme avant, avec un bandeau d'avertissement. → La mise en ligne de ce code ne bloque personne.
// - Dès que securite.sql est lancé : connexion obligatoire (email + mot de passe Supabase Auth),
//   et seul un compte de la liste utilisateurs_autorises voit les données.
// - Hors-ligne (camion) : si une session a déjà été ouverte sur l'appareil, l'appli reste utilisable ;
//   la session se renouvelle toute seule au retour du réseau.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

const SESSION_KEY = "sb-wehsvgoolozqzxsgwibb-auth-token"; // clé de session supabase-js dans le navigateur
const FLAG_SECURITE = "fp_securite_active";               // mémorisé : la sécurité est installée

type Etat = "verif" | "ouvert" | "connecte" | "deconnecte" | "refuse";

function lire(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function ecrire(key: string, v: string) { try { localStorage.setItem(key, v); } catch { /* sans importance */ } }

async function securiteInstallee(): Promise<boolean | null> {
  // Vraie lecture (pas { head: true } : une requête « en-tête » répond 204 sans erreur même si la table n'existe pas)
  const { error } = await supabase.from("utilisateurs_autorises").select("email").limit(1);
  if (!error) return true;
  // Table inconnue = securite.sql pas encore lancé
  if (error.code === "PGRST205" || error.code === "42P01" || /does not exist|schema cache|Could not find/i.test(error.message)) return false;
  if (/fetch|network|Failed/i.test(error.message)) return null; // pas de réseau : on ne sait pas
  return true; // permission refusée = la table existe et elle est protégée
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [etat, setEtat] = useState<Etat>("verif");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function verifierAutorisation() {
    const { data, error } = await supabase.rpc("est_autorise");
    if (error) {
      // Hors-ligne ou fonction pas encore créée : on laisse passer, les règles de la base protègent les données
      setEtat("connecte");
      return;
    }
    setEtat(data ? "connecte" : "refuse");
  }

  useEffect(() => {
    let actif = true;
    // Sans réseau : session déjà ouverte sur l'appareil → on travaille ; sécurité jamais vue → ouvert ; sinon connexion
    const etatHorsLigne = (): Etat => (lire(SESSION_KEY) ? "connecte" : lire(FLAG_SECURITE) ? "deconnecte" : "ouvert");
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!actif) return;
        if (session) { ecrire(FLAG_SECURITE, "1"); await verifierAutorisation(); return; }
        if (typeof navigator !== "undefined" && !navigator.onLine) { setEtat(etatHorsLigne()); return; }
        const inst = await securiteInstallee();
        if (!actif) return;
        if (inst === false) { setEtat("ouvert"); return; }
        if (inst === null) { setEtat(etatHorsLigne()); return; }
        ecrire(FLAG_SECURITE, "1");
        setEtat("deconnecte");
      } catch {
        if (actif) setEtat(etatHorsLigne());
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_OUT") setEtat("deconnecte");
    });
    return () => { actif = false; sub.subscription.unsubscribe(); };
  }, []);

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setBusy(false);
    if (error) {
      setErreur(/invalid/i.test(error.message) ? "Email ou mot de passe incorrect." : /fetch|network/i.test(error.message) ? "Pas de connexion internet. Réessaie quand le réseau revient." : error.message);
      return;
    }
    setMdp("");
    ecrire(FLAG_SECURITE, "1");
    await verifierAutorisation();
  }

  if (etat === "verif") {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Chargement…</div>;
  }

  if (etat === "ouvert") {
    return (
      <>
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500/95 text-black text-xs text-center py-1 px-3">
          🔓 Base pas encore protégée : lance <b>supabase/securite.sql</b> (voir Guide « Sécurité »).
        </div>
        {children}
      </>
    );
  }

  if (etat === "connecte") return <>{children}</>;

  // Écran de connexion (ou compte non autorisé)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-5">
          <Logo size={36} />
          <div>
            <div className="font-bold text-lg">FiltroPro</div>
            <div className="text-xs text-slate-400">Espace de gestion · تسجيل الدخول</div>
          </div>
        </div>
        {etat === "refuse" ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-300">Ce compte est bien connecté, mais il n&apos;est pas dans la liste des personnes autorisées.</p>
            <p className="text-xs text-slate-400">Ajoute son email dans Supabase (table utilisateurs_autorises), puis reconnecte-toi.</p>
            <button className="btn-secondary w-full" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
          </div>
        ) : (
          <form onSubmit={connexion} className="space-y-3">
            <div>
              <label htmlFor="fp-email" className="text-xs text-slate-400">Email</label>
              <input id="fp-email" type="email" autoComplete="username" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="fp-mdp" className="text-xs text-slate-400">Mot de passe</label>
              <input id="fp-mdp" type="password" autoComplete="current-password" required className="input" value={mdp} onChange={(e) => setMdp(e.target.value)} />
            </div>
            {erreur && <p className="text-sm text-red-400">{erreur}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
            <p className="text-[11px] text-slate-500">Le catalogue public (/catalogue, /tarif, /c/…) reste accessible sans compte.</p>
          </form>
        )}
      </div>
    </div>
  );
}
