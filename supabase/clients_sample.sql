insert into public.clients (nom, telephone, ville, notes) values
('Mohammed Alaoui',    '0661234567', 'Fès',        'Garage auto — commande régulière'),
('Hassan Benali',      '0672345678', 'Meknès',     'Grossiste pièces'),
('Khalid Tahiri',      '0683456789', 'Ifrane',     null),
('Rachid Ouali',       '0694567890', 'Sefrou',     'Préfère livraison le matin'),
('Youssef Amrani',     '0655678901', 'Azrou',      null),
('Abdelkrim Fassi',    '0662109876', 'Fès',        'Atelier mécanique'),
('Said Bouhali',       '0673219876', 'Meknès',     null),
('Omar Ziani',         '0684329876', 'Beni Mellal', 'Nouveau client'),
('Mustapha El Idrissi','0695439876', 'Khenifra',   null),
('Hicham Lahlou',      '0656549876', 'Immouzer',   'Garage station service')
on conflict do nothing;
