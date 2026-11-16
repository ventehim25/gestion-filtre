-- Remarque de montage d'une pièce sur une voiture (catalogues officiels de distribution, ex. Gates) :
-- « à partir de 09/2010 », « avec climatisation », « moteur K9K 608 », « avec roue dentée », « quantité : 2 »…
-- Sans elle, une voiture qui a deux kits (avant / après une date) les montrerait sans dire lequel prendre.
-- Idempotent : peut être collé deux fois sans risque. Aucune donnée existante n'est modifiée.

alter table public.applications add column if not exists remarque text;

-- Le catalogue public (fiche /c, véhicules compatibles) lit déjà toute la table applications (securite.sql) :
-- rien à ouvrir de plus pour anon.

notify pgrst, 'reload schema';

-- Vérification (doit afficher « remarque ») :
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'applications' and column_name = 'remarque';
