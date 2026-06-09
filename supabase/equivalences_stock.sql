-- Variantes de marque enrichies : prix d'achat, prix de vente (= colonne prix), stock par marque.
-- + lien de la vente vers la variante + coût unitaire figé pour le bénéfice.
-- À exécuter UNE FOIS dans l'éditeur SQL Supabase (Dashboard > SQL Editor).

alter table public.equivalences add column if not exists prix_achat double precision;
alter table public.equivalences add column if not exists stock integer not null default 0;
-- (la colonne 'prix' existante sert de prix de vente)

alter table public.sale_items add column if not exists equivalence_id uuid references public.equivalences(id) on delete set null;
alter table public.sale_items add column if not exists cout_unitaire double precision; -- prix d'achat figé au moment de la vente

-- Décrémente le stock d'une variante (marque)
create or replace function public.decrement_equiv_stock(e_id uuid, qty integer)
returns void language plpgsql as $$
begin
  update public.equivalences set stock = stock - qty where id = e_id;
end;
$$;

NOTIFY pgrst, 'reload schema';
