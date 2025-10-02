import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, Minus } from 'lucide-react';
import { getPriceEntries, calculateAveragePrices } from '../../firebase/firestore';
import type { AveragePrice, PriceEntry } from '../../types';

const FlagIcon: React.FC<{ country: 'SE' | 'DK' }> = ({ country }) => {
  if (country === 'SE') {
    // Swedish flag: Blue with yellow cross
    return (
      <svg width="24" height="16" viewBox="0 0 24 16" className="inline-block">
        <rect width="24" height="16" fill="#006AA7"/>
        <rect x="6" width="3" height="16" fill="#FECC00"/>
        <rect y="6.5" width="24" height="3" fill="#FECC00"/>
      </svg>
    );
  } else {
    // Danish flag: Red with white cross
    return (
      <svg width="24" height="16" viewBox="0 0 24 16" className="inline-block">
        <rect width="24" height="16" fill="#C8102E"/>
        <rect x="6" width="3" height="16" fill="white"/>
        <rect y="6.5" width="24" height="3" fill="white"/>
      </svg>
    );
  }
};

const PriceComparisonView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [averagePrices, setAveragePrices] = useState<AveragePrice[]>([]);
  const [allEntries, setAllEntries] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBothCountriesOnly, setShowBothCountriesOnly] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const entries = await getPriceEntries();
      setAllEntries(entries);
      const averages = calculateAveragePrices(entries);
      setAveragePrices(averages);
    } catch (err: any) {
      setError(err.message || 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrices = averagePrices.filter(item => {
    const matchesSearch = item.groceryType.toLowerCase().includes(searchTerm.toLowerCase());
    const hasBothCountries = showBothCountriesOnly ? (item.countSE > 0 && item.countDK > 0) : true;
    return matchesSearch && hasBothCountries;
  });

  const formatPrice = (price: number | null, currency: string = 'SEK') => {
    if (price === null) return 'N/A';
    return `${price.toFixed(2)} ${currency}`;
  };

  const getCheaperIndicator = (item: AveragePrice) => {
    if (item.avgPriceSE === null || item.avgPriceDK === null) {
      return null;
    }

    if (item.avgPriceSE < item.avgPriceDK) {
      return {
        country: 'Sweden',
        countryCode: 'SE' as const,
        icon: <TrendingDown className="text-green-500" size={20} />
      };
    } else if (item.avgPriceDK < item.avgPriceSE) {
      return {
        country: 'Denmark',
        countryCode: 'DK' as const,
        icon: <TrendingDown className="text-green-500" size={20} />
      };
    } else {
      return {
        country: 'Same',
        countryCode: null,
        icon: <Minus className="text-gray-500" size={20} />
      };
    }
  };

  const getPackageInfo = (groceryType: string) => {
    const entries = allEntries.filter(e => e.groceryType.toLowerCase() === groceryType.toLowerCase());
    if (entries.length === 0) return null;

    const units = new Set(entries.map(e => e.unit).filter(u => u));
    const amounts = entries.map(e => e.amount).filter(a => a);
    const quantities = entries.map(e => e.quantity).filter(q => q);

    if (amounts.length === 0) return null;

    const avgQuantity = quantities.length > 0 ? quantities.reduce((a, b) => a! + b!, 0)! / quantities.length : 1;
    const avgAmount = amounts.reduce((a, b) => a! + b!, 0)! / amounts.length;

    const unitMap: Record<string, string> = {
      'gram': 'g',
      'kilogram': 'kg',
      'milliliter': 'ml',
      'liter': 'L'
    };

    if (units.size === 1) {
      const unit = unitMap[Array.from(units)[0]!] || '';
      return avgQuantity > 1
        ? `~${avgQuantity.toFixed(0)} × ${avgAmount.toFixed(0)} ${unit}`
        : `~${avgAmount.toFixed(0)} ${unit}`;
    }
    return 'varied';
  };

  const getUnitForDisplay = (groceryType: string) => {
    const entries = allEntries.filter(e => e.groceryType.toLowerCase() === groceryType.toLowerCase());
    if (entries.length === 0) return '';

    const units = new Set(entries.map(e => e.unit).filter(u => u));

    // Determine if this is weight or volume based on the units used
    const hasWeight = Array.from(units).some(u => u === 'gram' || u === 'kilogram');
    const hasVolume = Array.from(units).some(u => u === 'milliliter' || u === 'liter');

    if (hasWeight && !hasVolume) return '/kg';
    if (hasVolume && !hasWeight) return '/L';
    return '';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Price Comparison
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Showing average price per standard unit (per kg for weight, per L for volume). All prices converted to SEK for comparison.
        </p>

        {/* Search Bar and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search grocery items..."
              className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showBothCountriesOnly}
                onChange={(e) => setShowBothCountriesOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Show only items with data from both countries
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading price data...</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No items found matching your search.' : 'No price data available yet.'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Start contributing price entries to build the database!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Item
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Sweden (SEK)
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Denmark (DKK)
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cheaper
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((item, index) => {
                  const cheaper = getCheaperIndicator(item);
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900 dark:text-white capitalize">
                          {item.groceryType}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          SE: {item.countSE} entries | DK: {item.countDK} entries
                          {getPackageInfo(item.groceryType) && (
                            <> • {getPackageInfo(item.groceryType)}</>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 text-gray-900 dark:text-gray-100">
                        {item.avgPriceSE !== null ? `${item.avgPriceSE.toFixed(2)} SEK${getUnitForDisplay(item.groceryType)}` : 'N/A'}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-900 dark:text-gray-100">
                        {item.avgPriceDK !== null ? `${item.avgPriceDK.toFixed(2)} DKK${getUnitForDisplay(item.groceryType)}` : 'N/A'}
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {cheaper?.icon}
                          {cheaper?.countryCode && <FlagIcon country={cheaper.countryCode} />}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {cheaper?.country}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        {item.percentDifference !== null ? (
                          <span
                            className={`text-sm font-medium ${
                              item.percentDifference > 0
                                ? 'text-red-600 dark:text-red-400'
                                : item.percentDifference < 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {item.percentDifference > 0 ? '+' : ''}
                            {item.percentDifference.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceComparisonView;
