-- Huile moteur : marques où chaque code moteur a été relevé (BIBLE §8.21).
-- Un même code peut désigner 2 moteurs différents selon la marque (« F4A » = Ford Fiesta 1.4 ET moteur de camion Iveco) :
-- l'huile ne s'affiche que pour une voiture de la même famille de marques (vide = toutes les marques).
-- Sans risque, recollable.
alter table public.huiles_moteurs add column if not exists marques text[];
comment on column public.huiles_moteurs.marques is 'Marques où ce code moteur a été relevé dans le guide (vide = toutes)';
notify pgrst, 'reload schema';
