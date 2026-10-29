-- Notifications push (relance catalogue) — à coller dans l'éditeur SQL Supabase.
-- 1) Abonnements push des appareils (ton téléphone/PC avec l'app installée).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  endpoint text not null unique,        -- identifiant unique de l'appareil/navigateur
  p256dh text not null,                 -- clé publique du client (chiffrement)
  auth text not null,                   -- secret d'authentification du client
  user_agent text                       -- pour reconnaître l'appareil
);
alter table push_subscriptions enable row level security;
drop policy if exists push_all on push_subscriptions;
create policy push_all on push_subscriptions for all using (true) with check (true);

-- 2) Cadence de relance par le catalogue (indépendante des autres relances) :
--    vendu -> re-relance 15 j après la vente ; relancé sans vente -> 5 j après.
alter table clients add column if not exists derniere_relance_catalogue date;

notify pgrst, 'reload schema';
