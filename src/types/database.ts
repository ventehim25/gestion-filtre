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
    };
  };
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
