-- ============================================================
-- TOURNÉES PRÉVUES (14/11/2026) — prévenir les clients la veille
-- On note la date d'une tournée et les villes. La veille au matin, une notification
-- rappelle d'envoyer le message WhatsApp aux clients de ces villes (page /tournees/prevenir)
-- pour qu'ils envoient leur commande. L'envoi se fait en 1 tap par client (pas d'envoi
-- automatique : WhatsApp bannit les numéros qui envoient en masse).
-- Idempotent. À coller dans l'éditeur SQL Supabase.
-- ============================================================

create table if not exists public.tournees_prevues (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  date_tournee  date not null,
  villes        text[] not null default '{}',
  message       text not null default '',
  envoyes       text[] not null default '{}'   -- id des clients déjà prévenus
);
create index if not exists tournees_prevues_date on public.tournees_prevues (date_tournee);

-- Sécurité (même règle que les autres tables : équipe autorisée seulement)
alter table public.tournees_prevues enable row level security;
drop policy if exists equipe on public.tournees_prevues;
create policy equipe on public.tournees_prevues for all to authenticated
  using (public.est_autorise()) with check (public.est_autorise());
revoke all on public.tournees_prevues from anon;
grant select, insert, update, delete on public.tournees_prevues to authenticated;

notify pgrst, 'reload schema';
