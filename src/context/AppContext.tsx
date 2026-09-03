import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Business,
  Offer,
  QuoteRequest,
  QuoteProposal,
  PriceAlert,
  Review,
  ChatMessage,
  AdminMonetizationSettings,
  NotificationItem,
  UserLocation,
  UserRole,
} from '../types';
import {
  INITIAL_BUSINESSES,
  INITIAL_OFFERS,
  INITIAL_QUOTE_REQUESTS,
  INITIAL_REVIEWS,
  INITIAL_MONETIZATION,
} from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService, AuthUserProfile } from '../services/authService';
import { dataService } from '../services/dataService';

export type PublicPageRoute = 'app' | 'privacy' | 'terms' | 'delete_account';

interface AppContextType {
  activeTab: 'home' | 'search' | 'offers' | 'quotes' | 'favorites' | 'business_portal' | 'admin_portal';
  setActiveTab: (tab: 'home' | 'search' | 'offers' | 'quotes' | 'favorites' | 'business_portal' | 'admin_portal') => void;
  publicRoute: PublicPageRoute;
  setPublicRoute: (route: PublicPageRoute) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentLocation: UserLocation;
  setCurrentLocation: (loc: UserLocation) => void;
  isLocating: boolean;
  detectUserLocation: () => void;
  
  // Real Auth State
  currentUser: AuthUserProfile | null;
  setCurrentUser: (user: AuthUserProfile | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  logout: () => Promise<void>;
  
  // Data
  businesses: Business[];
  offers: Offer[];
  quoteRequests: QuoteRequest[];
  reviews: Review[];
  priceAlerts: PriceAlert[];
  notifications: NotificationItem[];
  chatMessages: ChatMessage[];
  monetization: AdminMonetizationSettings;
  favorites: { businessIds: string[]; offerIds: string[] };
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isLoadingData: boolean;
  isDatabaseConnected: boolean;
  
  // Actions
  toggleFavoriteBusiness: (id: string) => void;
  toggleFavoriteOffer: (id: string) => void;
  createQuoteRequest: (data: Omit<QuoteRequest, 'id' | 'createdAt' | 'status' | 'proposals'>) => Promise<string>;
  submitProposal: (quoteRequestId: string, proposal: Omit<QuoteProposal, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  acceptProposal: (quoteRequestId: string, proposalId: string) => Promise<void>;
  createPriceAlert: (data: Omit<PriceAlert, 'id' | 'createdAt' | 'active' | 'notified'>) => Promise<void>;
  removePriceAlert: (id: string) => Promise<void>;
  addReview: (businessId: string, rating: number, comment: string) => Promise<void>;
  reportReview: (reviewId: string) => Promise<void>;
  sendChatMessage: (businessId: string, text: string, quoteRequestId?: string) => void;
  createOffer: (offerData: Omit<Offer, 'id' | 'viewsCount' | 'claimsCount'>) => Promise<void>;
  createBusiness: (businessData: Omit<Business, 'id' | 'leadsReceivedCount'>) => Promise<void>;
  updateMonetization: (settings: AdminMonetizationSettings) => Promise<void>;
  markNotificationRead: (id: string) => void;
  deleteAccountAndData: () => void;

  // Modals & Navigation Helpers
  selectedBusinessId: string | null;
  setSelectedBusinessId: (id: string | null) => void;
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: (open: boolean) => void;
  quoteCategoryPreset: string | null;
  setQuoteCategoryPreset: (cat: string | null) => void;
  comparingQuoteRequestId: string | null;
  setComparingQuoteRequestId: (id: string | null) => void;
  isPriceAlertModalOpen: boolean;
  setIsPriceAlertModalOpen: (open: boolean) => void;
  activeChatBusinessId: string | null;
  setActiveChatBusinessId: (id: string | null) => void;
  isPlayStoreModalOpen: boolean;
  setIsPlayStoreModalOpen: (open: boolean) => void;
  isLegalModalOpen: boolean;
  setIsLegalModalOpen: (open: boolean) => void;
  isLocationSelectorOpen: boolean;
  setIsLocationSelectorOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'offers' | 'quotes' | 'favorites' | 'business_portal' | 'admin_portal'>('home');
  const [publicRoute, setPublicRoute] = useState<PublicPageRoute>('app');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(isSupabaseConfigured);

  const [currentLocation, setCurrentLocation] = useState<UserLocation>({
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Centro',
  });

  // Auth
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('customer');

  // Persistence State
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    // Only used as dev fallback if database credentials are not set
    return isSupabaseConfigured ? [] : INITIAL_BUSINESSES;
  });

