@echo off
rem Robots de prospection quotidiens (Planificateur de taches Windows : "FiltroPro-Prospection")
rem OSM (gratuit) puis Google Places (si GOOGLE_MAPS_API_KEY dans .env.local) -> table prospects -> page /prospects
cd /d "C:\Users\deux\Downloads\gestion filtre"
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist docs\prospects\osm mkdir docs\prospects\osm
echo ===== %date% %time% >> docs\prospects\osm\journal.log
node scripts\scrape_prospects_osm.mjs >> docs\prospects\osm\journal.log 2>&1
node scripts\scrape_prospects_gmaps.mjs 30 >> docs\prospects\osm\journal.log 2>&1
