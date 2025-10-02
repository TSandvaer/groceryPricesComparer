import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { createPriceEntry, getPriceEntries } from '../../firebase/firestore';
import type { User } from 'firebase/auth';
import { useLanguage } from '../../contexts/LanguageContext';

interface PriceSubmitFormProps {
  user: User;
  onSuccess?: () => void;
}

const PriceSubmitForm: React.FC<PriceSubmitFormProps> = ({ user, onSuccess }) => {
  const [groceryType, setGroceryType] = useState('');
  const [groceryBrandName, setGroceryBrandName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('SEK');
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<'gram' | 'kilogram' | 'milliliter' | 'liter' | 'pieces'>('liter');
  const [store, setStore] = useState('');
  const [country, setCountry] = useState<'SE' | 'DK'>('SE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [groceryTypeSuggestions, setGroceryTypeSuggestions] = useState<string[]>([]);
  const [brandNameSuggestions, setBrandNameSuggestions] = useState<string[]>([]);
  const [storeSuggestions, setStoreSuggestions] = useState<string[]>([]);
  const [showGroceryTypeSuggestions, setShowGroceryTypeSuggestions] = useState(false);
  const [showBrandNameSuggestions, setShowBrandNameSuggestions] = useState(false);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [allGroceryTypes, setAllGroceryTypes] = useState<string[]>([]);
  const [allBrandNames, setAllBrandNames] = useState<string[]>([]);
  const [allStores, setAllStores] = useState<string[]>([]);

  const { t } = useLanguage();
  
  useEffect(() => {
    loadGroceryTypes();
  }, []);

  const loadGroceryTypes = async () => {
    try {
      const entries = await getPriceEntries();

      // Extract unique grocery types
      const types = [...new Set(entries.map(e => e.groceryType))];
      setAllGroceryTypes(types);

      // Extract unique brand names (filter out undefined/empty)
      const brands = [...new Set(entries.map(e => e.groceryBrandName).filter(b => b))];
      setAllBrandNames(brands as string[]);

      // Extract unique stores (filter out undefined/empty)
      const stores = [...new Set(entries.map(e => e.store).filter(s => s))];
      setAllStores(stores as string[]);
    } catch (err) {
      console.error('Failed to load autocomplete data:', err);
    }
  };

  const handleGroceryTypeChange = (value: string) => {
    setGroceryType(value);

    if (value.trim().length > 0) {
      const filtered = allGroceryTypes.filter(type =>
        type.toLowerCase().includes(value.toLowerCase())
      );
      setGroceryTypeSuggestions(filtered);
      setShowGroceryTypeSuggestions(filtered.length > 0);
    } else {
      setGroceryTypeSuggestions([]);
      setShowGroceryTypeSuggestions(false);
    }
  };

  const handleBrandNameChange = (value: string) => {
    setGroceryBrandName(value);

    if (value.trim().length > 0) {
      const filtered = allBrandNames.filter(brand =>
        brand.toLowerCase().includes(value.toLowerCase())
      );
      setBrandNameSuggestions(filtered);
      setShowBrandNameSuggestions(filtered.length > 0);
    } else {
      setBrandNameSuggestions([]);
      setShowBrandNameSuggestions(false);
    }
  };

  const handleStoreChange = (value: string) => {
    setStore(value);

    if (value.trim().length > 0) {
      const filtered = allStores.filter(store =>
        store.toLowerCase().includes(value.toLowerCase())
      );
      setStoreSuggestions(filtered);
      setShowStoreSuggestions(filtered.length > 0);
    } else {
      setStoreSuggestions([]);
      setShowStoreSuggestions(false);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    // Sync country with currency
    if (newCurrency === 'SEK') {
      setCountry('SE');
    } else if (newCurrency === 'DKK') {
      setCountry('DK');
    }
  };

  const handleCountryChange = (newCountry: 'SE' | 'DK') => {
    setCountry(newCountry);
    // Sync currency with country
    if (newCountry === 'SE') {
      setCurrency('SEK');
    } else if (newCountry === 'DK') {
      setCurrency('DKK');
    }
  };

  const selectGroceryType = (suggestion: string) => {
    setGroceryType(suggestion);
    setShowGroceryTypeSuggestions(false);
    setGroceryTypeSuggestions([]);
  };

  const selectBrandName = (suggestion: string) => {
    setGroceryBrandName(suggestion);
    setShowBrandNameSuggestions(false);
    setBrandNameSuggestions([]);
  };

  const selectStore = (suggestion: string) => {
    setStore(suggestion);
    setShowStoreSuggestions(false);
    setStoreSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const entry: any = {
        groceryType: groceryType.trim(),
        price: parseFloat(price),
        currency,
        quantity: parseFloat(quantity),
        unit,
        country,
        date,
        userId: user.uid,
        userEmail: user.email,
      };

      // Only add optional fields if they have values
      if (groceryBrandName.trim()) {
        entry.groceryBrandName = groceryBrandName.trim();
      }
      if (amount) {
        entry.amount = parseFloat(amount);
      }
      if (store.trim()) {
        entry.store = store.trim();
      }

      await createPriceEntry(entry);

      setSuccess(true);
      // Reset form
      setGroceryType('');
      setGroceryBrandName('');
      setPrice('');
      setQuantity('1');
      setAmount('');
      setStore('');

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Full error object:', error);
      const errorMessage = error.message || error.toString() || 'Failed to submit price entry';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Submit Price Entry
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm flex items-center gap-2">
            <Check size={18} />
            Price entry submitted successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grocery Type *
              </label>
              <input
                type="text"
                required
                value={groceryType}
                onChange={(e) => handleGroceryTypeChange(e.target.value)}
                onFocus={() => {
                  if (groceryType.trim().length > 0 && groceryTypeSuggestions.length > 0) {
                    setShowGroceryTypeSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowGroceryTypeSuggestions(false), 200);
                }}
                placeholder="e.g., Milk, Bread, Eggs"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                autoComplete="off"
              />
              {showGroceryTypeSuggestions && groceryTypeSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {groceryTypeSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => selectGroceryType(suggestion)}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={groceryBrandName}
                onChange={(e) => handleBrandNameChange(e.target.value)}
                onFocus={() => {
                  if (groceryBrandName.trim().length > 0 && brandNameSuggestions.length > 0) {
                    setShowBrandNameSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowBrandNameSuggestions(false), 200);
                }}
                placeholder="e.g., Arla, Skånemejerier"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                autoComplete="off"
              />
              {showBrandNameSuggestions && brandNameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {brandNameSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => selectBrandName(suggestion)}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency *
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="SEK">SEK</option>
                <option value="DKK">DKK</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 1, 10"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 100, 1.5"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'gram' | 'kilogram' | 'milliliter' | 'liter' | 'pieces')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="gram">{t('Grams (g)')}</option>
                <option value="kilogram">Kilogram (kg)</option>
                <option value="milliliter">Milliliter (ml)</option>
                <option value="liter">{t('Liters (L)')}</option>
                <option value="pieces">{t('Pieces (pcs)')}</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Store
            </label>
            <input
              type="text"
              value={store}
              onChange={(e) => handleStoreChange(e.target.value)}
              onFocus={() => {
                if (store.trim().length > 0 && storeSuggestions.length > 0) {
                  setShowStoreSuggestions(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowStoreSuggestions(false), 200);
              }}
              placeholder="e.g., ICA, Willys, Føtex"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              autoComplete="off"
            />
            {showStoreSuggestions && storeSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {storeSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectStore(suggestion)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country *
              </label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value as 'SE' | 'DK')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="SE">Sweden</option>
                <option value="DK">Denmark</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 text-base font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-lg shadow-md"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Submit Price Entry'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PriceSubmitForm;
