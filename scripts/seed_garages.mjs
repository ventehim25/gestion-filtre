// Insère quelques garages de test pour démontrer la carte + le circuit.
// Lancer : node scripts/seed_garages.mjs
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const supabase = createClient(SUPABASE_URL, SUPABASE_CLE);

const garages = [
  { nom: "Garage Atlas (test)", ville: "Tanger", region: "Tanger-Tétouan", latitude: 35.7595, longitude: -5.834, statut: "a_livrer", telephone: "0661000001", refs_demandees: "OP540\nW7015\nAP026/2", note: "Demande un devis pour 20 filtres huile." },
  { nom: "Garage El Menzeh (test)", ville: "Rabat", region: "Rabat-Salé", latitude: 34.0209, longitude: -6.8416, statut: "preparee", telephone: "0661000002", note: "Commande prête, passer le matin." },
  { nom: "Garage Anfa (test)", ville: "Casablanca", region: "Casablanca-Settat", latitude: 33.5731, longitude: -7.5898, statut: "livre", telephone: "0661000003", note: "Livré la semaine dernière." },
  { nom: "Garage Gueliz (test)", ville: "Marrakech", region: "Marrakech-Safi", latitude: 31.6295, longitude: -7.9811, statut: "a_livrer", telephone: "0661000004", refs_demandees: "Filtre habitacle x10" },
  { nom: "Garage Mogador (test)", ville: "Essaouira", region: "Marrakech-Safi", latitude: 31.5085, longitude: -9.7595, statut: "reporte", telephone: "0661000005", note: "Fermé au dernier passage, rappeler avant." },
];

const { data, error } = await supabase.from("garages").insert(garages).select("id,nom");
if (error) { console.error("Erreur:", error.message); process.exit(1); }
console.log(`✅ ${data.length} garages de test insérés:`);
data.forEach((g) => console.log("  -", g.nom));
