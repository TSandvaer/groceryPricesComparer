import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Save, X, Plus } from 'lucide-react';
import { getTranslations, deleteTranslation, updateTranslation, createTranslation } from '../../firebase/firestore';
import type { Translation } from '../../types';

const TranslationsView: React.FC = () => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Translation>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTranslation, setNewTranslation] = useState({
    en: '',
    da: '',
    sv: '',
  });

  useEffect(() => {
    loadTranslations();
  }, []);

  const loadTranslations = async () => {
    try {
      setLoading(true);
      const data = await getTranslations();
      setTranslations(data.sort((a, b) => a.en.localeCompare(b.en)));
    } catch (err: any) {
      setError(err.message || 'Failed to load translations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation?')) return;

    try {
      await deleteTranslation(id);
      setTranslations(translations.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete translation');
    }
  };

  const startEdit = (translation: Translation) => {
    setEditingId(translation.id);
    setEditForm({
      en: translation.en,
      da: translation.da,
      sv: translation.sv,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      await updateTranslation(editingId, editForm);
      setTranslations(translations.map(t =>
        t.id === editingId ? { ...t, ...editForm } : t
      ));
      cancelEdit();
    } catch (err: any) {
      setError(err.message || 'Failed to update translation');
    }
  };

  const handleAddTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTranslation.en.trim() || !newTranslation.da.trim() || !newTranslation.sv.trim()) {
      setError('All translation fields are required');
      return;
    }

    try {
      await createTranslation(newTranslation);
      await loadTranslations();
      setNewTranslation({ en: '', da: '', sv: '' });
      setShowAddForm(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to create translation');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading translations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manage Translations
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              English text is used as the key. Add translations for Danish and Swedish.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Add Translation
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Add Translation Form */}
        {showAddForm && (
          <form onSubmit={handleAddTranslation} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Translation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  English (Key)
                </label>
                <input
                  type="text"
                  value={newTranslation.en}
                  onChange={(e) => setNewTranslation({ ...newTranslation, en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="English text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Danish
                </label>
                <input
                  type="text"
                  value={newTranslation.da}
                  onChange={(e) => setNewTranslation({ ...newTranslation, da: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Dansk tekst"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Swedish
                </label>
                <input
                  type="text"
                  value={newTranslation.sv}
                  onChange={(e) => setNewTranslation({ ...newTranslation, sv: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Svensk text"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Add Translation
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTranslation({ en: '', da: '', sv: '' });
                  setError('');
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Translations Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">English</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Danish</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Swedish</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {translations.map((translation) => (
                <tr key={translation.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  {editingId === translation.id ? (
                    <>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.en || ''}
                          onChange={(e) => setEditForm({ ...editForm, en: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.da || ''}
                          onChange={(e) => setEditForm({ ...editForm, da: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editForm.sv || ''}
                          onChange={(e) => setEditForm({ ...editForm, sv: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
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
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{translation.en}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{translation.da}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{translation.sv}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => startEdit(translation)}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(translation.id)}
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

          {translations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No translations yet. Add your first translation to get started!
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Total translations: {translations.length}
        </div>
      </div>
    </div>
  );
};

export default TranslationsView;
