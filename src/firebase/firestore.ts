import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  QueryConstraint,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './config';
import type { PriceEntry, Translation } from '../types';

const PRICE_ENTRIES_COLLECTION = 'priceEntries';
const TRANSLATIONS_COLLECTION = 'translations';

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

export const updatePriceEntry = async (entryId: string, updates: Partial<Omit<PriceEntry, 'id' | 'createdAt'>>) => {
  try {
    // Remove undefined values from updates object
    const cleanedUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedUpdates[key] = value;
      }
    });

    const entryRef = doc(db, PRICE_ENTRIES_COLLECTION, entryId);
    await updateDoc(entryRef, cleanedUpdates);
  } catch (error) {
    throw error;
  }
};

export const deletePriceEntry = async (entryId: string) => {
  try {
    const entryRef = doc(db, PRICE_ENTRIES_COLLECTION, entryId);
    await deleteDoc(entryRef);
  } catch (error) {
    throw error;
  }
};

export const bulkDeletePriceEntries = async (entryIds: string[]) => {
  try {
    const deletePromises = entryIds.map(id => {
      const entryRef = doc(db, PRICE_ENTRIES_COLLECTION, id);
      return deleteDoc(entryRef);
    });
    await Promise.all(deletePromises);
  } catch (error) {
    throw error;
  }
};

export const calculateAveragePrices = (entries: PriceEntry[], sekToDkkRate: number = 0.69) => {
  const grouped = entries.reduce((acc, entry) => {
    const key = entry.groceryType.toLowerCase();
    if (!acc[key]) {
      acc[key] = { se: [], dk: [] };
    }

    // Calculate normalized price per standard unit
    const quantity = entry.quantity || 1;
    const amount = entry.amount || 1;
    const unit = entry.unit;

    // Convert to base units (grams or milliliters)
    let amountInBaseUnit = amount;
    if (unit === 'kilogram') {
      amountInBaseUnit = amount * 1000; // convert kg to grams
    } else if (unit === 'liter') {
      amountInBaseUnit = amount * 1000; // convert liters to milliliters
    }

    // Total amount in base units for all items
    const totalAmount = amountInBaseUnit * quantity;

    // Price per base unit (per gram or per milliliter)
    const pricePerBaseUnit = totalAmount > 0 ? entry.price / totalAmount : entry.price / quantity;

    // Convert to price per standard unit (per kilogram or per liter)
    // If original unit was weight (gram/kg), normalize to per kilogram
    // If original unit was volume (ml/L), normalize to per liter
    let normalizedPrice = pricePerBaseUnit;
    if (unit === 'gram' || unit === 'kilogram') {
      normalizedPrice = pricePerBaseUnit * 1000; // price per kilogram
    } else if (unit === 'milliliter' || unit === 'liter') {
      normalizedPrice = pricePerBaseUnit * 1000; // price per liter
    }

    // Convert currency to SEK for fair comparison
    let priceInSEK = normalizedPrice;
    if (entry.currency === 'DKK') {
      priceInSEK = normalizedPrice / sekToDkkRate; // Convert DKK to SEK
    }

    if (entry.country === 'SE') {
      acc[key].se.push(priceInSEK);
    } else if (entry.country === 'DK') {
      acc[key].dk.push(priceInSEK);
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

    // Calculate savings: always negative, showing % saved by buying from cheaper country
    const percentDifference = avgSE && avgDK
      ? -Math.abs(((Math.max(avgSE, avgDK) - Math.min(avgSE, avgDK)) / Math.max(avgSE, avgDK)) * 100)
      : null;

    return {
      groceryType,
      avgPriceSE: avgSE,
      avgPriceDK: avgDK,
      countSE: prices.se.length,
      countDK: prices.dk.length,
      difference: avgSE && avgDK ? avgDK - avgSE : null,
      percentDifference,
    };
  });
};

// Translation Management Functions

export const getTranslations = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, TRANSLATIONS_COLLECTION));
    const translations: Translation[] = [];
    querySnapshot.forEach((doc) => {
      translations.push({
        id: doc.id,
        ...doc.data(),
      } as Translation);
    });
    return translations;
  } catch (error) {
    throw error;
  }
};

export const createTranslation = async (translation: Omit<Translation, 'id'>) => {
  try {
    // Use the English text as the document ID
    const translationRef = doc(db, TRANSLATIONS_COLLECTION, translation.en);
    await setDoc(translationRef, {
      en: translation.en,
      da: translation.da,
      sv: translation.sv,
    });
    return translation.en;
  } catch (error) {
    throw error;
  }
};

export const updateTranslation = async (id: string, updates: Partial<Omit<Translation, 'id'>>) => {
  try {
    const cleanedUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedUpdates[key] = value;
      }
    });

    const translationRef = doc(db, TRANSLATIONS_COLLECTION, id);
    await updateDoc(translationRef, cleanedUpdates);
  } catch (error) {
    throw error;
  }
};

export const deleteTranslation = async (id: string) => {
  try {
    const translationRef = doc(db, TRANSLATIONS_COLLECTION, id);
    await deleteDoc(translationRef);
  } catch (error) {
    throw error;
  }
};
