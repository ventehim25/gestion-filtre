-- Segments clients, limite de crédit, suivi des relances (Bible §4.1).
-- Idempotent : peut être collé plusieurs fois sans risque.
alter table clients add column if not exists type text not null default 'comptoir';      -- 'comptoir' | 'garage' | 'gros'
alter table clients add column if not exists remise_pct numeric not null default 0;      -- remise en %, appliquée à la vente
alter table clients add column if not exists limite_credit numeric not null default 0;   -- 0 = pas de limite
alter table clients add column if not exists derniere_relance date;                      -- masque le client de la liste "à relancer" 7 jours

notify pgrst, 'reload schema';
