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
import { ErrorBoundary } from './components/ErrorBoundary';
import { useNativeAndroid } from './hooks/useNativeAndroid';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { PageTransition } from './components/PageTransition';

const MainContent: React.FC = () => {
  const { activeTab, publicRoute, setPublicRoute, userRole } = useApp();

  // Integração nativa Android: Hardware Back Button & Teclado
  useNativeAndroid();

  // Garante que a rolagem retorne ao topo ao trocar de aba ou rota
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, publicRoute]);

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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          {publicRoute === 'privacy' && (
            <PageTransition key="privacy" id="privacy">
              <PrivacyPolicyView onBack={resetToApp} />
            </PageTransition>
          )}
          {publicRoute === 'terms' && (
            <PageTransition key="terms" id="terms">
              <TermsOfServiceView onBack={resetToApp} />
            </PageTransition>
          )}
          {publicRoute === 'delete_account' && (
            <PageTransition key="delete_account" id="delete_account">
              <DeleteAccountView onBack={resetToApp} />
            </PageTransition>
          )}

          {publicRoute === 'app' && (
            <PageTransition key={activeTab} id={activeTab}>
              {activeTab === 'home' && <HomeView />}
              {activeTab === 'search' && <SearchView />}
              {activeTab === 'offers' && <OffersView />}
              {activeTab === 'quotes' && <QuotesView />}
              {activeTab === 'favorites' && <FavoritesView />}
              {activeTab === 'business_portal' && <BusinessPortalView />}
              {activeTab === 'admin_portal' && (isAdmin ? <AdminPortalView /> : <HomeView />)}
            </PageTransition>
          )}
        </AnimatePresence>
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
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <MainContent />
        </AppProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
