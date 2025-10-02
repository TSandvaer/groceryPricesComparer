import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Check } from 'lucide-react';
import { createPriceEntry, getPriceEntries } from '../../firebase/firestore';
import type { User } from 'firebase/auth';

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
  const [unit, setUnit] = useState<'gram' | 'kilogram' | 'milliliter' | 'liter'>('liter');
  const [store, setStore] = useState('');
  const [country, setCountry] = useState<'SE' | 'DK'>('SE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  const [groceryTypeSuggestions, setGroceryTypeSuggestions] = useState<string[]>([]);
  const [brandNameSuggestions, setBrandNameSuggestions] = useState<string[]>([]);
  const [storeSuggestions, setStoreSuggestions] = useState<string[]>([]);
  const [showGroceryTypeSuggestions, setShowGroceryTypeSuggestions] = useState(false);
  const [showBrandNameSuggestions, setShowBrandNameSuggestions] = useState(false);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [allGroceryTypes, setAllGroceryTypes] = useState<string[]>([]);
  const [allBrandNames, setAllBrandNames] = useState<string[]>([]);
  const [allStores, setAllStores] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

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

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            processImage(blob);
          }
        }, 'image/jpeg');
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = async (imageBlob: Blob) => {
    setImageProcessing(true);
    setError('');

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(imageBlob);
      reader.onloadend = async () => {
        // const base64Image = reader.result as string;

        // TODO: Call Google Vision API
        // For now, we'll show a placeholder message
        setError('Vision API integration required. Please fill in the form manually.');

        // Example of what Vision API would return:
        // const response = await callVisionAPI(base64Image);

        // Example of what Vision API would return:
        // const response = await callVisionAPI(base64Image);
        // setGroceryType(response.groceryType || '');
        // setPrice(response.price?.toString() || '');
        // setStore(response.store || '');

        setImageProcessing(false);
      };
    } catch (err) {
      setError('Failed to process image. Please try again.');
      setImageProcessing(false);
    }
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

        {/* Camera/Upload Section */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCameraCapture}
              disabled={cameraActive || imageProcessing}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Camera size={20} />
              Capture Photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageProcessing}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload size={20} />
              Upload Image
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {cameraActive && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  onClick={capturePhoto}
                  className="bg-white text-gray-900 px-6 py-2 rounded-full font-medium shadow-lg hover:bg-gray-100"
                >
                  Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-red-500 text-white px-6 py-2 rounded-full font-medium shadow-lg hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {imageProcessing && (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Processing image...</p>
            </div>
          )}
        </div>

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
                onChange={(e) => setUnit(e.target.value as 'gram' | 'kilogram' | 'milliliter' | 'liter')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="gram">Gram (g)</option>
                <option value="kilogram">Kilogram (kg)</option>
                <option value="milliliter">Milliliter (ml)</option>
                <option value="liter">Liter (L)</option>
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
