-- Détail des lignes d'une réception (pour pouvoir l'ANNULER proprement : stock retiré + dette corrigée).
-- [{ "product_id": "...", "equivalence_id": "..."|null, "quantite": 12, "ref": "WL7009 (Wix)" }, ...]
alter table receptions add column if not exists lignes jsonb;

notify pgrst, 'reload schema';
