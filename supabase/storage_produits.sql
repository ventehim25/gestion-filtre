-- Photos produits : bucket de stockage PUBLIC + droits d'upload avec la clé anon.
-- À coller tel quel dans l'éditeur SQL : https://supabase.com/dashboard/project/wehsvgoolozqzxsgwibb/sql/new

-- Bucket public (lecture par tous, pour l'afficher dans le catalogue)
insert into storage.buckets (id, name, public) values ('produits', 'produits', true)
  on conflict (id) do update set public = true;

-- Lecture publique des photos du bucket
drop policy if exists "produits_read" on storage.objects;
create policy "produits_read" on storage.objects for select using (bucket_id = 'produits');

-- Upload (insert) autorisé avec la clé anon
drop policy if exists "produits_insert" on storage.objects;
create policy "produits_insert" on storage.objects for insert with check (bucket_id = 'produits');

-- Remplacement (update) autorisé avec la clé anon
drop policy if exists "produits_update" on storage.objects;
create policy "produits_update" on storage.objects for update using (bucket_id = 'produits') with check (bucket_id = 'produits');
