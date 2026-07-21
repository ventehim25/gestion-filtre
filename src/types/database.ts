export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at">;
        Update: Partial<Omit<Product, "id" | "created_at">>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, "id" | "created_at">;
        Update: Partial<Omit<Client, "id" | "created_at">>;
      };
      sales: {
        Row: Sale;
        Insert: Omit<Sale, "id" | "created_at">;
        Update: Partial<Omit<Sale, "id" | "created_at">>;
      };
      sale_items: {
        Row: SaleItem;
        Insert: Omit<SaleItem, "id">;
        Update: Partial<Omit<SaleItem, "id">>;
      };
      equivalences: {
        Row: Equivalence;
        Insert: Omit<Equivalence, "id">;
        Update: Partial<Omit<Equivalence, "id">>;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, "id">;
        Update: Partial<Omit<Application, "id">>;
      };
      garages: {
        Row: Garage;
        Insert: Omit<Garage, "id" | "created_at">;
        Update: Partial<Omit<Garage, "id" | "created_at">>;
      };
      fournisseurs: {
        Row: Fournisseur;
        Insert: Omit<Fournisseur, "id" | "created_at">;
        Update: Partial<Omit<Fournisseur, "id" | "created_at">>;
      };
      receptions: {
        Row: Reception;
        Insert: Omit<Reception, "id" | "created_at">;
        Update: Partial<Omit<Reception, "id" | "created_at">>;
      };
      avances: {
        Row: Avance;
        Insert: Omit<Avance, "id" | "created_at">;
        Update: Partial<Omit<Avance, "id" | "created_at">>;
      };
    };
  };
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
};

export type Avance = {
  id: string;
  created_at: string;
  fournisseur_id: string;
  date: string;
  montant: number;
  note: string | null;
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
  | "huile_moteur"
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
};

export type ClientType = "comptoir" | "garage" | "gros";

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
  avoir?: number;                       // crédit à déduire sur une prochaine vente (Bible §4.15)
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
