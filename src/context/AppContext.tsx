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
  INITIAL_MONETIZATION,
} from '../data/mockData';
// ATENÇÃO: INITIAL_BUSINESSES, INITIAL_OFFERS, INITIAL_QUOTE_REQUESTS e INITIAL_REVIEWS
// foram REMOVIDOS intencionalmente deste contexto. Dados de demonstração NÃO devem ser
// exibidos para clientes reais. O app usa apenas dados reais do Supabase ou lista vazia.
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService, AuthUserProfile } from '../services/authService';
import { dataService } from '../services/dataService';
import { getSmartImage, isInvalidOrDeadImageUrl } from '../utils/imageUtils';
import { getDeletedQuoteIds, markQuoteAsDeletedLocally } from '../utils/quoteStorage';
import {
  getLocalBusinesses,
  saveLocalBusiness,
  getLocalOffers,
  saveLocalOffer,
  getLocalQuoteRequests,
  saveLocalQuoteRequest,
} from '../utils/localDataStorage';
import {
  hapticImpactLight,
  hapticNotificationSuccess,
  hapticNotificationWarning,
} from '../utils/haptics';

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
  toggleBusinessFeatured: (businessId: string, days?: number, notes?: string) => Promise<void>;
  removeOffer: (offerId: string) => void;
  deleteBusiness: (businessId: string) => void;
  upgradeBusinessPlan: (
    businessId: string,
    planTier: 'free' | 'pro' | 'premium',
    immediateActive?: boolean,
    purchaseToken?: string,
    orderId?: string
  ) => Promise<void>;
  adminActivatePlan: (businessId: string, planTier: 'free' | 'pro' | 'premium', reason: string, durationDays?: number) => Promise<void>;
  submitContentReport: (params: { contentType: 'review' | 'business' | 'offer' | 'quote' | 'user'; contentId: string; reason: string; details?: string }) => Promise<any>;
  blockUser: (blockedUserId: string) => Promise<any>;
  addLeadCredits: (businessId: string, credits: number, notes?: string) => Promise<any>;
  markNotificationRead: (id: string) => void;
  refreshNotifications: () => Promise<void>;
  deleteAccountAndData: () => void;
  refreshQuoteRequests: () => Promise<void>;
  refreshBusinesses: () => Promise<void>;
  refreshOffers: () => Promise<void>;

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

const STORAGE_KEY_LOCATION = 'economizaja_user_location';
const LOCATION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

interface CachedLocationData {
  location: UserLocation;
  timestamp: number;
}

