-- Prix de vente et d'achat à 0 pour toutes les références en rupture (stock 0) — produits + variantes de marque.
-- Demande du 06/11/2026. Idempotent (relançable). Les produits EN STOCK ne sont pas touchés.
-- Sauvegarde des prix d'origine : backups/prix_avant_zero_2026-11-06-20-33.json (sur le PC, hors GitHub).
update products set prix_vente = 0, prix_achat = 0
  where stock <= 0 and (prix_vente <> 0 or prix_achat <> 0);
update equivalences set prix = 0, prix_achat = 0
  where (stock <= 0 or stock is null) and (prix <> 0 or prix_achat <> 0);

-- Contrôle : les deux premiers comptes doivent valoir 0
select
  (select count(*) from products where stock <= 0 and (prix_vente <> 0 or prix_achat <> 0)) as produits_rupture_avec_prix,
  (select count(*) from equivalences where (stock <= 0 or stock is null) and (prix <> 0 or prix_achat <> 0)) as variantes_rupture_avec_prix,
  (select count(*) from products where stock > 0) as produits_en_stock;
