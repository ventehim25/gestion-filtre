@echo off
rem Sauvegarde quotidienne de la base FiltroPro (Planificateur de taches Windows : "FiltroPro-Sauvegarde", BIBLE 8.14)
rem Resultat : backups\AAAA-MM-JJ\ + journal dans backups\journal.log
cd /d "C:\Users\deux\Downloads\gestion filtre"
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist backups mkdir backups
echo ===== %date% %time% >> backups\journal.log
node scripts\sauvegarde.mjs >> backups\journal.log 2>&1