// Recupera localização persistida se tiver menos de 24 horas
const getInitialUserLocation = (): UserLocation => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (raw) {
      const parsed: CachedLocationData = JSON.parse(raw);
      if (parsed && parsed.timestamp && parsed.location) {
        const age = Date.now() - parsed.timestamp;
        if (age < LOCATION_MAX_AGE_MS) {
          return parsed.location;
        } else {
          // Mais de 24h: remove do storage e força nova detecção
          localStorage.removeItem(STORAGE_KEY_LOCATION);
        }
      }
    }
  } catch (err) {
    console.error('Erro ao ler localização salva no cache:', err);
  }

  return {
    city: '',
    state: '',
    neighborhood: '',
  };
};

  const [currentLocation, setCurrentLocation] = useState<UserLocation>(getInitialUserLocation);

  // Sincroniza currentLocation com o localStorage com timestamp sempre que for atualizado
  useEffect(() => {
    try {
      if (currentLocation && (currentLocation.city || currentLocation.state || currentLocation.neighborhood)) {
        const payload: CachedLocationData = {
          location: currentLocation,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(payload));
      }
    } catch (err) {
      console.error('Erro ao salvar localização no localStorage:', err);
    }
  }, [currentLocation]);

  // Auth
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(() => authService.getInitialUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const initial = authService.getInitialUser();
    return initial?.role || 'customer';
  });

  // Sync userRole with currentUser
  useEffect(() => {
    if (currentUser) {
      setUserRole(currentUser.role);
    } else {
      setUserRole('customer');
    }
  }, [currentUser]);

  // Persistence State
  // PRODUÇÃO: Inicia sempre vazio — dados reais são carregados do Supabase
  // Se Supabase não configurado, permanece vazio com isDatabaseConnected=false
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

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

  // Carrega dados reais do Supabase ao inicializar
  // REGRA: Quando Supabase está configurado, NUNCA usa dados de demonstração como fallback.
  // Lista vazia é preferível a dados falsos para clientes reais.
  useEffect(() => {
    async function loadBackendData() {
      if (!isSupabaseConfigured) {
        // Supabase não configurado: mantém listas vazias, exibe aviso de configuração
        setIsDatabaseConnected(false);
        setIsLoadingData(false);
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

        // PRODUÇÃO: Usa apenas dados reais do Supabase (pode ser lista vazia)
        setBusinesses(bizList || []);
        setOffers(offList || []);

        if (settings) setMonetization(settings);

        const deletedIds = getDeletedQuoteIds();
        const initialCleanQuotes = (quoteList || []).filter(
          (q) => !deletedIds.has(q.id) && q.status !== 'cancelado'
        );

        if (userProfile) {
          setCurrentUser(userProfile);
          setUserRole(userProfile.role);

          // Carrega favoritos persistidos do usuário autenticado no Supabase
          const userFavs = await dataService.getUserFavorites(userProfile.id);
          if (userFavs) {
            setFavorites(userFavs);
          }

          // Carrega notificações persistidas no Supabase
          const userNotifs = await dataService.getNotifications(userProfile.id);
          if (userNotifs && userNotifs.length > 0) {
            setNotifications(userNotifs);
          }

          // Identifica empresas pertencentes ao usuário para garantir orçamentos direcionados
          const myBizIds = (bizList || [])
            .filter((b) => (b.ownerId || '').toLowerCase() === (userProfile.id || '').toLowerCase())
            .map((b) => b.id);

          // Sincroniza todas as cotações: direcionadas às empresas do usuário + marketplace + cotações pessoais
          const allQuotes = await dataService.syncAllQuoteRequests(userProfile.id, myBizIds);
          setQuoteRequests(allQuotes || []);
        } else {
          setQuoteRequests(initialCleanQuotes);
        }

        setIsDatabaseConnected(true);
      } catch (err) {
        console.warn('Falha ao sincronizar com backend Supabase:', err);
        // Em caso de falha de rede, mantém listas vazias e marca banco como desconectado
        // NÃO injeta dados fake como fallback
        setIsDatabaseConnected(false);
        setBusinesses([]);
        setOffers([]);
        setQuoteRequests([]);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadBackendData();
  }, []);

  // Sincroniza favoritos, cotações e notificações do usuário autenticado
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

    // Carrega notificações persistidas do usuário
    dataService.getNotifications(currentUser.id).then((userNotifs) => {
      if (userNotifs) {
        setNotifications(userNotifs);
      }
    });

    const myBizIds = businesses
      .filter((b) => (b.ownerId || '').toLowerCase() === (currentUser.id || '').toLowerCase())
      .map((b) => b.id);

    // Sincroniza unificadamente: orçamentos direcionados às empresas do usuário, oportunidades da região e cotações do cliente
    dataService.syncAllQuoteRequests(currentUser.id, myBizIds).then((allQuotes) => {
      setQuoteRequests(allQuotes || []);
    });

    // Realtime listener para notificações automáticas do Supabase
    let channel: any = null;
    try {
      if (supabase) {
        channel = supabase
          .channel(`user-notifs-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`,
            },
            () => {
              dataService.getNotifications(currentUser.id).then((updated) => {
                if (updated) setNotifications(updated);
              });
            }
          )
          .subscribe();
      }
    } catch (realtimeErr) {
      console.warn('Aviso ao registrar listener Realtime de notificações:', realtimeErr);
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
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

    hapticImpactLight();
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

    hapticImpactLight();
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

    saveLocalQuoteRequest(newQuote);
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

    hapticNotificationSuccess();
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
      await Promise.all([
        refreshQuoteRequests(),
        refreshBusinesses()
      ]);
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

      // Desconta 1 crédito local se empresa for plano gratuito e já passou de 3
      setBusinesses((prev) =>
        prev.map((b) => {
          if (b.id === proposalData.businessId && (b.plan === 'gratis' || b.planTier === 'gratis')) {
            const currentCredits = b.leadCredits || 0;
            return {
              ...b,
              leadCredits: currentCredits > 0 ? currentCredits - 1 : 0,
            };
          }
          return b;
        })
      );
    }
    hapticNotificationSuccess();
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

    hapticNotificationSuccess();
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
    hapticNotificationWarning();
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

  const addReview = async (businessId: string, ratingOrObj: number | any, commentArg?: string) => {
    // Normalização para aceitar tanto (businessId, rating, comment) quanto chamada com objeto
    const rating = typeof ratingOrObj === 'number' ? ratingOrObj : Number(ratingOrObj?.rating || 5);
    const comment = typeof ratingOrObj === 'number' ? (commentArg || '') : (ratingOrObj?.comment || '');

    // PROBLEMA 5: Validação para impedir avaliações duplicadas da mesma empresa pelo mesmo usuário
    const currentName = currentUser?.fullName?.trim().toLowerCase();
    const currentId = currentUser?.id;

    const alreadyReviewed = reviews.some((r) => {
      if (r.businessId !== businessId) return false;
      const matchName = Boolean(currentName && r.userName?.trim().toLowerCase() === currentName);
      const matchId = Boolean(currentId && (r as any).userId === currentId);
      return matchName || matchId;
    });

    if (alreadyReviewed) {
      alert('Você já avaliou esta empresa');
      return;
    }

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
    saveLocalOffer(newOffer);
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

    saveLocalBusiness(newBusiness);
    setBusinesses((prev) => [newBusiness, ...prev]);

    // Atualiza automaticamente o papel do usuário para parceiro/business
    if (currentUser && currentUser.role === 'customer') {
      const updatedUser = { ...currentUser, role: 'business' as const };
      setCurrentUser(updatedUser);
      setUserRole('business');
      try {
        localStorage.setItem('economizaja_user', JSON.stringify(updatedUser));
      } catch {
        // ignore
      }
      if (isSupabaseConfigured && supabase) {
        Promise.resolve(
          supabase
            .from('profiles')
            .update({ role: 'business' })
            .eq('id', currentUser.id)
        ).catch((err: any) => console.warn('Aviso ao atualizar perfil para business:', err));
      }
    }
  };

  const refreshBusinesses = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const bizList = await dataService.getBusinesses(undefined, undefined, true);
      if (bizList && bizList.length > 0) {
        setBusinesses(bizList);
      }
    } catch (err) {
      console.warn('Erro ao sincronizar lista de empresas:', err);
    }
  };

  const refreshOffers = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const offList = await dataService.getOffers();
      if (offList) {
        setOffers(offList);
      }
    } catch (err) {
      console.warn('Erro ao atualizar ofertas:', err);
    }
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
        // Registrar acao no log de auditoria
        dataService.logAdminAction(
          newVerified ? 'EMPRESA_VERIFICADA' : 'EMPRESA_VERIFICACAO_REMOVIDA',
          'business',
          businessId,
          business.name,
          `Verificado: ${newVerified}`
        );
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
        // Registrar acao no log de auditoria
        dataService.logAdminAction(
          newActive ? 'EMPRESA_ATIVADA' : 'EMPRESA_SUSPENSA',
          'business',
          businessId,
          business.name
        );
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

  const toggleBusinessFeatured = async (businessId: string, days = 7, notes?: string) => {
    const business = businesses.find((b) => b.id === businessId);
    if (!business) return;
    const newFeatured = !business.featured;

    // Atualização otimista
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, featured: newFeatured } : b))
    );

    if (isSupabaseConfigured) {
      try {
        await dataService.toggleBusinessFeatured(businessId, newFeatured, days, notes);
        // Registrar acao no log de auditoria
        dataService.logAdminAction(
          newFeatured ? 'DESTAQUE_ATIVADO' : 'DESTAQUE_REVOGADO',
          'featured',
          businessId,
          business.name,
          notes || (newFeatured ? `Destaque por ${days} dias` : 'Destaque removido pelo admin')
        );
        // Recarrega lista oficial de empresas para refletir a nova vigência com precisão
        const refreshed = await dataService.getBusinesses(undefined, undefined, true);
        if (refreshed) setBusinesses(refreshed);
      } catch (err) {
        console.error('Erro ao destacar empresa:', err);
        // Rollback on error
        setBusinesses((prev) =>
          prev.map((b) => (b.id === businessId ? { ...b, featured: !newFeatured } : b))
        );
        alert(`Não foi possível alterar destaque: ${(err as Error).message}`);
        throw err;
      }
    }
  };

  const removeOffer = async (offerId: string) => {
    const offerToRemove = offers.find((o) => o.id === offerId);
    const previous = [...offers];
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
    if (isSupabaseConfigured) {
      try {
        await dataService.deleteOffer(offerId);
        // Registrar acao no log de auditoria
        dataService.logAdminAction(
          'OFERTA_REMOVIDA',
          'offer',
          offerId,
          offerToRemove?.title || 'Oferta'
        );
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

  const upgradeBusinessPlan = async (
    businessId: string,
    planTier: 'free' | 'pro' | 'premium',
    immediateActive = false,
    purchaseToken?: string,
    orderId?: string
  ) => {
    if (planTier === 'free') {
      alert('Sua empresa já está no plano Gratuito.');
      return;
    }

    try {
      if (isSupabaseConfigured) {
        if (immediateActive) {
          // Validação e persistência server-side com anti-replay
          await dataService.activateGooglePlaySubscription({
            businessId,
            planTier,
            purchaseToken,
            transactionId: orderId,
          });
        } else {
          await dataService.initiatePlanSubscription(businessId, planTier);
        }
      }

      // REGRA: Atualiza o estado da empresa SOMENTE após a confirmação do backend
      if (immediateActive) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === businessId ? { ...b, plan: planTier, planTier: planTier } : b))
        );
      }

      setNotifications((prev) => [
        {
          id: `upgrade-${Date.now()}`,
          title: `Plano ${planTier.toUpperCase()} ${immediateActive ? 'Ativado' : 'Registrado'}`,
          message: immediateActive
            ? `Parabéns! O Plano ${planTier.toUpperCase()} foi ativado com sucesso via Google Play. Propostas comerciais ilimitadas liberadas!`
            : `O pedido de assinatura foi gerado no status PENDING. A ativação ocorrerá automaticamente após a confirmação do pagamento no provedor.`,
          timestamp: 'Agora',
          type: 'system',
          read: false,
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('[upgradeBusinessPlan] Erro ao registrar assinatura no backend:', err);
      setNotifications((prev) => [
        {
          id: `upgrade-err-${Date.now()}`,
          title: 'Falha na Validação da Assinatura',
          message: err.message || `Não foi possível confirmar a assinatura do plano ${planTier.toUpperCase()}.`,
          timestamp: 'Agora',
          type: 'system',
          read: false,
        },
        ...prev,
      ]);
      throw err;
    }
  };

  const adminActivatePlan = async (
    businessId: string,
    planTier: 'free' | 'pro' | 'premium',
    reason: string,
    durationDays = 30
  ) => {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Informe o motivo/justificativa para a ativação administrativa.');
    }
    if (isSupabaseConfigured) {
      await dataService.adminActivateBusinessPlan({
        businessId,
        planTier,
        reason,
        durationDays,
      });
      // Sincroniza o estado local após a confirmação do banco
      setBusinesses((prev) =>
        prev.map((b) => (b.id === businessId ? { ...b, plan: planTier, planTier: planTier } : b))
      );
    }
  };

  const submitContentReport = async (params: {
    contentType: 'review' | 'business' | 'offer' | 'quote' | 'user';
    contentId: string;
    reason: string;
    details?: string;
  }) => {
    if (isSupabaseConfigured) {
      return await dataService.submitContentReport(params);
    }
    return { success: true };
  };

  const blockUser = async (blockedUserId: string) => {
    if (isSupabaseConfigured) {
      return await dataService.blockUser(blockedUserId);
    }
    return { success: true };
  };

  const addLeadCredits = async (businessId: string, credits: number, notes?: string) => {
    try {
      const result = await dataService.addLeadCredits(businessId, credits, notes);
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? { ...b, leadCredits: (b.leadCredits || 0) + credits }
            : b
        )
      );
      hapticNotificationSuccess();
      return result;
    } catch (err) {
      console.error('Erro ao adicionar créditos de leads:', err);
      throw err;
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (isSupabaseConfigured) {
      dataService.markNotificationRead(id).catch((err) => {
        console.warn('Aviso ao sincronizar leitura da notificação com Supabase:', err);
      });
    }
  };

  const refreshNotifications = async () => {
    if (!currentUser?.id || !isSupabaseConfigured) return;
    const notifs = await dataService.getNotifications(currentUser.id);
    if (notifs) {
      setNotifications(notifs);
    }
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
    if (!isSupabaseConfigured) {
      setQuoteRequests(getLocalQuoteRequests());
    } else {
      setQuoteRequests([]);
    }
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
        adminActivatePlan,
        submitContentReport,
        blockUser,
        addLeadCredits,
        markNotificationRead,
        refreshNotifications,
        deleteAccountAndData,
        refreshQuoteRequests,
        refreshBusinesses,
        refreshOffers,

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
