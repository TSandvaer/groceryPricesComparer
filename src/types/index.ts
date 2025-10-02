export interface PriceEntry {
  id: string;
  groceryType: string;
  groceryBrandName?: string;
  price: number;
  currency: string;
  quantity?: number; // e.g., 10 (number of items)
  amount?: number; // e.g., 100, 1, 1.5 (size per item)
  unit?: 'gram' | 'kilogram' | 'milliliter' | 'liter' | 'pieces';
  store?: string;
  country: 'SE' | 'DK';
  date: string; // YYYY-MM-DD format
  userId: string;
  userEmail?: string; // Email of the user who submitted
  createdAt: Date;
}

export interface AveragePrice {
  groceryType: string;
  avgPriceSE: number | null;
  avgPriceDK: number | null;
  countSE: number;
  countDK: number;
  difference: number | null;
  percentDifference: number | null;
}

export interface VisionApiResponse {
  extractedText: string;
  parsedData: {
    groceryType?: string;
    groceryBrandName?: string;
    price?: number;
    quantity?: number;
    amount?: number;
    unit?: 'gram' | 'kilogram' | 'milliliter' | 'liter' | 'pieces';
    store?: string;
  };
}

export interface Translation {
  id: string;        // English text (key)
  en: string;        // English translation
  da: string;        // Danish translation
  sv: string;        // Swedish translation
}

export interface UserRequest {
  id: string;
  email: string;
  password: string;  // Will be hashed before storage
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;  // Admin email who reviewed
}

export interface User {
  id: string;  // Firebase Auth UID (or temp ID for pending users)
  email: string;
  isDataContributor: boolean;
  isPending?: boolean;  // True for users created before first login
  createdAt: Date;
  lastLogin: Date;
}
