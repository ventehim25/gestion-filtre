"use client";
// Paramètres > Compte : qui est connecté + déconnexion (sécurité, voir AuthGate).
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CompteSection() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null)).catch(() => setEmail(null));
  }, []);

  return (
    <div className="card p-6 max-w-md mb-4">
      <h3 className="font-semibold text-slate-700 mb-2">Compte · الحساب</h3>
      {email ? (
        <>
          <p className="text-sm text-slate-500 mb-4">Connecté : <b>{email}</b></p>
          <button className="btn-secondary w-full" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </>
      ) : (
        <p className="text-sm text-slate-500">Pas de compte connecté. Tant que la base n&apos;est pas protégée (supabase/securite.sql), l&apos;appli reste ouverte.</p>
      )}
    </div>
  );
}
