// Format attendu par supabase-js v2 (GenericSchema) : chaque table a Row/Insert/Update/Relationships,
// et le schéma a Views/Functions/Enums/CompositeTypes. Sans ça, tout insert/update/rpc est typé `never`
// et les vraies erreurs disparaissent dans le bruit (le build ignore TS).
type Rel = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] };
type Fk<C extends string, T extends string> = {
  foreignKeyName: `${C}_fkey`; columns: [C]; isOneToOne: false; referencedRelation: T; referencedColumns: ["id"];
};
// Les colonnes ajoutées par jointure (client, items, product) ne sont pas des colonnes de la table
type Table<R, Auto extends keyof R, Rels extends Rel[] = []> = {
  Row: R;
  Insert: Omit<R, Auto | "client" | "items" | "product"> & Partial<Pick<R, Auto>>;
  Update: Partial<Omit<R, "client" | "items" | "product">>;
  Relationships: Rels;
};

export type Database = {
  public: {
    Tables: {
      products: Table<Product, "id" | "created_at">;
      clients: Table<Client, "id" | "created_at", [Fk<"parrain_id", "clients">]>;
      sales: Table<Sale, "id" | "created_at", [Fk<"client_id", "clients">]>;
      sale_items: Table<SaleItem, "id", [Fk<"sale_id", "sales">, Fk<"product_id", "products">, Fk<"fournisseur_id", "fournisseurs">, Fk<"equivalence_id", "equivalences">]>;
      equivalences: Table<Equivalence, "id", [Fk<"product_id", "products">]>;
      applications: Table<Application, "id", [Fk<"product_id", "products">]>;
      garages: Table<Garage, "id" | "created_at" | "jour", [Fk<"client_id", "clients">]>;
      fournisseurs: Table<Fournisseur, "id" | "created_at">;
      receptions: Table<Reception, "id" | "created_at" | "lignes", [Fk<"fournisseur_id", "fournisseurs">]>;
      avances: Table<Avance, "id" | "created_at", [Fk<"fournisseur_id", "fournisseurs">]>;
      rappels_vidange: Table<RappelVidange, "id" | "created_at" | "garage_id" | "fait", [Fk<"garage_id", "garages">, Fk<"client_id", "clients">]>;
      demandes_manquees: Table<DemandeManquee, "id" | "created_at" | "note" | "traite">;
      push_subscriptions: Table<PushSubscriptionRow, "id" | "created_at">;
      vehicules: Table<Vehicule, "id">;
      compatibilites: Table<Compatibilite, "id", [Fk<"product_id", "products">, Fk<"vehicule_id", "vehicules">]>;
      prospects: Table<Prospect, "created_at" | "score" | "statut_prospection" | "premiere_vue" | "derniere_vue">;
      // Sécurité (supabase/securite.sql) : emails autorisés. Non lisible depuis l'appli (géré dans l'éditeur SQL).
      utilisateurs_autorises: Table<{ email: string; ajoute_le: string }, "ajoute_le">;
      // Mémoire des VIN confirmés (supabase/vin_connus.sql)
      vin_connus: Table<VinConnu, "famille" | "confirme_le">;
      // Tournées prévues : prévenir les clients la veille (supabase/tournees_prevues.sql)
      tournees_prevues: Table<TourneePrevue, "id" | "created_at" | "message" | "envoyes">;
      // Réglages partagés, ex. pourcentages des 4 catalogues (supabase/catalogues_huile_tournees.sql)
      reglages: Table<{ cle: string; valeur: unknown; modifie_le: string }, "modifie_le">;
      // Huile moteur par moteur : viscosité, norme, litres (supabase/catalogues_huile_tournees.sql)
      huiles_moteurs: Table<HuileMoteur, "modifie_le" | "viscosites" | "variante">;
      // Décomptes de stock déjà faits par ligne de vente (supabase/protection.sql) : jamais deux fois
      stock_decomptes: Table<{ sale_id: string; ligne: number; cree_le: string }, "cree_le">;
      // Catégories permises (products.categorie → clé étrangère) — supabase/categories_produits.sql, BIBLE §8.31
      categories_produits: Table<{ cle: string; famille: string; libelle: string; ajoutee_le: string }, "ajoutee_le">;
    };
    Views: {
      prospects_par_jour: { Row: { jour: string; source: string; nb: number }; Relationships: [] };
    };
    Functions: {
      // qty négative = incrémente
      decrement_stock: { Args: { p_id: string; qty: number }; Returns: undefined };
      decrement_equiv_stock: { Args: { e_id: string; qty: number }; Returns: undefined };
      // true si la personne connectée est dans utilisateurs_autorises
      est_autorise: { Args: Record<string, never>; Returns: boolean };
      // supabase/protection.sql : décompte d'une ligne de vente, une seule fois (false = déjà fait)
      decompter_stock_vente: { Args: { p_sale: string; p_ligne: number; p_product: string | null; p_equiv: string | null; p_qty: number }; Returns: boolean };
      // supabase/protection.sql (clé serveur seulement) : taille de la base en octets, structure complète en SQL
      taille_base: { Args: Record<string, never>; Returns: number };
      schema_complet: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// VIN confirmé par une vente : la voiture et son code moteur (données techniques, jamais le client)
// Tournée prévue (supabase/tournees_prevues.sql) : date + villes ; envoyes = id des clients déjà prévenus
export type TourneePrevue = {
  id: string;
  created_at: string;
  date_tournee: string;
  villes: string[];
  message: string;
  envoyes: string[];
};

export type VinConnu = {
  vin: string;
  famille: string;
  marque: string;
  modele: string;
  moteur: string | null;
  code_moteur: string | null;
  annee_debut: string | null;
  annee_fin: string | null;
  puissance: string | null;
  confirme_le: string;
};

export type PushSubscriptionRow = {
  id: string;
  created_at: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

export type Vehicule = {
  id: string; marque: string; modele: string; annee_debut: number; annee_fin: number | null;
  motorisation: string; carburant: "diesel" | "essence" | "hybride"; cylindree: string | null;
};
export type Compatibilite = { id: string; product_id: string; vehicule_id: string };

export type Prospect = {
  id: string; source: string; segment: string; nom: string | null; ville: string | null; adresse: string | null;
  telephone: string | null; whatsapp: string | null; email: string | null; email_type: string | null; site: string | null;
  categorie: string | null; note_google: number | null; nb_avis: number | null; horaires: string | null;
  lat: number | null; lon: number | null; maps_url: string | null; source_url: string | null;
  score: number; score_detail: string | null; statut_prospection: string;
  premiere_vue: string; derniere_vue: string; created_at: string;
};

export type FournisseurType = "capital" | "credit";

export type Fournisseur = {
  id: string;
  created_at: string;
  nom: string;
  telephone: string | null;
  note: string | null;
  type: FournisseurType;
  solde_depart?: number; // solde de départ (onboarding) : >0 = je lui dois, <0 = il me doit
};

export type Reception = {
  id: string;
  created_at: string;
  fournisseur_id: string;
  date: string;
  montant: number;
  details: string | null;
  lignes?: ReceptionLigne[] | null; // détail pour annuler la réception (receptions_lignes.sql)
};
export type ReceptionLigne = { product_id: string; equivalence_id: string | null; quantite: number; ref: string };


export type Avance = {
  id: string;
  created_at: string;
  fournisseur_id: string;
  date: string;
  montant: number;
  note: string | null;
  sale_id?: string | null; // avance auto « dinoun payé » liée à un bon (sale_fournisseur_paye.sql)
  // supabase/avances_paiement.sql (16/11/2026) : espèces ou chèque, nom de la personne, numéro du chèque
  mode?: "especes" | "cheque" | null;
  personne?: string | null;
  numero_cheque?: string | null;
  date_cheque?: string | null; // date du chèque (encaissement)
  cheque_encaisse?: boolean | null; // chèque déjà encaissé par le fournisseur ?
};

export type GarageStatut = "prospect" | "a_livrer" | "preparee" | "livre" | "reporte";

export type Garage = {
  id: string;
  created_at: string;
  nom: string;
  telephone: string | null;
  ville: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
  statut: GarageStatut;
  note: string | null;
  refs_demandees: string | null;
  photo_url: string | null;
  jour: number | null;
  client_id?: string | null; // fiche client liée (commandes WhatsApp — Bible §4.6)
};

// Rappel vidange d'un client final (Bible §4.10)
export type RappelVidange = {
  id: string;
  created_at: string;
  garage_id: string | null;
  client_id: string | null;
  vehicule: string;
  date_prevue: string;
  fait: boolean;
};

export type Equivalence = {
  id: string;
  product_id: string;
  marque: string;
  reference: string;
  prix: number | null;        // prix de vente de la variante
  prix_achat: number | null;  // prix d'achat de la variante
  stock: number;              // stock de cette marque
  code_barre?: string | null; // code-barres de la boîte de cette marque
  // Prix corrigés à la main par catalogue (vide = prix ± pourcentage, src/lib/prixCatalogues.ts)
  prix_particulier?: number | null;
  prix_location?: number | null;
  prix_magasin?: number | null;
};

// Huile moteur conseillée pour un moteur (code du guide Liqui Moly, ex. « K9K ») et une variante
// (« sans FAP » / « avec FAP », vide = toutes versions). supabase/catalogues_huile_tournees.sql
export type HuileMoteur = {
  code: string;
  variante: string;
  description: string | null;
  viscosites: string[];
  norme: string | null;
  litres_min: number | null;
  litres_max: number | null;
  source?: string | null; // pas chargée par l'appli (src/lib/huiles.ts, COLONNES)
  remarque: string | null;
  marques?: string[] | null; // marques où ce code a été relevé (vide = toutes), supabase/huiles_marques.sql
  modifie_le?: string; // idem
};

export type Application = {
  id: string;
  product_id: string;
  marque: string;
  modele: string;
  moteur: string | null;
  code_moteur: string | null;
  annee_debut: string | null;
  annee_fin: string | null;
  puissance: string | null;
};

export type ProductCategory =
  | "filtre_huile"
  | "filtre_air"
  | "filtre_carburant"
  | "filtre_habitacle"
  | "filtre_refroidissement"
  | "filtration_autre"
  | "huile_moteur"
  | "accessoires_vidange"
  | "outils_vidange"
  | "kit_distribution"
  | "kit_distribution_pompe"
  | "courroie_distribution"
  | "galet_distribution"
  | "chaine_distribution"
  | "pompe_eau"
  | "kit_courroie_accessoire"
  | "courroie_accessoire"
  | "poulie"
  | "plaquette_frein"
  | "disque_frein"
  | "frein_hydraulique"
  | "frein_tambour"
  | "capteur_cable_frein"
  | "kit_embrayage"
  | "accessoire_boite"
  | "embrayage_autre"
  | "batterie"
  | "alternateur"
  | "demarreur"
  | "outil_batterie"
  | "alterno_demarreur"
  | "essuie_glace"
  | "essuyage_phares"
  | "leve_vitre"
  | "serrure"
  | "verin"
  | "commande_pedalier"
  | "electricite_habitacle"
  | "amortisseur"
  | "suspension_essieu"
  | "transmission"
  | "rotule_direction"
  | "moyeu_roulement"
  | "autre";

export type Product = {
  id: string;
  created_at: string;
  nom_fr: string;
  nom_ar: string;
  reference: string;
  marque?: string;
  categorie: ProductCategory;
  prix_achat: number;
  prix_vente: number;
  stock: number;
  stock_min: number;
  notes: string | null;
  dimensions?: string | null;
  image_url?: string | null;
  code_barre?: string | null;
  prix_promo?: number | null;
  // Prix corrigés à la main par catalogue (vide = prix ± pourcentage, src/lib/prixCatalogues.ts)
  prix_particulier?: number | null;
  prix_location?: number | null;
  prix_magasin?: number | null;
};

// garage = garages et stations ; particulier, location (de voitures), magasin (de pièces) ont leur catalogue de prix.
// comptoir et gros : anciens types (comptoir = prix garage, gros = prix magasin).
export type ClientType = "comptoir" | "garage" | "gros" | "particulier" | "location" | "magasin";

export type Client = {
  id: string;
  created_at: string;
  nom: string;
  telephone: string | null;
  ville: string;
  adresse: string | null;
  notes: string | null;
  solde_du: number;
  type?: ClientType;
  remise_pct?: number;
  limite_credit?: number;
  derniere_relance?: string | null;
  derniere_relance_com?: string | null; // relance commerciale « client endormi » (Bible §4.14)
  derniere_relance_catalogue?: string | null; // relance « catalogue » (push_notifications.sql)
  avoir?: number;                       // crédit à déduire sur une prochaine vente (Bible §4.15)
  quartier?: string | null;             // quartier dans la ville (clients_quartier.sql)
  origine?: "terrain" | "prospection";   // pris en déplacement / venu de /prospects à sa 1re commande (clients_origine.sql)
  latitude?: number | null;             // position exacte du local (clients_localisation.sql)
  longitude?: number | null;
  parrain_id?: string | null;           // client qui l'a amené (parrainage)
  parrain_paye?: boolean;               // avoir du parrain déjà crédité
};

// Référence demandée au comptoir que je n'avais pas (Bible §4.12)
export type DemandeManquee = {
  id: string;
  created_at: string;
  reference: string;
  note: string | null;
  traite: boolean;
};

export type SaleStatus = "paye" | "en_attente" | "partiel";

export type Sale = {
  id: string;
  created_at: string;
  client_id: string;
  date: string;
  total: number;
  montant_paye: number;
  statut: SaleStatus;
  notes: string | null;
  fournisseur_paye?: boolean; // j'ai payé le fournisseur (dinoun) pour ce bon (Bible §5, roulement)
  client?: Client;
  items?: SaleItem[];
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantite: number;
  prix_unitaire: number;
  fournisseur_id: string | null;
  equivalence_id: string | null;
  cout_unitaire: number | null;
  product?: Product;
};
