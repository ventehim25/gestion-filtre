"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/database";
import { MapPin, Phone, CheckCircle } from "lucide-react";

export default function TourneesPage() {
  const { t } = useLang();
  const [clients, setClients] = useState<Client[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("clients").select("*").order("ville").then(({ data }) => {
      setClients(data ?? []);
      setCities([...new Set((data ?? []).map(c => c.ville))].sort());
    });
  }, []);

  function toggleCity(city: string) {
    const next = new Set(selected);
    next.has(city) ? next.delete(city) : next.add(city);
    setSelected(next);
  }

  function toggleVisited(id: string) {
    const next = new Set(visited);
    next.has(id) ? next.delete(id) : next.add(id);
    setVisited(next);
  }

  const tourClients = clients.filter(c => selected.has(c.ville));
  const progress = tourClients.length > 0 ? Math.round((visited.size / tourClients.length) * 100) : 0;

  return (
    <div>
      <Header title="tours" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-3">{t("selectCities")}</h3>
          <div className="space-y-2">
            {cities.map(city => {
              const count = clients.filter(c => c.ville === city).length;
              return (
                <label key={city} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.has(city)} onChange={() => toggleCity(city)} className="w-4 h-4 accent-blue-600" />
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-sm font-medium">{city}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{count} {t("clientsInCity")}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected.size > 0 && (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">{t("planTour")}</span>
                <span className="text-sm font-bold text-blue-600">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{visited.size} / {tourClients.length} visités</p>
            </div>
          )}

          {selected.size === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              <MapPin size={40} className="mx-auto mb-3 text-slate-300" />
              <p>{t("selectCities")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...selected].sort().map(city => (
                <div key={city}>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <MapPin size={14} /> {city}
                  </h4>
                  {clients.filter(c => c.ville === city).map(c => (
                    <div key={c.id} className={`card p-4 mb-2 flex items-center justify-between ${visited.has(c.id) ? "opacity-60" : ""}`}>
                      <div>
                        <p className="font-medium text-slate-800">{c.nom}</p>
                        {c.telephone && (
                          <a href={`tel:${c.telephone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-0.5">
                            <Phone size={12} /> {c.telephone}
                          </a>
                        )}
                        {c.solde_du > 0 && <p className="text-xs text-orange-600 mt-1">Reste: {c.solde_du} MAD</p>}
                      </div>
                      <button
                        onClick={() => toggleVisited(c.id)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                          visited.has(c.id)
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600 hover:bg-green-50"
                        }`}
                      >
                        <CheckCircle size={16} />
                        {visited.has(c.id) ? "Visité" : "Marquer"}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
