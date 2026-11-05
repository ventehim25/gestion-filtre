-- Prospects B2B collectés par les robots (OSM + Google Places) — à coller dans l'éditeur SQL Supabase.
-- Alimentée par scripts/scrape_prospects_osm.mjs et scripts/scrape_prospects_gmaps.mjs ; lue par la page /prospects.
create table if not exists prospects (
  id text primary key,                  -- "osm:node/123" ou "gmaps:<place_id>"
  source text not null,                 -- 'osm' | 'gmaps'
  segment text not null,
  nom text,
  ville text,
  adresse text,
  telephone text,
  whatsapp text,
  email text,
  email_type text,                      -- 'générique' | 'nominatif ? (09-08)'
  site text,
  categorie text,                       -- catégorie Google / balise OSM
  note_google numeric,
  nb_avis integer,
  horaires text,
  lat double precision,
  lon double precision,
  maps_url text,
  source_url text,
  score numeric not null default 0,     -- intérêt probable /10 (scripts/prospect_score.mjs)
  score_detail text,
  statut_prospection text not null default 'a_contacter', -- a_contacter | contacte | interesse | client | refus
  premiere_vue date not null default current_date,
  derniere_vue date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists prospects_score_idx on prospects (score desc);
create index if not exists prospects_premiere_vue_idx on prospects (premiere_vue);
alter table prospects enable row level security;
drop policy if exists prospects_all on prospects;
create policy prospects_all on prospects for all using (true) with check (true);

-- Nombre de nouveaux prospects collectés par jour (graphique de la page /prospects)
create or replace view prospects_par_jour as
  select premiere_vue as jour, source, count(*)::int as nb
  from prospects group by premiere_vue, source;

notify pgrst, 'reload schema';
