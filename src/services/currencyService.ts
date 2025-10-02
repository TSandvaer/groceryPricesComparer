import { db } from '../firebase/config';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const EXCHANGE_RATE_COLLECTION = 'appConfig';
const EXCHANGE_RATE_DOC = 'exchangeRate';
const CACHE_DURATION_HOURS = 4;
const FALLBACK_RATE = 0.69; // 1 SEK ≈ 0.69 DKK

interface ExchangeRateData {
  sekToDkk: number;
  lastUpdated: Timestamp;
  source: string;
}

export const getExchangeRate = async (): Promise<number> => {
  try {
    // Get stored exchange rate from Firestore
    const docRef = doc(db, EXCHANGE_RATE_COLLECTION, EXCHANGE_RATE_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ExchangeRateData;
      const lastUpdated = data.lastUpdated.toDate();
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      // If rate is fresh (less than 4 hours old), return it
      if (hoursSinceUpdate < CACHE_DURATION_HOURS) {
        console.log(`Using cached exchange rate: ${data.sekToDkk} (${hoursSinceUpdate.toFixed(1)} hours old)`);
        return data.sekToDkk;
      }

      console.log(`Cached rate expired (${hoursSinceUpdate.toFixed(1)} hours old), fetching new rate...`);
    } else {
      console.log('No cached rate found, fetching from API...');
    }

    // Fetch new rate from API
    const newRate = await fetchExchangeRateFromAPI();

    // Store in Firestore
    await setDoc(docRef, {
      sekToDkk: newRate,
      lastUpdated: Timestamp.now(),
      source: 'ExchangeRate-API.com'
    });

    console.log(`Stored new exchange rate: ${newRate}`);
    return newRate;

  } catch (error) {
    console.error('Error getting exchange rate:', error);
    console.log(`Using fallback rate: ${FALLBACK_RATE}`);
    return FALLBACK_RATE;
  }
};

const fetchExchangeRateFromAPI = async (): Promise<number> => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/SEK');

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.rates || !data.rates.DKK) {
      throw new Error('Invalid API response format');
    }

    const sekToDkk = data.rates.DKK;
    console.log(`Fetched exchange rate from API: 1 SEK = ${sekToDkk} DKK`);

    return sekToDkk;

  } catch (error) {
    console.error('Error fetching from API:', error);
    throw error;
  }
};

// Get the last update time for display purposes
export const getLastUpdateTime = async (): Promise<Date | null> => {
  try {
    const docRef = doc(db, EXCHANGE_RATE_COLLECTION, EXCHANGE_RATE_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ExchangeRateData;
      return data.lastUpdated.toDate();
    }

    return null;
  } catch (error) {
    console.error('Error getting last update time:', error);
    return null;
  }
};
