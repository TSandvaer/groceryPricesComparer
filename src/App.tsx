import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthComponent from './components/Auth/AuthComponent';
import Header from './components/Layout/Header';
import PriceSubmitForm from './components/PriceSubmit/PriceSubmitForm';
import PriceComparisonView from './components/PriceComparison/PriceComparisonView';
import AdminEditView from './components/Admin/AdminEditView';
import TranslationsView from './components/Admin/TranslationsView';
import UserRequestsView from './components/Admin/UserRequestsView';
import { useLanguage } from './contexts/LanguageContext';
import PSLogo from '../images/PSLogo.png';

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'compare' | 'submit' | 'edit' | 'translations' | 'userRequests'>('compare');
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <img
            src={PSLogo}
            alt="Price Comparer Logo"
            className="h-20 w-auto object-contain mx-auto mb-4"
          />
          <div className="rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4 animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthComponent />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={user} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'compare' ? (
          <PriceComparisonView />
        ) : currentView === 'submit' ? (
          <PriceSubmitForm user={user} onSuccess={() => setCurrentView('compare')} />
        ) : currentView === 'edit' ? (
          <AdminEditView />
        ) : currentView === 'translations' ? (
          <TranslationsView />
        ) : (
          <UserRequestsView user={user} />
        )}
      </main>
    </div>
  );
}

export default App;
