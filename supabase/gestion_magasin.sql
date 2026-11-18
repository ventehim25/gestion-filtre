-- Les 8 nouveautés inspirées du logiciel de dinoun (GMP 2022) — BIBLE §8.41. Demande de l'utilisateur (18/11/2026) :
-- « ok on fait les 8 ». UN SEUL collage pour tout. Idempotent (peut être collé deux fois), aucune donnée existante modifiée.
--   1. dépenses + caisse du jour       2. retours clients / fournisseur    3. factures numérotées + avoirs
--   4. échéancier (chèques, crédits)   5. stock de la voiture + transferts  6. inventaire + régularisation + historique
--   7. rentabilité (rien à créer)      8. rôles des utilisateurs, commerciaux, banque
-- Chaque table : RLS fermé, règle « equipe » avec (select …) (BIBLE §8.20).

-- ───────────── 1. Dépenses + caisse ─────────────
create table if not exists public.depenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  montant numeric not null check (montant > 0),
  categorie text not null default 'autre',
  mode text not null default 'especes' check (mode in ('especes', 'banque', 'cheque')),
  note text,
  created_at timestamptz not null default now()
);
-- Chaque argent reçu d'un client (à la vente ou plus tard) : la caisse du jour, l'échéancier des chèques
create table if not exists public.paiements_clients (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  date date not null default current_date,
  montant numeric not null,
  mode text not null default 'especes' check (mode in ('especes', 'cheque', 'virement', 'avoir')),
  cle text not null default gen_random_uuid()::text,  -- « vente » = paiement à la création du bon (pas de doublon si le réseau coupe)
  numero_cheque text,
  banque text,
  date_echeance date,
  encaisse boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (sale_id, cle)
);
create table if not exists public.caisse_journees (
  date date primary key,
  fond_debut numeric not null default 0,
  compte_fin numeric,
  ecart numeric,
  note text,
  cloture_le timestamptz
);

-- ───────────── 2. Retours ─────────────
create table if not exists public.retours_clients (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  date date not null default current_date,
  lignes jsonb not null default '[]'::jsonb,   -- [{ product_id, equivalence_id, ref, quantite, prix_unitaire, cout_unitaire }]
  montant numeric not null default 0,
  cout numeric not null default 0,
  mode text not null check (mode in ('avoir', 'rembourse', 'deduit')),
  note text,
  created_at timestamptz not null default now()
);
-- Retour au fournisseur = une « réception » en négatif (stock et dette baissent)
alter table public.receptions add column if not exists type text not null default 'reception';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'receptions_type_check') then
    alter table public.receptions add constraint receptions_type_check check (type in ('reception', 'retour'));
  end if;
end $$;

-- ───────────── 3. Factures + avoirs ─────────────
alter table public.clients add column if not exists ice text;
create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  type text not null default 'facture' check (type in ('facture', 'avoir')),
  sale_id uuid references public.sales(id) on delete set null,
  facture_origine uuid references public.factures(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  date date not null default current_date,
  client_nom text,
  client_ice text,
  client_adresse text,
  lignes jsonb not null default '[]'::jsonb,   -- [{ reference, designation, quantite, prix_ttc }]
  taux_tva numeric not null default 20,
  total_ht numeric not null default 0,
  tva numeric not null default 0,
  total_ttc numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.compteurs (cle text primary key, valeur integer not null default 0);
-- Numéro suivant sans trou ni doublon : F2026-0001, A2026-0001 (avoir)
create or replace function public.prochain_numero(p_type text) returns text
language plpgsql security definer set search_path = public as $$
declare v_cle text; v_n integer; v_lettre text;
begin
  if not public.est_autorise() then raise exception 'non autorisé'; end if;
  v_lettre := case when p_type = 'avoir' then 'A' else 'F' end;
  v_cle := v_lettre || extract(year from current_date)::text;
  insert into public.compteurs (cle, valeur) values (v_cle, 1)
    on conflict (cle) do update set valeur = public.compteurs.valeur + 1
    returning valeur into v_n;
  return v_cle || '-' || lpad(v_n::text, 4, '0');
end $$;
revoke all on function public.prochain_numero(text) from public, anon;
grant execute on function public.prochain_numero(text) to authenticated;

-- ───────────── 5. Stock de la voiture (dépôts) + transferts ─────────────
create table if not exists public.stock_depots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  equivalence_id uuid references public.equivalences(id) on delete cascade,
  depot text not null default 'voiture',
  quantite integer not null default 0,
  maj_le timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stock_depots_unique') then
    alter table public.stock_depots add constraint stock_depots_unique unique nulls not distinct (product_id, equivalence_id, depot);
  end if;
end $$;
create table if not exists public.transferts (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  depot_de text not null,
  depot_vers text not null,
  lignes jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

-- ───────────── 6. Inventaire + régularisation (historique d'un article) ─────────────
create table if not exists public.inventaires (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'valide')),
  lignes jsonb not null default '[]'::jsonb,   -- brouillon : [{ product_id, equivalence_id, compte }]
  note text,
  valide_le timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.regularisations (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  product_id uuid not null references public.products(id) on delete cascade,
  equivalence_id uuid references public.equivalences(id) on delete set null,
  quantite integer not null,                   -- + ajout, − retrait
  stock_avant integer,
  stock_apres integer,
  motif text not null default 'correction',    -- casse, perte, vol, erreur, inventaire, correction
  inventaire_id uuid references public.inventaires(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- ───────────── 8. Commerciaux, rôles, banque ─────────────
create table if not exists public.commerciaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  commission_pct numeric not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sales add column if not exists commercial_id uuid references public.commerciaux(id) on delete set null;
alter table public.utilisateurs_autorises add column if not exists role text not null default 'admin';
alter table public.utilisateurs_autorises add column if not exists nom text;
alter table public.utilisateurs_autorises add column if not exists commercial_id uuid references public.commerciaux(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'utilisateurs_role_check') then
    alter table public.utilisateurs_autorises add constraint utilisateurs_role_check check (role in ('admin', 'vendeur'));
  end if;
end $$;
-- Le rôle de la personne connectée (« admin » si elle n'est pas trouvée par son email)
create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.utilisateurs_autorises where lower(email) = lower(auth.jwt() ->> 'email') limit 1), 'admin');
$$;
revoke all on function public.mon_role() from public, anon;
grant execute on function public.mon_role() to authenticated;
create table if not exists public.banque_mouvements (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  montant numeric not null,                    -- + entrée, − sortie
  type text not null default 'autre' check (type in ('depot', 'retrait', 'virement_recu', 'virement_emis', 'cheque', 'frais', 'autre')),
  note text,
  lien text,                                   -- ex. le paiement client d'un chèque encaissé
  created_at timestamptz not null default now()
);

-- ───────────── Règles d'accès (équipe seulement) ─────────────
do $$
declare t text;
begin
  foreach t in array array['depenses', 'paiements_clients', 'caisse_journees', 'retours_clients', 'factures', 'compteurs',
                           'stock_depots', 'transferts', 'inventaires', 'regularisations', 'commerciaux', 'banque_mouvements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists equipe on public.%I', t);
    execute format('create policy equipe on public.%I for all to authenticated using ((select public.est_autorise())) with check ((select public.est_autorise()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Vérification (doit afficher 12 tables) :
select count(*) as tables_creees from information_schema.tables where table_schema = 'public' and table_name in
  ('depenses', 'paiements_clients', 'caisse_journees', 'retours_clients', 'factures', 'compteurs',
   'stock_depots', 'transferts', 'inventaires', 'regularisations', 'commerciaux', 'banque_mouvements');
