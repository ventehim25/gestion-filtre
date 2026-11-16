-- FiltroPro — avances : mode de paiement (espèces ou chèque), nom de la personne, numéro et date du chèque,
-- chèque encaissé ou pas encore (16/11/2026, BIBLE §8.29).
-- À coller une fois dans l'éditeur SQL Supabase. Idempotent : peut être recollé sans risque.
-- Avant ce collage, l'appli écrit ces informations dans la note de l'avance (rien n'est perdu).
alter table public.avances add column if not exists mode text default 'especes';
alter table public.avances add column if not exists personne text;
alter table public.avances add column if not exists numero_cheque text;
alter table public.avances add column if not exists date_cheque date;
alter table public.avances add column if not exists cheque_encaisse boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'avances_mode_valide') then
    alter table public.avances add constraint avances_mode_valide check (mode in ('especes', 'cheque'));
  end if;
end $$;
notify pgrst, 'reload schema';
