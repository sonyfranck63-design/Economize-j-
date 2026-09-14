/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { OffersView } from './components/OffersView';
import { QuotesView } from './components/QuotesView';
import { FavoritesView } from './components/FavoritesView';
import { BusinessPortalView } from './components/BusinessPortalView';
import { AdminPortalView } from './components/AdminPortalView';
import { LocationSelectorModal } from './components/LocationSelectorModal';
import { QuoteRequestModal } from './components/QuoteRequestModal';
import { CompareQuotesModal } from './components/CompareQuotesModal';
import { BusinessDetailModal } from './components/BusinessDetailModal';
import { PriceAlertModal } from './components/PriceAlertModal';
import { PlayStoreModal } from './components/PlayStoreModal';
import { AuthModal } from './components/AuthModal';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { TermsOfServiceView } from './components/TermsOfServiceView';
import { DeleteAccountView } from './components/DeleteAccountView';
import { useNativeAndroid } from './hooks/useNativeAndroid';

const MainContent: React.FC = () => {
  const { activeTab, publicRoute, setPublicRoute, userRole } = useApp();

  // Integração nativa Android: Hardware Back Button & Teclado
  useNativeAndroid();

  const resetToApp = () => {
    window.location.hash = '';
    setPublicRoute('app');
  };

  const isBusinessOrAdmin = userRole === 'business' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white font-sans antialiased">
      {/* Sticky Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-8">
        {publicRoute === 'privacy' && <PrivacyPolicyView onBack={resetToApp} />}
        {publicRoute === 'terms' && <TermsOfServiceView onBack={resetToApp} />}
        {publicRoute === 'delete_account' && <DeleteAccountView onBack={resetToApp} />}

        {publicRoute === 'app' && (
          <>
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'search' && <SearchView />}
            {activeTab === 'offers' && <OffersView />}
            {activeTab === 'quotes' && <QuotesView />}
            {activeTab === 'favorites' && <FavoritesView />}
            {activeTab === 'business_portal' && <BusinessPortalView />}
            {activeTab === 'admin_portal' && (isAdmin ? <AdminPortalView /> : <HomeView />)}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Thumb Navigation */}
      <BottomNav />

      {/* Global Application Modals */}
      <LocationSelectorModal />
      <QuoteRequestModal />
      <CompareQuotesModal />
      <BusinessDetailModal />
      <PriceAlertModal />
      <PlayStoreModal />
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
