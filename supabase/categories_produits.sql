-- 16/11/2026 — Catégories de produits en 9 familles (BIBLE §8.31). Remplace categories_distribution.sql.
-- Les catégories permises passent dans une TABLE (categories_produits) reliée à products.categorie :
-- ensuite, une nouvelle catégorie = une ligne ajoutée par Claude avec la clé serveur, plus aucun SQL à coller.
-- Idempotent : peut être recollé sans risque. Aucune donnée de produit n'est modifiée.

create table if not exists public.categories_produits (
  cle text primary key,
  famille text not null,
  libelle text not null,
  ajoutee_le timestamptz not null default now()
);

alter table public.categories_produits enable row level security;
drop policy if exists equipe on public.categories_produits;
create policy equipe on public.categories_produits for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));

insert into public.categories_produits (cle, famille, libelle) values
  -- Filtres et huile
  ('filtre_huile', 'filtres_huile', 'Filtre à huile'),
  ('filtre_air', 'filtres_huile', 'Filtre à air'),
  ('filtre_carburant', 'filtres_huile', 'Filtre à carburant'),
  ('filtre_habitacle', 'filtres_huile', 'Filtre d''habitacle'),
  ('filtre_refroidissement', 'filtres_huile', 'Filtre de refroidissement'),
  ('filtration_autre', 'filtres_huile', 'Autres filtrations'),
  ('huile_moteur', 'filtres_huile', 'Huile moteur'),
  ('accessoires_vidange', 'filtres_huile', 'Accessoires de vidange'),
  ('outils_vidange', 'filtres_huile', 'Outils de vidange'),
  -- Distribution moteur
  ('kit_distribution', 'distribution', 'Kit de distribution'),
  ('kit_distribution_pompe', 'distribution', 'Kit de distribution + pompe à eau'),
  ('courroie_distribution', 'distribution', 'Courroie de distribution'),
  ('galet_distribution', 'distribution', 'Galet tendeur / enrouleur'),
  ('chaine_distribution', 'distribution', 'Kit chaîne de distribution'),
  ('pompe_eau', 'distribution', 'Pompe à eau'),
  ('kit_courroie_accessoire', 'distribution', 'Kit de courroie d''accessoire'),
  ('courroie_accessoire', 'distribution', 'Courroie d''accessoire'),
  ('poulie', 'distribution', 'Poulie (vilebrequin, alternateur)'),
  -- Freinage
  ('plaquette_frein', 'freinage', 'Plaquettes de frein'),
  ('disque_frein', 'freinage', 'Disques de frein'),
  ('frein_hydraulique', 'freinage', 'Hydraulique de frein'),
  ('frein_tambour', 'freinage', 'Freins à tambours'),
  ('capteur_cable_frein', 'freinage', 'Capteurs et câbles de frein'),
  -- Embrayage et boîte de vitesse
  ('kit_embrayage', 'embrayage', 'Embrayage et volant moteur'),
  ('accessoire_boite', 'embrayage', 'Accessoires de boîte de vitesse'),
  ('embrayage_autre', 'embrayage', 'Autres pièces d''embrayage'),
  -- Direction / Suspension / Train
  ('amortisseur', 'train', 'Amortisseurs'),
  ('suspension_essieu', 'train', 'Suspension d''essieux'),
  ('transmission', 'train', 'Transmission'),
  ('rotule_direction', 'train', 'Rotules / direction'),
  ('moyeu_roulement', 'train', 'Moyeux et roulements'),
  -- Démarrage électrique
  ('batterie', 'electrique', 'Batteries'),
  ('alternateur', 'electrique', 'Alternateurs'),
  ('demarreur', 'electrique', 'Démarreurs'),
  ('outil_batterie', 'electrique', 'Outils batteries'),
  ('alterno_demarreur', 'electrique', 'Alterno-démarreurs'),
  -- Essuie-glaces et pièces
  ('essuie_glace', 'essuyage', 'Essuie-glaces'),
  ('essuyage_phares', 'essuyage', 'Essuyage des phares'),
  -- Pièces habitacle
  ('leve_vitre', 'habitacle', 'Lève-vitres'),
  ('serrure', 'habitacle', 'Serrure / fermeture'),
  ('verin', 'habitacle', 'Vérins'),
  ('commande_pedalier', 'habitacle', 'Commandes et pédalier'),
  ('electricite_habitacle', 'habitacle', 'Électricité habitacle'),
  -- Autres
  ('autre', 'autre', 'Autres pièces')
on conflict (cle) do update set famille = excluded.famille, libelle = excluded.libelle;

-- Sécurité : toute catégorie déjà utilisée par un produit existe dans la table (sinon le lien ci-dessous échouerait)
insert into public.categories_produits (cle, famille, libelle)
  select distinct categorie, 'autre', categorie from public.products
on conflict (cle) do nothing;

-- L'ancienne liste figée (contrainte « check ») est remplacée par le lien vers la table
do $$
declare con_name text;
begin
  for con_name in
    select conname from pg_constraint
    where conrelid = 'public.products'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%categorie%'
  loop
    execute format('alter table public.products drop constraint %I', con_name);
  end loop;
end $$;

alter table public.products drop constraint if exists products_categorie_fkey;
alter table public.products add constraint products_categorie_fkey
  foreign key (categorie) references public.categories_produits (cle) on update cascade;

notify pgrst, 'reload schema';
