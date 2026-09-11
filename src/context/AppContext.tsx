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
import { getSmartImage, isInvalidOrDeadImageUrl } from '../utils/imageUtils';
import { getDeletedQuoteIds, markQuoteAsDeletedLocally } from '../utils/quoteStorage';

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
  toggleFavoriteBusiness: (id: string) => Promise<void>;
  toggleFavoriteOffer: (id: string) => Promise<void>;
  createQuoteRequest: (data: Omit<QuoteRequest, 'id' | 'createdAt' | 'status' | 'proposals'>) => Promise<string>;
  submitProposal: (quoteRequestId: string, proposal: Omit<QuoteProposal, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  acceptProposal: (quoteRequestId: string, proposalId: string) => Promise<void>;
  cancelQuoteRequest: (quoteRequestId: string) => Promise<void>;
  deleteQuoteRequest: (quoteRequestId: string) => Promise<void>;
  createPriceAlert: (data: Omit<PriceAlert, 'id' | 'createdAt' | 'active' | 'notified'>) => Promise<void>;
  removePriceAlert: (id: string) => Promise<void>;
  addReview: (businessId: string, rating: number, comment: string) => Promise<void>;
  reportReview: (reviewId: string) => Promise<void>;
  sendChatMessage: (businessId: string, text: string, quoteRequestId?: string) => void;
  createOffer: (offerData: Omit<Offer, 'id' | 'viewsCount' | 'claimsCount'>) => Promise<void>;
  addOffer: (offerData: Omit<Offer, 'id' | 'viewsCount' | 'claimsCount'>) => Promise<void>;
  createBusiness: (businessData: Omit<Business, 'id' | 'leadsReceivedCount'>) => Promise<void>;
  updateMonetization: (settings: AdminMonetizationSettings) => Promise<void>;
  toggleBusinessActive: (businessId: string) => void;
  toggleBusinessVerified: (businessId: string) => void;
  toggleBusinessFeatured: (businessId: string) => void;
  removeOffer: (offerId: string) => void;
  deleteBusiness: (businessId: string) => void;
  upgradeBusinessPlan: (businessId: string, planTier: 'free' | 'pro' | 'premium') => void;
  markNotificationRead: (id: string) => void;
  deleteAccountAndData: () => void;
  refreshQuoteRequests: () => Promise<void>;

  // Modals & Navigation Helpers
  selectedBusinessId: string | null;
  setSelectedBusinessId: (id: string | null) => void;
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: (open: boolean) => void;
  quoteCategoryPreset: string | null;
  quoteTargetBusinessId: string | null;
  setQuoteTargetBusinessId: (id: string | null) => void;
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
    city: '',
    state: '',
    neighborhood: '',
  });

  // Auth
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('customer');

  // Sync userRole with currentUser
  useEffect(() => {
    if (currentUser) {
      setUserRole(currentUser.role);
    } else {
      setUserRole('customer');
    }
  }, [currentUser]);

  // Persistence State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);

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
  const [quoteTargetBusinessId, setQuoteTargetBusinessId] = useState<string | null>(null);
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

      if (
        path.includes('privacy') || hash.includes('privacy') ||
        path.includes('privacidade') || hash.includes('privacidade')
      ) {
        setPublicRoute('privacy');
      } else if (
        path.includes('terms') || hash.includes('terms') ||
        path.includes('termos') || hash.includes('termos')
      ) {
        setPublicRoute('terms');
      } else if (
        path.includes('delete-account') || hash.includes('delete-account') ||
        path.includes('excluir-conta') || hash.includes('excluir-conta') ||
        path.includes('excluir_conta') || hash.includes('excluir_conta')
      ) {
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
          dataService.getBusinesses(undefined, undefined, true),
          dataService.getOffers(),
          dataService.getQuoteRequests(),
          dataService.getMonetizationSettings(),
          authService.getCurrentProfile(),
        ]);

        if (bizList && bizList.length > 0) setBusinesses(bizList);
        if (offList && offList.length > 0) setOffers(offList);
        if (settings) setMonetization(settings);

        const deletedIds = getDeletedQuoteIds();
        const initialCleanQuotes = (quoteList || []).filter((q) => !deletedIds.has(q.id) && q.status !== 'cancelado');

        if (userProfile) {
          setCurrentUser(userProfile);
          setUserRole(userProfile.role);

          // Carrega favoritos persistidos do usuário autenticado no Supabase
          const userFavs = await dataService.getUserFavorites(userProfile.id);
          if (userFavs) {
            setFavorites(userFavs);
          }

          // Identifica empresas pertencentes ao usuário para garantir orçamentos direcionados
          const myBizIds = (bizList || [])
            .filter((b) => (b.ownerId || '').toLowerCase() === (userProfile.id || '').toLowerCase())
            .map((b) => b.id);

          // Sincroniza todas as cotações: direcionadas às empresas do usuário + marketplace + cotações pessoais
          const allQuotes = await dataService.syncAllQuoteRequests(userProfile.id, myBizIds);
          setQuoteRequests(allQuotes);
        } else {
          setQuoteRequests(initialCleanQuotes);
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

  // Sincroniza favoritos e cotações do usuário autenticado sempre que o login for realizado ou empresas atualizadas
  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured) {
      return;
    }

    // Carrega favoritos do Supabase
    dataService.getUserFavorites(currentUser.id).then((userFavs) => {
      if (userFavs) {
        setFavorites(userFavs);
      }
    });

    const myBizIds = businesses
      .filter((b) => (b.ownerId || '').toLowerCase() === (currentUser.id || '').toLowerCase())
      .map((b) => b.id);

    // Sincroniza unificadamente: orçamentos direcionados às empresas do usuário, oportunidades da região e cotações do cliente
    dataService.syncAllQuoteRequests(currentUser.id, myBizIds).then((allQuotes) => {
      setQuoteRequests(allQuotes);
    });
  }, [currentUser?.id, currentUser?.role, businesses.length]);

  // Geolocation trigger
  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada neste navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          if (!res.ok) throw new Error('Falha na geocodificação');
          const data = await res.json();
          
          let cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
          let stateName = data.address?.state || '';
          let suburb = data.address?.suburb || data.address?.neighbourhood || '';

          setCurrentLocation({
            city: cityName,
            state: stateName,
            neighborhood: suburb,
            latitude: lat,
            longitude: lon,
          });

          setNotifications((prev) => [
            {
              id: `loc-${Date.now()}`,
              title: '📍 Localização Atualizada',
              message: `Localização definida para ${cityName}${stateName ? ` - ${stateName}` : ''}. Buscando ofertas próximas.`,
              timestamp: 'Agora',
              type: 'system',
              read: false,
            },
            ...prev,
          ]);
        } catch (e) {
          // Fallback if API fails
          setCurrentLocation({
            city: '',
            state: '',
            neighborhood: '',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setCurrentLocation({
          city: '',
          state: '',
          neighborhood: '',
        });
        alert('Não foi possível obter sua localização. Verifique as permissões.');
      },
      { timeout: 8000 }
    );
  };

  const toggleFavoriteBusiness = async (id: string) => {
    if (!currentUser?.id) {
      setIsAuthModalOpen(true);
      return;
    }

    const isFav = favorites.businessIds.includes(id);

    if (isSupabaseConfigured) {
      try {
        if (isFav) {
          await dataService.removeFavoriteBusiness(currentUser.id, id);
          setFavorites((prev) => ({
            ...prev,
            businessIds: prev.businessIds.filter((bId) => bId !== id),
          }));
        } else {
          await dataService.addFavoriteBusiness(currentUser.id, id);
          setFavorites((prev) => ({
            ...prev,
            businessIds: [...prev.businessIds, id],
          }));
        }
      } catch (err: any) {
        console.error('Erro ao atualizar favorito no Supabase:', err);
        alert(err.message || 'Erro ao sincronizar favorito com o servidor.');
      }
    } else {
      setFavorites((prev) => ({
        ...prev,
        businessIds: isFav
          ? prev.businessIds.filter((bId) => bId !== id)
          : [...prev.businessIds, id],
      }));
    }
  };

  const toggleFavoriteOffer = async (id: string) => {
    if (!currentUser?.id) {
      setIsAuthModalOpen(true);
      return;
    }

    const isFav = favorites.offerIds.includes(id);

    if (isSupabaseConfigured) {
      try {
        if (isFav) {
          await dataService.removeFavoriteOffer(currentUser.id, id);
          setFavorites((prev) => ({
            ...prev,
            offerIds: prev.offerIds.filter((oId) => oId !== id),
          }));
        } else {
          await dataService.addFavoriteOffer(currentUser.id, id);
          setFavorites((prev) => ({
            ...prev,
            offerIds: [...prev.offerIds, id],
          }));
        }
      } catch (err: any) {
        console.error('Erro ao atualizar favorito de oferta no Supabase:', err);
        alert(err.message || 'Erro ao sincronizar favorito com o servidor.');
      }
    } else {
      setFavorites((prev) => ({
        ...prev,
        offerIds: isFav
          ? prev.offerIds.filter((oId) => oId !== id)
          : [...prev.offerIds, id],
      }));
    }
  };

  const createQuoteRequest = async (
    data: Omit<QuoteRequest, 'id' | 'createdAt' | 'status' | 'proposals'>
  ): Promise<string> => {
    if (!currentUser?.id) {
      throw new Error('Você precisa estar autenticado para solicitar um orçamento.');
    }

    let assignedId = `qr-${Date.now()}`;

    if (isSupabaseConfigured) {
      const dbId = await dataService.createQuoteRequest(data, currentUser.id);
      if (dbId) {
        assignedId = dbId;
      }
    }

    const newQuote: QuoteRequest = {
      ...data,
      id: assignedId,
      userId: currentUser.id,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'aberto',
      proposals: [],
    };

    setQuoteRequests((prev) => [newQuote, ...prev]);

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

    return assignedId;
  };

  const submitProposal = async (
    quoteRequestId: string,
    proposalData: Omit<QuoteProposal, 'id' | 'createdAt' | 'status'>
  ) => {
    let realProposalId = `prop-${Date.now()}`;

    if (isSupabaseConfigured) {
      // 1. Invoca a RPC atômica submit_quote_proposal e obtém o UUID confirmado pelo banco
      realProposalId = await dataService.submitProposal({
        quoteRequestId,
        businessId: proposalData.businessId,
        price: proposalData.price,
        deadlineText: proposalData.deadlineText,
        description: proposalData.description,
      });
      // 2. Sincroniza imediatamente com o banco para garantir consistência em todas as visões
      await refreshQuoteRequests();
    } else {
      const newProposal: QuoteProposal = {
        ...proposalData,
        id: realProposalId,
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
              proposals: [...qr.proposals.filter((p) => p.id !== realProposalId), newProposal],
            };
          }
          return qr;
        })
      );
    }
  };

  const acceptProposal = async (quoteRequestId: string, proposalId: string) => {
    if (isSupabaseConfigured) {
      // 1. Aguarda a transação atômica no Supabase via RPC accept_quote_proposal
      await dataService.acceptProposal(quoteRequestId, proposalId);
      // 2. Recarrega as cotações diretamente da fonte de verdade (Supabase)
      await refreshQuoteRequests();
    } else {
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

  const cancelQuoteRequest = async (quoteRequestId: string) => {
    const previous = [...quoteRequests];
    setQuoteRequests((prev) =>
      prev.map((qr) => (qr.id === quoteRequestId ? { ...qr, status: 'cancelado' as const } : qr))
    );

    if (isSupabaseConfigured) {
      try {
        await dataService.cancelQuoteRequest(quoteRequestId);
      } catch (err: any) {
        console.error('Erro ao encerrar cotação no Supabase:', err);
        setQuoteRequests(previous);
        throw err;
      }
    }

    setNotifications((prev) => [
      {
        id: `cancel-${Date.now()}`,
        title: 'Pedido de Orçamento Encerrado',
        message: 'O pedido foi encerrado. As empresas foram notificadas de que você não precisa mais de propostas.',
        timestamp: 'Agora',
        type: 'system',
        read: false,
      },
      ...prev,
    ]);
  };

  const deleteQuoteRequest = async (quoteRequestId: string) => {
    // 1. Marca imediatamente a exclusão permanente no armazenamento local
    markQuoteAsDeletedLocally(quoteRequestId);

    // 2. Remove imediatamente do estado visual
    setQuoteRequests((prev) => prev.filter((qr) => qr.id !== quoteRequestId));

    if (comparingQuoteRequestId === quoteRequestId) {
      setComparingQuoteRequestId(null);
    }

    // 3. Persiste no Supabase com RPC e cascatas
    if (isSupabaseConfigured) {
      try {
        await dataService.deleteQuoteRequest(quoteRequestId);
      } catch (err: any) {
        console.warn('Aviso ao sincronizar exclusão com o banco remoto:', err);
      }
    }

    setNotifications((prev) => [
      {
        id: `del-qr-${Date.now()}`,
        title: 'Solicitação de Orçamento Excluída',
        message: 'O pedido de orçamento e todas as propostas vinculadas foram removidos permanentemente.',
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
    const verifiedImageUrl = !isInvalidOrDeadImageUrl(offerData.imageUrl)
      ? offerData.imageUrl
      : getSmartImage(offerData.categoryId, offerData.title);

    const safeOfferData = {
      ...offerData,
      imageUrl: verifiedImageUrl,
    };

    const newOffer: Offer = {
      ...safeOfferData,
      id: `off-${Date.now()}`,
      viewsCount: 1,
      claimsCount: 0,
    };
    setOffers((prev) => [newOffer, ...prev]);

    if (isSupabaseConfigured) {
      try {
        await dataService.createOffer(safeOfferData);
      } catch (err) {
        console.error('Erro ao criar oferta no Supabase:', err);
      }
    }
  };

  const createBusiness = async (businessData: Omit<Business, 'id' | 'leadsReceivedCount'>) => {
    if (!currentUser?.id) {
      throw new Error('Você precisa estar autenticado para cadastrar uma empresa.');
    }

    const verifiedPhoto = !isInvalidOrDeadImageUrl(businessData.coverImage)
      ? businessData.coverImage
      : !isInvalidOrDeadImageUrl(businessData.logo)
      ? businessData.logo
      : getSmartImage(businessData.categoryId, `${businessData.subcategory || ''} ${businessData.name}`);

    const safeBusinessData = {
      ...businessData,
      logo: verifiedPhoto,
      coverImage: verifiedPhoto,
      photos: businessData.photos && businessData.photos.length > 0 ? businessData.photos : [verifiedPhoto],
    };

    let assignedId = `b-${Date.now()}`;

    if (isSupabaseConfigured) {
      const dbId = await dataService.createBusiness(safeBusinessData, currentUser.id);
      if (dbId) {
        assignedId = dbId;
      }
    }

    const newBusiness: Business = {
      ...safeBusinessData,
      id: assignedId,
      ownerId: currentUser.id,
      leadsReceivedCount: 0,
    };

    setBusinesses((prev) => [newBusiness, ...prev]);
  };

  const updateMonetization = async (settings: AdminMonetizationSettings) => {
    const previous = { ...monetization };
    setMonetization(settings);
    if (isSupabaseConfigured) {
      try {
        await dataService.updateMonetizationSettings(settings);
      } catch (err) {
        console.error('Erro ao salvar parametrizações:', err);
        setMonetization(previous);
        throw err;
      }
    }
  };

  const toggleBusinessVerified = async (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    const newVerified = !business.verified;
    
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, verified: newVerified } : b))
    );

    if (isSupabaseConfigured) {
      try {
        await dataService.toggleBusinessVerified(businessId, newVerified);
      } catch (err) {
        console.error('Erro ao verificar empresa:', err);
        // Rollback on error
        setBusinesses((prev) =>
          prev.map((b) => (b.id === businessId ? { ...b, verified: !newVerified } : b))
        );
        alert(`Não foi possível alterar verificação: ${(err as Error).message}`);
      }
    }
  };

  const toggleBusinessActive = async (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    const newActive = business.active === false ? true : false;

    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, active: newActive } : b))
    );

    if (isSupabaseConfigured) {
      try {
        await dataService.toggleBusinessActive(businessId, newActive);
      } catch (err) {
        console.error('Erro ao alterar status da empresa:', err);
        // Rollback on error
        setBusinesses((prev) =>
          prev.map((b) => (b.id === businessId ? { ...b, active: !newActive } : b))
        );
        alert(`Não foi possível alterar status da empresa: ${(err as Error).message}`);
      }
    }
  };

  const toggleBusinessFeatured = async (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;
    const newFeatured = !business.featured;

    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, featured: newFeatured } : b))
    );

    if (isSupabaseConfigured) {
      try {
        await dataService.toggleBusinessFeatured(businessId, newFeatured);
      } catch (err) {
        console.error('Erro ao destacar empresa:', err);
        // Rollback on error
        setBusinesses((prev) =>
          prev.map((b) => (b.id === businessId ? { ...b, featured: !newFeatured } : b))
        );
        alert(`Não foi possível alterar destaque: ${(err as Error).message}`);
      }
    }
  };

  const removeOffer = async (offerId: string) => {
    const previous = [...offers];
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
    if (isSupabaseConfigured) {
      try {
        await dataService.deleteOffer(offerId);
      } catch (err) {
        console.error('Erro ao excluir oferta do Supabase:', err);
        setOffers(previous);
        alert(`Não foi possível excluir a oferta: ${(err as Error).message}`);
      }
    }
  };

  const deleteBusiness = async (businessId: string) => {
    const previousBusinesses = [...businesses];
    const previousOffers = [...offers];

    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    setOffers((prev) => prev.filter((o) => o.businessId !== businessId));

    if (isSupabaseConfigured) {
      try {
        await dataService.deleteBusiness(businessId);
      } catch (err) {
        console.error('Erro ao excluir empresa do Supabase:', err);
        // Rollback on error
        setBusinesses(previousBusinesses);
        setOffers(previousOffers);
        alert(`Não foi possível excluir o parceiro: ${(err as Error).message}`);
      }
    }
  };

  const upgradeBusinessPlan = async (businessId: string, planTier: 'free' | 'pro' | 'premium') => {
    if (planTier === 'free') {
      alert('Sua empresa já está no plano Gratuito.');
      return;
    }

    try {
      if (isSupabaseConfigured) {
        await dataService.initiatePlanSubscription(businessId, planTier);
      }
      setNotifications((prev) => [
        {
          id: `upgrade-${Date.now()}`,
          title: `Solicitação do Plano ${planTier.toUpperCase()} Registrada`,
          message: `O pedido de assinatura foi gerado no status PENDING. A ativação ocorrerá automaticamente após a confirmação do pagamento no provedor.`,
          timestamp: 'Agora',
          type: 'system',
          read: false,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setNotifications((prev) => [
        {
          id: `upgrade-err-${Date.now()}`,
          title: 'Assinatura Pendente de Confirmação',
          message: err.message || `A assinatura do plano ${planTier.toUpperCase()} está registrada como pendente.`,
          timestamp: 'Agora',
          type: 'system',
          read: false,
        },
        ...prev,
      ]);
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
    setQuoteRequests([]);
    setActiveTab('home');
  };

  const refreshQuoteRequests = async () => {
    if (!isSupabaseConfigured) return;
    const myBizIds = currentUser
      ? businesses
          .filter((b) => (b.ownerId || '').toLowerCase() === (currentUser.id || '').toLowerCase())
          .map((b) => b.id)
      : [];
    const allQuotes = await dataService.syncAllQuoteRequests(currentUser?.id, myBizIds);
    setQuoteRequests(allQuotes);
  };

  const logout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      // Ignora erro
    }
    setCurrentUser(null);
    setUserRole('customer');
    setFavorites({ businessIds: [], offerIds: [] });
    setQuoteRequests([]);
    setNotifications([]);
    setActiveTab('home');
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
        cancelQuoteRequest,
        deleteQuoteRequest,
        createPriceAlert,
        removePriceAlert,
        addReview,
        reportReview,
        sendChatMessage,
        createOffer,
        addOffer: createOffer,
        createBusiness,
        updateMonetization,
        toggleBusinessActive,
        toggleBusinessVerified,
        toggleBusinessFeatured,
        removeOffer,
        deleteBusiness,
        upgradeBusinessPlan,
        markNotificationRead,
        deleteAccountAndData,
        refreshQuoteRequests,

        selectedBusinessId,
        setSelectedBusinessId,
        isQuoteModalOpen,
        setIsQuoteModalOpen,
        quoteCategoryPreset,
        quoteTargetBusinessId,
        setQuoteTargetBusinessId,
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
