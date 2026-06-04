-- ============================================================
-- TABLE EQUIVALENCES — références équivalentes d'autres marques
-- pour un produit Filtron (cross-reference)
-- ============================================================
create table if not exists public.equivalences (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  marque      text not null,
  reference   text not null,
  unique (product_id, marque, reference)
);

create index if not exists idx_equiv_ref on public.equivalences (upper(reference));
create index if not exists idx_equiv_product on public.equivalences (product_id);

alter table public.equivalences enable row level security;
drop policy if exists "allow all equivalences" on public.equivalences;
create policy "allow all equivalences" on public.equivalences for all using (true) with check (true);

-- ============================================================
-- EXEMPLES (À VÉRIFIER par l'utilisateur avant vente)
-- Attache des équivalences à des produits Filtron existants
-- ============================================================
insert into public.equivalences (product_id, marque, reference)
select p.id, e.marque, e.reference
from public.products p
join (values
  -- OP540/1 : Renault/Nissan/Dacia 1.5 dCi (filtre huile)
  ('OP540/1', 'Mann',    'W 75/3'),
  ('OP540/1', 'Bosch',   'F 026 407 023'),
  ('OP540/1', 'Mahle',   'OC 593'),
  ('OP540/1', 'Purflux', 'LS933'),
  -- AP082 : Renault Clio/Megane (filtre air)
  ('AP082',   'Mann',    'C 1858'),
  ('AP082',   'Purflux', 'A1110'),
  ('AP082',   'Bosch',   'F 026 400 492'),
  -- K1175 : Renault Clio (filtre habitacle)
  ('K1175',   'Mann',    'CU 1828'),
  ('K1175',   'Purflux', 'AH188'),
  -- PP839 : Renault/Dacia 1.5 dCi (filtre carburant)
  ('PP839',   'Mann',    'WK 9024'),
  ('PP839',   'Purflux', 'FCS745'),
  -- OP526 : Ford Focus/Fiesta TDCi (filtre huile)
  ('OP526',   'Mann',    'W 712/73'),
  ('OP526',   'Mahle',   'OC 264')
) as e(ref, marque, reference) on p.reference = e.ref
on conflict (product_id, marque, reference) do nothing;
