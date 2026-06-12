-- Code-barres par variante de marque (chaque boîte Mann/Flag/Bosch a le sien).
-- Idempotent : peut être collé plusieurs fois sans risque.
alter table equivalences add column if not exists code_barre text;

-- Recherche rapide par code-barres au moment de la vente.
create index if not exists equivalences_code_barre_idx on equivalences (code_barre);

-- Recharge le cache PostgREST pour que l'app voie la colonne.
notify pgrst, 'reload schema';
