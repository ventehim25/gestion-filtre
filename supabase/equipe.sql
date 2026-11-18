-- FiltroPro — Équipe : gérer les comptes depuis l'appli (nouveauté n° 8, BIBLE §8.41)
-- À coller UNE fois dans l'éditeur SQL Supabase (https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new).
-- La liste utilisateurs_autorises reste fermée à l'appli : seules ces fonctions y touchent, et SEULEMENT pour le patron
-- (rôle « admin »). Un vendeur ne peut ni voir ni changer l'équipe. Sans danger à relancer.

-- Le patron = autorisé ET rôle « admin »
create or replace function public.est_patron() returns boolean
language sql stable security definer set search_path = public as $$
  select public.est_autorise() and public.mon_role() = 'admin';
$$;

-- Liste de l'équipe
create or replace function public.liste_equipe()
returns table (email text, nom text, role text, commercial_id uuid, ajoute_le timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.est_patron() then raise exception 'réservé au patron'; end if;
  return query select u.email, u.nom, u.role, u.commercial_id, u.ajoute_le from public.utilisateurs_autorises u order by u.ajoute_le;
end $$;

-- Ajouter une personne ou changer son rôle / son nom / son commercial
create or replace function public.enregistrer_membre(p_email text, p_nom text, p_role text, p_commercial uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.est_patron() then raise exception 'réservé au patron'; end if;
  if p_role not in ('admin', 'vendeur') then raise exception 'rôle inconnu'; end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email invalide'; end if;
  if lower(trim(p_email)) = lower(auth.jwt() ->> 'email') and p_role <> 'admin' then
    raise exception 'tu ne peux pas enlever ton propre rôle de patron';
  end if;
  insert into public.utilisateurs_autorises (email, nom, role, commercial_id)
  values (lower(trim(p_email)), nullif(trim(p_nom), ''), p_role, p_commercial)
  on conflict (email) do update set nom = excluded.nom, role = excluded.role, commercial_id = excluded.commercial_id;
end $$;

-- Retirer l'accès d'une personne (jamais soi-même)
create or replace function public.retirer_membre(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.est_patron() then raise exception 'réservé au patron'; end if;
  if lower(trim(p_email)) = lower(auth.jwt() ->> 'email') then raise exception 'tu ne peux pas te retirer toi-même'; end if;
  delete from public.utilisateurs_autorises where email = lower(trim(p_email));
end $$;

-- Le commercial lié à la personne connectée (mis tout seul sur ses ventes)
create or replace function public.mon_commercial() returns uuid
language sql stable security definer set search_path = public as $$
  select commercial_id from public.utilisateurs_autorises where lower(email) = lower(auth.jwt() ->> 'email') limit 1;
$$;

revoke all on function public.est_patron() from public, anon;
revoke all on function public.liste_equipe() from public, anon;
revoke all on function public.enregistrer_membre(text, text, text, uuid) from public, anon;
revoke all on function public.retirer_membre(text) from public, anon;
revoke all on function public.mon_commercial() from public, anon;
grant execute on function public.est_patron() to authenticated;
grant execute on function public.liste_equipe() to authenticated;
grant execute on function public.enregistrer_membre(text, text, text, uuid) to authenticated;
grant execute on function public.retirer_membre(text) to authenticated;
grant execute on function public.mon_commercial() to authenticated;

notify pgrst, 'reload schema';

-- Vérification : doit afficher 5
select count(*) as fonctions_equipe from pg_proc
where proname in ('est_patron', 'liste_equipe', 'enregistrer_membre', 'retirer_membre', 'mon_commercial');
