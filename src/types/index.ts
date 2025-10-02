export interface PriceEntry {
  id: string;
  groceryType: string;
  groceryBrandName: string;
  price: number;
  currency: string;
  store: string;
  country: 'SE' | 'DK';
  date: string; // YYYY-MM-DD format
  userId: string;
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
    store?: string;
  };
}
