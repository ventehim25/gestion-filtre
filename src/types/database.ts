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
    };
  };
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
  product?: Product;
};
