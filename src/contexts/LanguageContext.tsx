import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTranslations } from '../firebase/firestore';
import type { Translation } from '../types';

type Language = 'en' | 'da' | 'sv';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'groceryPriceComparer_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get language from localStorage, default to 'en'
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored === 'en' || stored === 'da' || stored === 'sv') ? stored : 'en';
  });
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranslations();
  }, []);

  const loadTranslations = async () => {
    try {
      const data = await getTranslations();
      const translationsMap: Record<string, Translation> = {};
      data.forEach(translation => {
        translationsMap[translation.en] = translation;
      });
      setTranslations(translationsMap);
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      return key; // Return the key if no translation found
    }
    return translation[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
