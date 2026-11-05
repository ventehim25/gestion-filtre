@echo off
rem Robot de prospection quotidien (Planificateur de taches Windows : "FiltroPro-Prospection")
cd /d "C:\Users\deux\Downloads\gestion filtre"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ===== %date% %time% >> docs\prospects\osm\journal.log
node scripts\scrape_prospects_osm.mjs >> docs\prospects\osm\journal.log 2>&1
