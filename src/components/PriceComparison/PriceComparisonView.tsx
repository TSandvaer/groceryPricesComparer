import React, { useState, useEffect } from 'react';
import { Search, TrendingDown, Minus } from 'lucide-react';
import { getPriceEntries, calculateAveragePrices } from '../../firebase/firestore';
import type { AveragePrice } from '../../types';

const PriceComparisonView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [averagePrices, setAveragePrices] = useState<AveragePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const entries = await getPriceEntries();
      const averages = calculateAveragePrices(entries);
      setAveragePrices(averages);
    } catch (err: any) {
      setError(err.message || 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrices = averagePrices.filter(item =>
    item.groceryType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number | null, currency: string = 'SEK') => {
    if (price === null) return 'N/A';
    return `${price.toFixed(2)} ${currency}`;
  };

  const getCheaperIndicator = (item: AveragePrice) => {
    if (item.avgPriceSE === null || item.avgPriceDK === null) {
      return null;
    }

    if (item.avgPriceSE < item.avgPriceDK) {
      return { country: 'Sweden', icon: <TrendingDown className="text-green-500" size={20} /> };
    } else if (item.avgPriceDK < item.avgPriceSE) {
      return { country: 'Denmark', icon: <TrendingDown className="text-green-500" size={20} /> };
    } else {
      return { country: 'Same', icon: <Minus className="text-gray-500" size={20} /> };
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Price Comparison
        </h2>

        {/* Search Bar */}
        <div className="mb-6">
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
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 text-gray-900 dark:text-gray-100">
                        {formatPrice(item.avgPriceSE, 'SEK')}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-900 dark:text-gray-100">
                        {formatPrice(item.avgPriceDK, 'DKK')}
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {cheaper?.icon}
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