  const [offers, setOffers] = useState<Offer[]>(() => {
    return isSupabaseConfigured ? [] : INITIAL_OFFERS;
  });

  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>(() => {
    return isSupabaseConfigured ? [] : INITIAL_QUOTE_REQUESTS;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    return isSupabaseConfigured ? [] : INITIAL_REVIEWS;
  });

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [favorites, setFavorites] = useState<{ businessIds: string[]; offerIds: string[] }>({
    businessIds: [],
    offerIds: [],
  });

  const [monetization, setMonetization] = useState<AdminMonetizationSettings>(INITIAL_MONETIZATION);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Modals state
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteCategoryPreset, setQuoteCategoryPreset] = useState<string | null>(null);
  const [comparingQuoteRequestId, setComparingQuoteRequestId] = useState<string | null>(null);
  const [isPriceAlertModalOpen, setIsPriceAlertModalOpen] = useState(false);
  const [activeChatBusinessId, setActiveChatBusinessId] = useState<string | null>(null);
  const [isPlayStoreModalOpen, setIsPlayStoreModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);

  // Check URL pathname or hash for Google Play and LGPD compliance routes (/privacy, /terms, /delete-account)
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.includes('privacy') || hash.includes('privacy')) {
        setPublicRoute('privacy');
      } else if (path.includes('terms') || hash.includes('terms')) {
        setPublicRoute('terms');
      } else if (path.includes('delete-account') || hash.includes('delete-account')) {
        setPublicRoute('delete_account');
      } else {
        setPublicRoute('app');
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, []);

  // Fetch from Supabase when configured
  useEffect(() => {
    async function loadBackendData() {
      if (!isSupabaseConfigured) {
        setIsDatabaseConnected(false);
        return;
      }

      setIsLoadingData(true);
      try {
        const [bizList, offList, quoteList, settings, userProfile] = await Promise.all([
          dataService.getBusinesses(),
          dataService.getOffers(),
          dataService.getQuoteRequests(),
          dataService.getMonetizationSettings(),
          authService.getCurrentProfile(),
        ]);

        if (bizList && bizList.length > 0) setBusinesses(bizList);
        if (offList && offList.length > 0) setOffers(offList);
        if (quoteList && quoteList.length > 0) setQuoteRequests(quoteList);
        if (settings) setMonetization(settings);

        if (userProfile) {
          setCurrentUser(userProfile);
          setUserRole(userProfile.role);
        }

        setIsDatabaseConnected(true);
      } catch (err) {
        console.error('Falha ao sincronizar com backend Supabase:', err);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadBackendData();
  }, []);

  // Geolocation trigger
  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada neste navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setCurrentLocation({
          city: 'São Paulo',
          state: 'SP',
          neighborhood: 'Bairro Local Detectado',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setNotifications((prev) => [
          {
            id: `loc-${Date.now()}`,
            title: '📍 Localização Atualizada',
            message: 'Buscando empresas e ofertas no seu raio de proximidade.',
            timestamp: 'Agora',
            type: 'system',
            read: false,
          },
          ...prev,
        ]);
      },
      () => {
        setIsLocating(false);
        setCurrentLocation({
          city: 'São Paulo',
          state: 'SP',
          neighborhood: 'Centro',
        });
      },
      { timeout: 8000 }
    );
  };

  const toggleFavoriteBusiness = (id: string) => {
    setFavorites((prev) => {
      const exists = prev.businessIds.includes(id);
      return {
        ...prev,
        businessIds: exists
          ? prev.businessIds.filter((bId) => bId !== id)
          : [...prev.businessIds, id],
      };
    });
  };

  const toggleFavoriteOffer = (id: string) => {
    setFavorites((prev) => {
      const exists = prev.offerIds.includes(id);
      return {
        ...prev,
        offerIds: exists
          ? prev.offerIds.filter((oId) => oId !== id)
          : [...prev.offerIds, id],
      };
    });
  };

  const createQuoteRequest = async (
    data: Omit<QuoteRequest, 'id' | 'createdAt' | 'status' | 'proposals'>
  ): Promise<string> => {
    const newId = `qr-${Date.now()}`;
    const newQuote: QuoteRequest = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'aberto',
      proposals: [],
    };

    setQuoteRequests((prev) => [newQuote, ...prev]);

    if (isSupabaseConfigured && currentUser?.id) {
      try {
        const dbId = await dataService.createQuoteRequest(data, currentUser.id);
        return dbId;
      } catch (err) {
        console.error('Erro ao persistir cotação no Supabase:', err);
      }
    }

    setNotifications((prev) => [
      {
        id: `qr-notif-${Date.now()}`,
        title: '📋 Orçamento Enviado com Sucesso',
        message: `Sua solicitação de "${data.title}" foi repassada para as empresas da sua região.`,
        timestamp: 'Agora',
        type: 'proposal',
        read: false,
        linkAction: 'quotes',
      },
      ...prev,
    ]);

    return newId;
  };

  const submitProposal = async (
    quoteRequestId: string,
    proposalData: Omit<QuoteProposal, 'id' | 'createdAt' | 'status'>
  ) => {
    const newProposal: QuoteProposal = {
      ...proposalData,
      id: `prop-${Date.now()}`,
      quoteRequestId,
      createdAt: 'Agora',
      status: 'pendente',
    };

    setQuoteRequests((prev) =>
      prev.map((qr) => {
        if (qr.id === quoteRequestId) {
          return {
            ...qr,
            status: 'propostas_recebidas',
            proposals: [...qr.proposals, newProposal],
          };
        }
        return qr;
      })
    );

    if (isSupabaseConfigured) {
      try {
        await dataService.submitProposal({
          quoteRequestId,
          businessId: proposalData.businessId,
          price: proposalData.price,
          deadlineText: proposalData.deadlineText,
          description: proposalData.description,
        });
      } catch (err) {
        console.error('Erro ao salvar proposta no Supabase:', err);
      }
    }
  };

  const acceptProposal = async (quoteRequestId: string, proposalId: string) => {
    setQuoteRequests((prev) =>
      prev.map((qr) => {
        if (qr.id === quoteRequestId) {
          return {
            ...qr,
            status: 'escolhido',
            proposals: qr.proposals.map((p) => ({
              ...p,
              status: p.id === proposalId ? 'escolhida' : 'recusada',
            })),
          };
        }
        return qr;
      })
    );

    if (isSupabaseConfigured) {
      try {
        await dataService.acceptProposal(quoteRequestId, proposalId);
      } catch (err) {
        console.error('Erro ao aceitar proposta no Supabase:', err);
      }
    }

    setNotifications((prev) => [
      {
        id: `accept-${Date.now()}`,
        title: '🎉 Proposta Escolhida!',
        message: 'Você escolheu a proposta. A empresa foi notificada para agendamento.',
        timestamp: 'Agora',
        type: 'system',
        read: false,
      },
      ...prev,
    ]);
  };

  const createPriceAlert = async (data: Omit<PriceAlert, 'id' | 'createdAt' | 'active' | 'notified'>) => {
    const newAlert: PriceAlert = {
      ...data,
      id: `pa-${Date.now()}`,
      createdAt: new Date().toISOString(),
      active: true,
      notified: false,
    };

    setPriceAlerts((prev) => [newAlert, ...prev]);

    if (isSupabaseConfigured && currentUser?.id) {
      try {
        await dataService.createPriceAlert(data, currentUser.id);
      } catch (err) {
        console.error('Erro ao persistir alerta:', err);
      }
    }
  };

  const removePriceAlert = async (id: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
    if (isSupabaseConfigured) {
      await dataService.removePriceAlert(id);
    }
  };

  const addReview = async (businessId: string, rating: number, comment: string) => {
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      businessId,
      userName: currentUser?.fullName || 'Cliente Verificado',
      rating,
      comment,
      createdAt: new Date().toISOString().split('T')[0],
      verifiedService: true,
      reported: false,
      isDemo: false,
    };

    setReviews((prev) => [newReview, ...prev]);

    setBusinesses((prev) =>
      prev.map((b) => {
        if (b.id === businessId) {
          const totalReviews = b.reviewCount + 1;
          const newAvg = Number(((b.rating * b.reviewCount + rating) / totalReviews).toFixed(1));
          return {
            ...b,
            rating: newAvg,
            reviewCount: totalReviews,
          };
        }
        return b;
      })
    );

    if (isSupabaseConfigured && currentUser?.id) {
      try {
        await dataService.addReview({
          businessId,
          userId: currentUser.id,
          userName: currentUser.fullName,
          rating,
          comment,
        });
      } catch (err) {
        console.error('Erro ao salvar avaliação:', err);
      }
    }
  };

  const reportReview = async (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, reported: true } : r))
    );
    if (isSupabaseConfigured) {
      await dataService.reportReview(reviewId);
    }
    alert('Avaliação denunciada para moderação administrativa.');
  };

  const sendChatMessage = (businessId: string, text: string, quoteRequestId?: string) => {
    const msgId = `m-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: msgId,
      conversationId: `conv-${businessId}`,
      businessId,
      userId: currentUser?.id || 'u-current',
      senderType: userRole === 'business' ? 'business' : 'user',
      senderName: userRole === 'business' ? 'Empresa' : (currentUser?.fullName || 'Você'),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quoteRequestId,
    };

    setChatMessages((prev) => [...prev, newMsg]);
  };

  const createOffer = async (offerData: Omit<Offer, 'id' | 'viewsCount' | 'claimsCount'>) => {
    const newOffer: Offer = {
      ...offerData,
      id: `off-${Date.now()}`,
      viewsCount: 1,
      claimsCount: 0,
    };
    setOffers((prev) => [newOffer, ...prev]);

    if (isSupabaseConfigured) {
      try {
        await dataService.createOffer(offerData);
      } catch (err) {
        console.error('Erro ao criar oferta no Supabase:', err);
      }
    }
  };

  const createBusiness = async (businessData: Omit<Business, 'id' | 'leadsReceivedCount'>) => {
    const newBusiness: Business = {
      ...businessData,
      id: `b-${Date.now()}`,
      leadsReceivedCount: 0,
    };
    setBusinesses((prev) => [newBusiness, ...prev]);

    if (isSupabaseConfigured && currentUser?.id) {
      try {
        await dataService.createBusiness(businessData, currentUser.id);
      } catch (err) {
        console.error('Erro ao criar empresa no Supabase:', err);
      }
    }
  };

  const updateMonetization = async (settings: AdminMonetizationSettings) => {
    setMonetization(settings);
    if (isSupabaseConfigured) {
      try {
        await dataService.updateMonetizationSettings(settings);
      } catch (err) {
        console.error('Erro ao salvar parametrizações:', err);
      }
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteAccountAndData = () => {
    setCurrentUser(null);
    setUserRole('customer');
    setFavorites({ businessIds: [], offerIds: [] });
    setPriceAlerts([]);
    setNotifications([]);
    setChatMessages([]);
  };

  const logout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      // Ignora erro
    }
    setCurrentUser(null);
    setUserRole('customer');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        publicRoute,
        setPublicRoute,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        currentLocation,
        setCurrentLocation,
        isLocating,
        detectUserLocation,

        currentUser,
        setCurrentUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        logout,

        businesses,
        offers,
        quoteRequests,
        reviews,
        priceAlerts,
        notifications,
        chatMessages,
        monetization,
        favorites,
        userRole,
        setUserRole,
        isLoadingData,
        isDatabaseConnected,

        toggleFavoriteBusiness,
        toggleFavoriteOffer,
        createQuoteRequest,
        submitProposal,
        acceptProposal,
        createPriceAlert,
        removePriceAlert,
        addReview,
        reportReview,
        sendChatMessage,
        createOffer,
        createBusiness,
        updateMonetization,
        markNotificationRead,
        deleteAccountAndData,

        selectedBusinessId,
        setSelectedBusinessId,
        isQuoteModalOpen,
        setIsQuoteModalOpen,
        quoteCategoryPreset,
        setQuoteCategoryPreset,
        comparingQuoteRequestId,
        setComparingQuoteRequestId,
        isPriceAlertModalOpen,
        setIsPriceAlertModalOpen,
        activeChatBusinessId,
        setActiveChatBusinessId,
        isPlayStoreModalOpen,
        setIsPlayStoreModalOpen,
        isLegalModalOpen,
        setIsLegalModalOpen,
        isLocationSelectorOpen,
        setIsLocationSelectorOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
