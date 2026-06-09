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

export type GarageStatut = "a_livrer" | "preparee" | "livre" | "reporte";

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
};

export type Equivalence = {
  id: string;
  product_id: string;
  marque: string;
  reference: string;
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
  | "autre";

export type Product = {
  id: string;
  created_at: string;
  nom_fr: string;
  nom_ar: string;
  reference: string;
  categorie: ProductCategory;
  prix_achat: number;
  prix_vente: number;
  stock: number;
  stock_min: number;
  notes: string | null;
  dimensions?: string | null;
  image_url?: string | null;
  code_barre?: string | null;
};

export type Client = {
  id: string;
  created_at: string;
  nom: string;
  telephone: string | null;
  ville: string;
  adresse: string | null;
  notes: string | null;
  solde_du: number;
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
  product?: Product;
};
