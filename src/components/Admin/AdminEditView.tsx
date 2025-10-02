import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Save, X, Search, Filter } from 'lucide-react';
import { getPriceEntries, deletePriceEntry, updatePriceEntry, bulkDeletePriceEntries } from '../../firebase/firestore';
import type { PriceEntry } from '../../types';

const AdminEditView: React.FC = () => {
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PriceEntry>>({});
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleteDate, setBulkDeleteDate] = useState('');
  const [bulkDeleteUser, setBulkDeleteUser] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await getPriceEntries();
      setEntries(data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err: any) {
      setError(err.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deletePriceEntry(id);
      setEntries(entries.filter(e => e.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry');
    }
  };

  const startEdit = (entry: PriceEntry) => {
    setEditingId(entry.id);
    setEditForm({
      groceryType: entry.groceryType,
      groceryBrandName: entry.groceryBrandName,
      price: entry.price,
      currency: entry.currency,
      quantity: entry.quantity ?? 1,
      amount: entry.amount ?? 0,
      unit: entry.unit ?? 'liter',
      store: entry.store,
      country: entry.country,
      date: entry.date,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      await updatePriceEntry(editingId, editForm);
      setEntries(entries.map(e =>
        e.id === editingId ? { ...e, ...editForm } : e
      ));
      cancelEdit();
    } catch (err: any) {
      setError(err.message || 'Failed to update entry');
    }
  };

  const handleBulkDeleteByDate = async () => {
    if (!bulkDeleteDate) {
      setError('Please select a date');
      return;
    }

    const cutoffDate = new Date(bulkDeleteDate);
    const entriesToDelete = entries.filter(entry => new Date(entry.createdAt) < cutoffDate);

    if (entriesToDelete.length === 0) {
      setError('No entries found older than the selected date');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${entriesToDelete.length} entries older than ${bulkDeleteDate}?`)) {
      return;
    }

    try {
      await bulkDeletePriceEntries(entriesToDelete.map(e => e.id));
      setEntries(entries.filter(e => new Date(e.createdAt) >= cutoffDate));
      setBulkDeleteDate('');
      setShowBulkDelete(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to delete entries');
    }
  };

  const handleBulkDeleteByUser = async () => {
    if (!bulkDeleteUser.trim()) {
      setError('Please enter a user email or ID');
      return;
    }

    const searchTerm = bulkDeleteUser.toLowerCase().trim();
    const entriesToDelete = entries.filter(entry =>
      entry.userEmail?.toLowerCase().includes(searchTerm) ||
      entry.userId.toLowerCase().includes(searchTerm)
    );

    if (entriesToDelete.length === 0) {
      setError('No entries found for the specified user');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${entriesToDelete.length} entries by user "${bulkDeleteUser}"?`)) {
      return;
    }

    try {
      await bulkDeletePriceEntries(entriesToDelete.map(e => e.id));
      setEntries(entries.filter(e => !entriesToDelete.includes(e)));
      setBulkDeleteUser('');
      setShowBulkDelete(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to delete entries');
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.groceryType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.groceryBrandName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.store?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading entries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin: Edit Entries
          </h2>
          <button
            onClick={() => setShowBulkDelete(!showBulkDelete)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Filter size={18} />
            Bulk Delete
          </button>
        </div>

        {/* Bulk Delete Panel */}
        {showBulkDelete && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-4">Bulk Delete Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delete by Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Delete entries older than:
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={bulkDeleteDate}
                    onChange={(e) => setBulkDeleteDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <button
                    onClick={handleBulkDeleteByDate}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Delete by User */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Delete entries by user:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bulkDeleteUser}
                    onChange={(e) => setBulkDeleteUser(e.target.value)}
                    placeholder="Enter email or user ID"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <button
                    onClick={handleBulkDeleteByUser}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              placeholder="Search by type, brand, store, or user..."
              className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Brand</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Price</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Qty × Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Store</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Country</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Submitted By</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  {editingId === entry.id ? (
                    <>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.groceryType || ''}
                          onChange={(e) => setEditForm({ ...editForm, groceryType: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.groceryBrandName || ''}
                          onChange={(e) => setEditForm({ ...editForm, groceryBrandName: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.price || ''}
                          onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 border rounded text-sm text-right dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 items-center justify-center">
                          <input
                            type="number"
                            step="1"
                            value={editForm.quantity || ''}
                            onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) })}
                            className="w-12 px-2 py-1 border rounded text-sm text-right dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Qty"
                          />
                          <span className="text-gray-500">×</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.amount || ''}
                            onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                            className="w-16 px-2 py-1 border rounded text-sm text-right dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Amt"
                          />
                          <select
                            value={editForm.unit || ''}
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value as 'gram' | 'kilogram' | 'milliliter' | 'liter' | 'pieces' })}
                            className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                          >
                            <option value="gram">g</option>
                            <option value="kilogram">kg</option>
                            <option value="milliliter">ml</option>
                            <option value="liter">L</option>
                            <option value="pieces">pcs</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.store || ''}
                          onChange={(e) => setEditForm({ ...editForm, store: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <select
                          value={editForm.country || ''}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value as 'SE' | 'DK' })}
                          className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        >
                          <option value="SE">SE</option>
                          <option value="DK">DK</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="date"
                          value={editForm.date || ''}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {entry.userEmail || entry.userId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={saveEdit}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                            title="Save"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{entry.groceryType}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{entry.groceryBrandName || '-'}</td>
                      <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                        {entry.price.toFixed(2)} {entry.currency}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-900 dark:text-gray-100">
                        {entry.quantity && entry.amount && entry.unit
                          ? `${entry.quantity} × ${entry.amount} ${entry.unit === 'gram' ? 'g' : entry.unit === 'kilogram' ? 'kg' : entry.unit === 'milliliter' ? 'ml' : entry.unit === 'liter' ? 'L' : 'pcs'}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{entry.store || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.country === 'SE'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {entry.country}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        {entry.date}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {entry.userEmail || entry.userId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'No entries found matching your search.' : 'No entries yet.'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Total entries: {filteredEntries.length}
        </div>
      </div>
    </div>
  );
};

export default AdminEditView;
