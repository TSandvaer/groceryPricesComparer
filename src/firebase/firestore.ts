import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import type { PriceEntry } from '../types';

const PRICE_ENTRIES_COLLECTION = 'priceEntries';

export const createPriceEntry = async (entry: Omit<PriceEntry, 'id' | 'createdAt'>) => {
  try {
    const newEntry = {
      ...entry,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, PRICE_ENTRIES_COLLECTION), newEntry);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getPriceEntries = async (filters?: {
  groceryType?: string;
  country?: string;
  store?: string;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const constraints: QueryConstraint[] = [];

    if (filters?.groceryType) {
      constraints.push(where('groceryType', '==', filters.groceryType));
    }
    if (filters?.country) {
      constraints.push(where('country', '==', filters.country));
    }
    if (filters?.store) {
      constraints.push(where('store', '==', filters.store));
    }

    const q = query(collection(db, PRICE_ENTRIES_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const entries: PriceEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as PriceEntry);
    });

    // Client-side date filtering if needed
    if (filters?.startDate || filters?.endDate) {
      return entries.filter(entry => {
        if (filters.startDate && entry.date < filters.startDate) return false;
        if (filters.endDate && entry.date > filters.endDate) return false;
        return true;
      });
    }

    return entries;
  } catch (error) {
    throw error;
  }
};

export const calculateAveragePrices = (entries: PriceEntry[]) => {
  const grouped = entries.reduce((acc, entry) => {
    const key = entry.groceryType.toLowerCase();
    if (!acc[key]) {
      acc[key] = { se: [], dk: [] };
    }
    if (entry.country === 'SE') {
      acc[key].se.push(entry.price);
    } else if (entry.country === 'DK') {
      acc[key].dk.push(entry.price);
    }
    return acc;
  }, {} as Record<string, { se: number[], dk: number[] }>);

  return Object.entries(grouped).map(([groceryType, prices]) => {
    const avgSE = prices.se.length > 0
      ? prices.se.reduce((a, b) => a + b, 0) / prices.se.length
      : null;
    const avgDK = prices.dk.length > 0
      ? prices.dk.reduce((a, b) => a + b, 0) / prices.dk.length
      : null;

    return {
      groceryType,
      avgPriceSE: avgSE,
      avgPriceDK: avgDK,
      countSE: prices.se.length,
      countDK: prices.dk.length,
      difference: avgSE && avgDK ? avgDK - avgSE : null,
      percentDifference: avgSE && avgDK ? ((avgDK - avgSE) / avgSE) * 100 : null,
    };
  });
};
