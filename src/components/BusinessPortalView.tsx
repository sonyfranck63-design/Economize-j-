import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CompanyRegistrationView } from './CompanyRegistrationView';
import { BusinessAvatar } from './BusinessAvatar';
import { SafeImage } from './SafeImage';
import { getSmartImage, isInvalidOrDeadImageUrl, OFFER_IMAGE_SUGGESTIONS } from '../utils/imageUtils';
import { isQuoteMatchingBusiness, isLocationMatch } from '../utils/quoteStorage';
import { buildWhatsAppLink, formatWhatsAppNumber } from '../utils/whatsappUtils';
import { isThisMonth } from '../utils/dateUtils';
import { triggerCelebrationFireworks } from '../utils/confetti';
import { billingService } from '../services/billingService';
import { Capacitor } from '@capacitor/core';
import { dataService } from '../services/dataService';
import {
  Building2,
  Send,
  PlusCircle,
  TrendingUp,
  Users,
  Eye,
  MessageCircle,
  CheckCircle2,
  Crown,
  ShieldCheck,
  ShieldAlert,
  Tag,
  Clock,
  Sparkles,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Smartphone,
  CreditCard,
  Phone,
  Trash2,
  RefreshCw,
  Star,
  Zap,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { LeadCreditsModal } from './LeadCreditsModal';

export const BusinessPortalView: React.FC = () => {
  const {
    currentUser,
    businesses,
    quoteRequests,
    submitProposal,
    addOffer,
    removeOffer,
    offers,
    setComparingQuoteRequestId,
    monetization,
    upgradeBusinessPlan,
    setIsAuthModalOpen,
    setPublicRoute,
    userRole,
    refreshQuoteRequests,
    refreshBusinesses,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Empresas pertencentes exclusivamente ao usuário logado (Admin não herda empresas de terceiros)
  const ownedBusinesses = currentUser
    ? businesses.filter((b) => (b.ownerId || '').toLowerCase() === (currentUser.id || '').toLowerCase())
    : [];
  
  // Pick the first business as current active managed business
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  
  const currentBiz = selectedBizId 
    ? (ownedBusinesses.find((b) => b.id === selectedBizId) || (ownedBusinesses.length > 0 ? ownedBusinesses[0] : null))
    : (ownedBusinesses.length > 0 ? ownedBusinesses[0] : null);

  // Se o dropdown não tiver selecionado ninguem ainda mas tiver empresa, seleciona a primeira
  React.useEffect(() => {
    if (!selectedBizId && ownedBusinesses.length > 0) {
      setSelectedBizId(ownedBusinesses[0].id);
    }
  }, [ownedBusinesses, selectedBizId]);

  // Sincroniza dados e cotações ao carregar o portal
  React.useEffect(() => {
    if (currentUser) {
      refreshBusinesses?.();
      refreshQuoteRequests?.();
    }
  }, [currentUser]);

  // Fechar modais ao apertar Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveQuoteId(null);
        setCheckoutPlan(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const [activeTab, setActiveTab] = useState<'leads' | 'ofertas' | 'planos' | 'metricas'>('leads');
  const [quotesScope, setQuotesScope] = useState<'category' | 'all_region'>('category');
  const [quotesFilterTab, setQuotesFilterTab] = useState<'won' | 'sent' | 'opportunities'>('opportunities');

  // Plan checkout modal
  const [checkoutPlan, setCheckoutPlan] = useState<'pro' | 'premium' | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Featured highlight state
  const [highlightDays, setHighlightDays] = useState<number>(7);
  const [highlightSuccess, setHighlightSuccess] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [highlightPendingInfo, setHighlightPendingInfo] = useState<{
    days: number;
    totalCost: number;
  } | null>(null);

  const handleHireHighlight = async () => {
    if (!currentBiz) return;
    setIsHighlighting(true);
    try {
      const res = await dataService.createFeaturedListing(currentBiz.id, highlightDays);
      setHighlightPendingInfo({
        days: highlightDays,
        totalCost: res?.total_cost || highlightDays * monetization.featuredDailyRate,
      });
      setHighlightSuccess(true);
      setTimeout(() => setHighlightSuccess(false), 8000);
    } catch (err: any) {
      alert(`Não foi possível registrar a solicitação de destaque: ${err.message}`);
    } finally {
      setIsHighlighting(false);
    }
  };

  // Proposal modal state
  const isNativeAndroid = Capacitor.isNativePlatform();
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [showProposalLimitModal, setShowProposalLimitModal] = useState(false);
  const [isLeadCreditsModalOpen, setIsLeadCreditsModalOpen] = useState(false);
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalDeadline, setProposalDeadline] = useState('Execução em até 2 dias úteis');
  const [proposalDescription, setProposalDescription] = useState('');

  // Google Play Billing native state
  const [isPurchasingPlan, setIsPurchasingPlan] = useState<'pro' | 'premium' | null>(null);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);

  // Inicializa o serviço Google Play Billing no Android
  React.useEffect(() => {
    if (isNativeAndroid) {
      billingService.init();
    }
  }, [isNativeAndroid]);

  const handleNativePurchase = async (plan: 'pro' | 'premium') => {
    if (!currentBiz) return;
    setIsPurchasingPlan(plan);
    try {
      const res = await billingService.purchasePlan(plan, currentBiz.id);
      if (res.success) {
        if (res.isPending) {
          alert('Sua compra está em processamento pelo Google Play (status PENDENTE). O benefício do plano será liberado assim que o Google confirmar a liquidação.');
          return;
        }
        await upgradeBusinessPlan(currentBiz.id, plan, true, res.purchaseToken, res.orderId);
        triggerCelebrationFireworks();
        alert(`Parabéns! Sua empresa agora é ${plan === 'premium' ? 'PREMIUM' : 'PRÓ'}! Assinatura validada e propostas ilimitadas liberadas via Google Play.`);
      } else if (res.error && !res.error.toLowerCase().includes('cancel')) {
        alert(`Google Play Billing: ${res.error}`);
      }
    } catch (err: any) {
      alert(err?.message || 'Não foi possível processar a compra no Google Play.');
    } finally {
      setIsPurchasingPlan(null);
    }
  };

  const handleRestorePurchases = async () => {
    if (!currentBiz) return;
    setIsRestoringPurchases(true);
    try {
      const res = await billingService.restorePurchases();
      if (res.purchases && res.purchases.length > 0) {
        const bestPurchase = res.purchases.find((p) => p.plan === 'premium') || res.purchases[0];
        await upgradeBusinessPlan(currentBiz.id, bestPurchase.plan, true, bestPurchase.purchaseToken, bestPurchase.orderId);
        triggerCelebrationFireworks();
        alert(`Assinatura encontrada no Google Play! Seu plano ${bestPurchase.plan.toUpperCase()} foi restaurado com sucesso.`);
      } else {
        alert('Nenhuma assinatura ativa encontrada na sua conta da Google Play Store.');
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao consultar assinaturas anteriores no Google Play.');
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  // New Offer state
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferOrigPrice, setNewOfferOrigPrice] = useState('');
  const [newOfferDesc, setNewOfferDesc] = useState('');
  const [newOfferImageUrl, setNewOfferImageUrl] = useState('');
  const [newOfferValidDays, setNewOfferValidDays] = useState('7');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleStartRegistration = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsRegistering(true);
  };

  // Se estiver no modo de cadastro de empresa (inclusive para cadastrar a segunda empresa)
  if (isRegistering && currentUser) {
    return (
      <CompanyRegistrationView 
        onComplete={() => setIsRegistering(false)} 
        onCancel={() => setIsRegistering(false)} 
      />
    );
  }

  // AUTH GUARD: If user is not a business, show landing page even if they try to access the portal
  if (userRole === 'customer' && ownedBusinesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in px-4">
        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-2 shadow-sm border border-emerald-100">
          <Building2 className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Turbine suas vendas com o EconomizaJá
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Sua conta atual é de <strong>Consumidor</strong>. Para acessar ferramentas de venda, leads regionais e publicar ofertas, cadastre seu negócio agora.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Receba Leads</h4>
            <p className="text-[10px] text-slate-500 mt-1">Acesse pedidos de orçamento na sua região</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <Tag className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Crie Ofertas</h4>
            <p className="text-[10px] text-slate-500 mt-1">Divulgue promoções para milhares de usuários</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Empresa Verificada</h4>
            <p className="text-[10px] text-slate-500 mt-1">Ganhe confiança e destaque nas buscas</p>
          </div>
        </div>

        <button 
          onClick={handleStartRegistration}
          className="mt-4 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Cadastrar Minha Empresa Gratuitamente</span>
        </button>
      </div>
    );
  }

  if (!currentBiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-fade-in px-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2 shadow-sm border border-slate-200">
          <span className="text-2xl text-slate-400">🏢</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          {currentUser ? 'Nenhuma empresa cadastrada' : 'Área do Parceiro EconomizaJá'}
        </h2>
        <p className="text-sm text-slate-500 max-w-md bg-white p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed">
          {currentUser ? (
            <>
              Sua conta ainda não possui empresas cadastradas no sistema.<br className="hidden sm:block" />
              <strong className="text-slate-700 mt-2 block">Cadastre seu negócio para começar a receber orçamentos e divulgar ofertas.</strong>
            </>
          ) : (
            <>
              Para acessar o Painel do Parceiro ou cadastrar sua empresa, é necessário entrar na sua conta com perfil de empresa.<br className="hidden sm:block" />
              <strong className="text-slate-700 mt-2 block">Acesso seguro protegido por autenticação.</strong>
            </>
          )}
        </p>
        <button 
          onClick={handleStartRegistration}
          className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-200 transition-all active:scale-95"
        >
          {currentUser ? 'Cadastrar Nova Empresa' : 'Entrar ou Criar Conta de Empresa'}
        </button>
      </div>
    );
  }

  // Cotações filtradas estritamente pela categoria da empresa
  const categoryQuotes = quoteRequests.filter((q) => {
    if (q.status === 'cancelado') return false;
    if (q.targetBusinessId) {
      return (q.targetBusinessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase();
    }
    // Sempre inclui se a empresa já enviou proposta ou foi contratada
    if (q.proposals && q.proposals.some((p) => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase())) {
      return true;
    }
    return isQuoteMatchingBusiness(q, currentBiz);
  });

  // Cotações gerais de toda a cidade ou estado da empresa
  const regionalQuotes = quoteRequests.filter((q) => {
    if (q.status === 'cancelado') return false;
    if (q.targetBusinessId) {
      return (q.targetBusinessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase();
    }
    // Sempre inclui se a empresa já enviou proposta ou foi contratada
    if (q.proposals && q.proposals.some((p) => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase())) {
      return true;
    }
    return isLocationMatch(currentBiz, q);
  });

  // Se houver da categoria, usa categoria; senão, ou se selecionado 'all_region', exibe as da região
  const relevantQuotes = quotesScope === 'all_region'
    ? regionalQuotes
    : (categoryQuotes.length > 0 ? categoryQuotes : regionalQuotes);

  // 1. Serviços Ganhos / Contratados pelo cliente (Prioridade máxima)
  const wonQuotes = relevantQuotes.filter((q) => {
    const myProposal = q.proposals.find((p) => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase());
    return Boolean(
      myProposal &&
      (myProposal.status === 'escolhida' ||
        (q.status === 'escolhido' && (q.proposals.length === 1 || myProposal.status !== 'recusada')))
    );
  });

  // 2. Propostas Enviadas (Aguardando decisão do cliente)
  const sentQuotes = relevantQuotes.filter((q) => {
    const myProposal = q.proposals.find((p) => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase());
    const isWon = Boolean(
      myProposal &&
      (myProposal.status === 'escolhida' ||
        (q.status === 'escolhido' && (q.proposals.length === 1 || myProposal.status !== 'recusada')))
    );
    return Boolean(myProposal && !isWon && q.status !== 'cancelado');
  });

  // 3. Novas Oportunidades (Ainda não enviou proposta)
  const oppsQuotes = relevantQuotes.filter((q) => {
    const alreadySent = q.proposals.some((p) => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase());
    return !alreadySent && q.status !== 'cancelado';
  });

  // Alterna automaticamente para a aba de 'won' quando houver serviços ganhos
  React.useEffect(() => {
    if (wonQuotes.length > 0) {
      setQuotesFilterTab('won');
    }
  }, [wonQuotes.length, currentBiz.id]);

  // Lista a ser exibida conforme a aba ativa
  const displayedQuotes = quotesFilterTab === 'won'
    ? wonQuotes
    : quotesFilterTab === 'sent'
    ? sentQuotes
    : oppsQuotes;

  // Identifica se há orçamentos direcionados para outras empresas do mesmo usuário
  const otherBizDirectQuotes = ownedBusinesses
    .filter((b) => b.id !== currentBiz.id)
    .map((b) => ({
      biz: b,
      quotes: quoteRequests.filter(
        (q) => q.status !== 'cancelado' && (q.targetBusinessId || '').toLowerCase() === (b.id || '').toLowerCase()
      ),
    }))
    .filter((item) => item.quotes.length > 0);

  const activePlan = (currentBiz.plan || currentBiz.planTier || 'gratis').toLowerCase();
  const isGratis = activePlan === 'gratis' || activePlan === 'free';
  const isPro = activePlan === 'pro';
  const isPremium = activePlan === 'premium';

  // PROBLEMA 3: Contagem de propostas enviadas pela empresa no mês vigente
  const monthlyProposalsCount = currentBiz
    ? (quoteRequests || [])
        .flatMap((q) => q.proposals || [])
        .filter(
          (p) =>
            (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase() &&
            isThisMonth(p.createdAt)
        ).length
    : 0;

  const hasReachedProposalLimit = isGratis && monthlyProposalsCount >= 3 && (!currentBiz.leadCredits || currentBiz.leadCredits <= 0);

  // PROBLEMA 4: Prevenção de duplo clique no envio de propostas
  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingProposal) return;
    if (!activeQuoteId || !proposalPrice) return;

    if (hasReachedProposalLimit) {
      setShowProposalLimitModal(true);
      return;
    }

    try {
      setIsSendingProposal(true);
      await submitProposal(activeQuoteId, {
        businessId: currentBiz.id,
        businessName: currentBiz.name,
        businessWhatsapp: currentBiz.whatsapp,
        businessRating: currentBiz.rating,
        businessReviewCount: currentBiz.reviewCount,
        businessDistanceKm: currentBiz.distanceKm,
        price: Number(proposalPrice),
        description: proposalDescription.trim() || 'Orçamento detalhado incluindo mão de obra e garantia do serviço.',
        deadlineText: proposalDeadline,
      });

      setActiveQuoteId(null);
      setProposalPrice('');
      setProposalDescription('');
      alert('Proposta comercial enviada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao submeter proposta:', err);
      alert(err.message || 'Não foi possível enviar a proposta. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSendingProposal(false);
    }
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle.trim() || !newOfferPrice) return;

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + Number(newOfferValidDays));

    let finalImageUrl = newOfferImageUrl.trim();
    if (isInvalidOrDeadImageUrl(finalImageUrl)) {
      if (!isInvalidOrDeadImageUrl(currentBiz.coverImage)) {
        finalImageUrl = currentBiz.coverImage!;
      } else if (currentBiz.photos && currentBiz.photos.length > 0 && !isInvalidOrDeadImageUrl(currentBiz.photos[0])) {
        finalImageUrl = currentBiz.photos[0];
      } else {
        finalImageUrl = getSmartImage(currentBiz.categoryId, `${newOfferTitle} ${currentBiz.subcategory || ''} ${currentBiz.name}`);
      }
    }

    addOffer({
      businessId: currentBiz.id,
      businessName: currentBiz.name,
      businessWhatsapp: currentBiz.whatsapp,
      businessNeighborhood: currentBiz.neighborhood,
      businessCity: currentBiz.city,
      categoryId: currentBiz.categoryId,
      title: newOfferTitle.trim(),
      description: newOfferDesc.trim(),
      currentPrice: Number(newOfferPrice),
      originalPrice: newOfferOrigPrice ? Number(newOfferOrigPrice) : undefined,
      validUntil: validUntilDate.toISOString().split('T')[0],
      imageUrl: finalImageUrl,
    });

    setNewOfferTitle('');
    setNewOfferPrice('');
    setNewOfferOrigPrice('');
    setNewOfferDesc('');
    setNewOfferImageUrl('');
    setActiveTab('leads');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BusinessAvatar
              src={currentBiz.logo || currentBiz.photos?.[0]}
              name={currentBiz.name}
              className="w-14 h-14 rounded-xl border border-slate-100 shadow-xs"
              iconClassName="w-6 h-6 text-emerald-600"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md">
                  PAINEL DO PARCEIRO
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Plano Atual: <strong className="text-emerald-700 uppercase">{activePlan}</strong>
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{currentBiz.name}</h2>
              <p className="text-xs text-slate-500">{currentBiz.neighborhood}, {currentBiz.city}</p>
            </div>
          </div>

          {/* Switch Managed Business / Cadastrar outra */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Empresa:</span>
            <select
              value={selectedBizId || ""}
              onChange={(e) => setSelectedBizId(e.target.value)}
              className="text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {ownedBusinesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subcategory})
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsLeadCreditsModalOpen(true)}
              title="Comprar Saldo de Leads para responder cotações"
              className="text-xs font-bold px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer min-h-[44px]"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>Comprar Leads</span>
            </button>
            <button
              onClick={handleStartRegistration}
              title="Cadastrar outra empresa"
              className="text-xs font-bold px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1 shrink-0 min-h-[44px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Empresa</span>
            </button>
            <button
              onClick={async () => {
                setIsRefreshing(true);
                await refreshBusinesses?.();
                await refreshQuoteRequests?.();
                setIsRefreshing(false);
              }}
              title="Atualizar dados do negócio e plano"
              className="text-xs font-bold px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition-colors flex items-center gap-1 shrink-0 min-h-[44px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              Visualizações
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1">0</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              Cliques no WhatsApp
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1">0</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              Leads na Região
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1">{relevantQuotes.length}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              Propostas Enviadas
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1">
              {quoteRequests.reduce(
                (acc, q) => acc + (q.proposals || []).filter((p) => p.businessId === currentBiz.id).length,
                0
              )}
            </span>
          </div>
        </div>

        {/* Portal Nav Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-3.5 py-2 rounded-xl font-bold transition ${
              activeTab === 'leads' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Leads & Cotações ({relevantQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('ofertas')}
            className={`px-3.5 py-2 rounded-xl font-bold transition ${
              activeTab === 'ofertas' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Criar Oferta Promocional
          </button>
          <button
            onClick={() => setActiveTab('planos')}
            className={`px-3.5 py-2 rounded-xl font-bold transition ${
              activeTab === 'planos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Planos & Destaque
          </button>
        </div>
      </div>

      {/* TAB: LEADS / COTAÇÕES RECEBIDAS */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Header e Abas de Status de Orçamentos */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Orçamentos & Serviços da Empresa
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhe seus serviços ganhos, propostas em análise e novas oportunidades na região.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsLeadCreditsModalOpen(true)}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                  title="Adquirir créditos de leads avulsos"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  <span>Comprar Saldo de Leads</span>
                </button>

                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await refreshQuoteRequests();
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                  title="Atualizar orçamentos em tempo real"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                  <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
                </button>
              </div>
            </div>

            {/* Abas de Status (Segmented Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setQuotesFilterTab('won')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  quotesFilterTab === 'won'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Serviços Ganhos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  quotesFilterTab === 'won' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {wonQuotes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuotesFilterTab('sent')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  quotesFilterTab === 'sent'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Propostas Enviadas</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  quotesFilterTab === 'sent' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {sentQuotes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuotesFilterTab('opportunities')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  quotesFilterTab === 'opportunities'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Novas Oportunidades</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  quotesFilterTab === 'opportunities' ? 'bg-slate-700 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {oppsQuotes.length}
                </span>
              </button>
            </div>

            {/* Subfiltro de escopo (somente visível na aba de Oportunidades) */}
            {quotesFilterTab === 'opportunities' && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500">Filtrar por:</span>
                <button
                  type="button"
                  onClick={() => setQuotesScope('category')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    quotesScope === 'category'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Minha Categoria ({categoryQuotes.filter(q => !q.proposals.some(p => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase())).length})
                </button>
                <button
                  type="button"
                  onClick={() => setQuotesScope('all_region')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    quotesScope === 'all_region'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Toda a Região ({regionalQuotes.filter(q => !q.proposals.some(p => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase())).length})
                </button>
              </div>
            )}
          </div>

          {/* Status de Cotações Gratuitas & Saldo de Leads */}
          {isGratis && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Cotações Mensais (Plano Gratuito)</span>
                  </span>
                  <span className="px-2 py-0.5 bg-white text-emerald-800 rounded-md font-extrabold border border-emerald-200 text-[10px]">
                    {monthlyProposalsCount}/3 gratuitas usadas
                  </span>
                  {(currentBiz.leadCredits || 0) > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-extrabold border border-amber-300 text-[10px] flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {currentBiz.leadCredits} crédito(s) de lead
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px]">
                  {monthlyProposalsCount < 3
                    ? `Você tem ${3 - monthlyProposalsCount} cotação(ões) gratuita(s) restante(s) neste mês.${
                        (currentBiz.leadCredits || 0) > 0 ? ` Saldo extra: ${currentBiz.leadCredits} lead(s).` : ''
                      }`
                    : (currentBiz.leadCredits || 0) > 0
                    ? `Limite gratuito de 3 cotações atingido. Cada proposta enviada consumirá 1 crédito de lead (Saldo: ${currentBiz.leadCredits}).`
                    : 'Limite de 3 propostas gratuitas do mês atingido. Adquira saldo de leads avulso ou assine o Plano Pró para continuar respondendo.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLeadCreditsModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer min-h-[40px]"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Comprar Saldo de Leads</span>
                </button>
              </div>
            </div>
          )}

          {otherBizDirectQuotes.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>Você tem orçamentos direcionados aguardando em outra empresa sua:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {otherBizDirectQuotes.map((item) => (
                  <button
                    key={item.biz.id}
                    onClick={() => setSelectedBizId(item.biz.id)}
                    className="text-xs font-semibold px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Ver {item.quotes.length} orçamento(s) em <strong>{item.biz.name}</strong></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LISTAGEM DE COTAÇÕES FILTRADAS */}
          <div className="space-y-3">
            {displayedQuotes.length === 0 ? (
              <EmptyState
                icon={
                  quotesFilterTab === 'won'
                    ? CheckCircle2
                    : quotesFilterTab === 'sent'
                    ? Clock
                    : Sparkles
                }
                badge={
                  quotesFilterTab === 'won'
                    ? 'Serviços Ganhos'
                    : quotesFilterTab === 'sent'
                    ? 'Propostas Enviadas'
                    : 'Oportunidades'
                }
                title={
                  quotesFilterTab === 'won'
                    ? 'Nenhum serviço ganho no momento'
                    : quotesFilterTab === 'sent'
                    ? 'Nenhuma proposta em análise'
                    : 'Nenhuma nova oportunidade nesta categoria'
                }
                description={
                  quotesFilterTab === 'won'
                    ? 'Quando um cliente aceitar seu orçamento, o contato liberado aparecerá aqui com prioridade máxima.'
                    : quotesFilterTab === 'sent'
                    ? 'Suas propostas enviadas que aguardam retorno dos clientes serão listadas aqui.'
                    : 'Aguarde novos pedidos de clientes na sua cidade ou amplie para ver toda a região.'
                }
                action={
                  quotesFilterTab !== 'opportunities' && oppsQuotes.length > 0
                    ? {
                        label: `Ver ${oppsQuotes.length} oportunidade(s) disponível(is)`,
                        onClick: () => setQuotesFilterTab('opportunities'),
                        icon: Sparkles,
                      }
                    : undefined
                }
              />
            ) : (
              displayedQuotes.map((q) => {
                const alreadySent = q.proposals.some((p) => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase());
                const myProposal = q.proposals.find((p) => (p.businessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase());
                const isProposalAccepted = Boolean(
                  myProposal &&
                    (myProposal.status === 'escolhida' ||
                      (q.status === 'escolhido' && (q.proposals.length === 1 || myProposal.status !== 'recusada')))
                );

                const hasPhone = Boolean(q.userPhone && !q.userPhone.includes('****'));

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl p-5 shadow-xs transition space-y-3 ${
                      isProposalAccepted
                        ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/5'
                        : alreadySent
                        ? 'border border-slate-200'
                        : 'border border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isProposalAccepted ? (
                            <span className="text-[10px] font-extrabold uppercase text-white bg-emerald-600 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3" />
                              Serviço Ganho • R$ {myProposal?.price.toFixed(2)}
                            </span>
                          ) : alreadySent ? (
                            <span className="text-[10px] font-bold uppercase text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Proposta Enviada • R$ {myProposal?.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                              Nova Oportunidade
                            </span>
                          )}

                          {q.targetBusinessId && (
                            <span className="text-[10px] font-bold uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              Exclusivo
                            </span>
                          )}

                          <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                            {q.neighborhood ? `${q.neighborhood}, ${q.city}` : q.city}
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-slate-900">{q.title}</h4>
                      </div>

                      {q.status === 'cancelado' && (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                          Encerrado
                        </span>
                      )}
                    </div>

                    {/* Descrição do Pedido */}
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      {q.description}
                    </p>

                    {/* Metadados: Cliente e Prazo */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 pt-0.5">
                      <span>Cliente: <strong className="text-slate-700">{q.userName}</strong></span>
                      <span>Prazo: <strong className="text-slate-700">{q.desiredDeadline || 'A combinar'}</strong></span>
                    </div>

                    {/* Rodapé e Ação Principal (CTA Único e Limpo) */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        {(q.proposals || []).length} empresa(s) orçando este pedido
                      </span>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {isProposalAccepted ? (
                          <>
                            {hasPhone ? (
                              <a
                                href={buildWhatsAppLink(
                                  q.userPhone,
                                  `Olá ${q.userName || ''}! Sou da empresa ${myProposal?.businessName || currentBiz?.name || 'parceira'}. Vi que você aceitou minha proposta de R$ ${myProposal?.price.toFixed(2)} para o pedido "${q.title}" no EconomizaJá! Gostaria de combinar a data e horário para o atendimento.`
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs active:scale-95"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span>Conversar no WhatsApp</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium">
                                Telefone em liberação
                              </span>
                            )}
                            <button
                              onClick={() => setComparingQuoteRequestId(q.id)}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition whitespace-nowrap"
                            >
                              Ver Detalhes
                            </button>
                          </>
                        ) : !alreadySent ? (
                          <button
                            onClick={() => {
                              if (hasReachedProposalLimit) {
                                setIsLeadCreditsModalOpen(true);
                              } else {
                                setActiveQuoteId(q.id);
                              }
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer min-h-[44px]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar Proposta</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setComparingQuoteRequestId(q.id)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center justify-center gap-1.5"
                          >
                            <span>Ver Proposta Enviada</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL / FORM TO SUBMIT PROPOSAL */}
      {activeQuoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          {/* Overlay Click */}
          <div className="absolute inset-0" onClick={() => setActiveQuoteId(null)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900">
                Enviar Proposta para o Cliente
              </h4>
              <button
                onClick={() => setActiveQuoteId(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendProposal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Total da Proposta (R$) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={proposalPrice}
                  onChange={(e) => setProposalPrice(e.target.value)}
                  placeholder="Ex: 850.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prazo de Entrega / Execução
                </label>
                <input
                  type="text"
                  value={proposalDeadline}
                  onChange={(e) => setProposalDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detalhes e Condições da Proposta
                </label>
                <textarea
                  rows={3}
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  placeholder="Ex: Inclui material de primeira linha, limpeza do local e 1 ano de garantia com nota fiscal."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>

              {isGratis && monthlyProposalsCount >= 3 && (currentBiz.leadCredits || 0) > 0 && (
                <div className="bg-amber-50 p-3 rounded-xl text-[11px] text-amber-800 border border-amber-200 flex items-center justify-between">
                  <span>⚡ Limite mensal gratuito atingido. O envio desta proposta consumirá <strong>1 crédito de lead</strong>.</span>
                  <span className="font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md text-[10px] shrink-0 ml-2">
                    Saldo: {currentBiz.leadCredits}
                  </span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 border border-slate-100">
                Ao enviar a proposta, o cliente verá o valor, sua avaliação ({currentBiz.rating} ⭐) e poderá escolher sua empresa ou clicar no WhatsApp.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSendingProposal}
                  onClick={() => setActiveQuoteId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingProposal}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {isSendingProposal ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando Proposta...</span>
                    </>
                  ) : (
                    'Confirmar Envio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: CRIAR OFERTA */}
      {activeTab === 'ofertas' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cadastrar Nova Oferta Promocional</h3>
            <p className="text-xs text-slate-500">
              Sua promoção aparecerá na seção "Ofertas Perto de Você" e notificará usuários com alertas de preço.
            </p>
          </div>

          <form onSubmit={handleCreateOffer} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título da Oferta</label>
              <input
                type="text"
                required
                value={newOfferTitle}
                onChange={(e) => setNewOfferTitle(e.target.value)}
                placeholder="Ex: Troca de óleo sintético + filtro grátis"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preço Promocional (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newOfferPrice}
                  onChange={(e) => setNewOfferPrice(e.target.value)}
                  placeholder="149.90"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preço Original Real (R$, opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newOfferOrigPrice}
                  onChange={(e) => setNewOfferOrigPrice(e.target.value)}
                  placeholder="199.90"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
              <textarea
                rows={2}
                value={newOfferDesc}
                onChange={(e) => setNewOfferDesc(e.target.value)}
                placeholder="Detalhes dos itens inclusos e regras da promoção..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Foto da Oferta</label>
                <span className="text-[11px] text-emerald-600 font-semibold">Automático, Upload ou Link</span>
              </div>

              {/* Botões de sugestão rápida */}
              <div className="mb-2">
                <span className="text-[10px] text-slate-500 block mb-1 font-medium">Escolha rápida por tema do serviço:</span>
                <div className="flex flex-wrap gap-1.5">
                  {OFFER_IMAGE_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewOfferImageUrl(sug.url)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        newOfferImageUrl === sug.url
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {sug.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div>
                  <input
                    type="url"
                    value={newOfferImageUrl}
                    onChange={(e) => setNewOfferImageUrl(e.target.value)}
                    placeholder="Ou cole o link da foto (URL)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                  />
                </div>
                <div>
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-xs font-semibold transition">
                    <span>Selecionar do Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (typeof event.target?.result === 'string') {
                              setNewOfferImageUrl(event.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Prévia da Foto */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                  <SafeImage
                    src={newOfferImageUrl || currentBiz.coverImage}
                    alt="Prévia da Oferta"
                    category={currentBiz.categoryId}
                    fallbackKeyword={`${newOfferTitle} ${currentBiz.subcategory}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Prévia da imagem da oferta</span>
                  <p className="text-slate-500 text-[11px]">
                    {newOfferImageUrl
                      ? 'Imagem personalizada selecionada.'
                      : 'Nenhuma foto escolhida: o sistema exibirá automaticamente a foto profissional acima condizente com o serviço.'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition"
            >
              Publicar Oferta no App
            </button>
          </form>

          <div className="pt-8 mt-8 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Minhas Ofertas Ativas</h3>
            <div className="space-y-3">
              {offers.filter(o => o.businessId === currentBiz.id).length === 0 ? (
                <EmptyState
                  compact
                  icon={Tag}
                  badge="Promoções"
                  title="Você ainda não possui nenhuma oferta ativa"
                  description="Cadastre ofertas com descontos promocionais para atrair clientes da sua região."
                />
              ) : (
                offers.filter(o => o.businessId === currentBiz.id).map(offer => (
                  <div key={offer.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <SafeImage
                      src={offer.imageUrl}
                      alt={offer.title}
                      category={offer.categoryId}
                      fallbackKeyword={offer.title}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{offer.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-emerald-600 font-bold text-sm">R$ {offer.currentPrice.toFixed(2)}</span>
                        {offer.originalPrice && <span className="text-slate-400 line-through text-xs">R$ {offer.originalPrice.toFixed(2)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 px-2 shrink-0">
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md">ATIVA</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeOffer(offer.id);
                        }}
                        className="flex items-center gap-1 p-1.5 px-3 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition text-[10px] font-bold"
                        title="Excluir Oferta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PLANOS & MONETIZAÇÃO */}
      {activeTab === 'planos' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Planos de Assinatura & Monetização</h3>
            <p className="text-xs text-slate-500">
              Impulsione as vendas da sua empresa com leads ilimitados e destaque garantido
            </p>
          </div>

          {/* Google Play Billing Status no Android Nativo */}
          {isNativeAndroid && (
            <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-emerald-950 font-bold text-sm flex items-center gap-1.5">
                    <span>Google Play Billing Ativo</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </h4>
                  <p className="text-xs text-emerald-900/90 leading-relaxed">
                    Assinaturas processadas de forma segura diretamente pela sua conta Google Play Store.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRestoringPurchases}
                onClick={handleRestorePurchases}
                className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition shrink-0 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRestoringPurchases ? 'animate-spin' : ''}`} />
                <span>Restaurar Assinatura</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gratuito */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Gratuito</span>
                <h4 className="text-2xl font-bold text-slate-900">R$ 0</h4>
                <p className="text-xs text-slate-500">Para começar a receber clientes locais</p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li>✓ Perfil no catálogo do EconomizaJá</li>
                  <li>✓ Até 3 propostas de orçamento/mês</li>
                  <li>✓ 1 oferta ativa simultânea</li>
                  <li>✓ Botão de contato direto WhatsApp</li>
                </ul>
              </div>
              <button
                disabled={isGratis}
                onClick={() => upgradeBusinessPlan(currentBiz.id, 'free')}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {isGratis ? 'Plano Atual' : 'Migrar para Gratuito'}
              </button>
            </div>

            {/* Pró */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl relative border border-slate-800">
              <div className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase">
                Mais Popular
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Plano Pró</span>
                <h4 className="text-2xl font-bold">R$ {monetization.planProMonthly.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/mês</span></h4>
                <p className="text-xs text-slate-300">Para profissionais e oficinas em crescimento</p>
                <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                  <li>✓ Propostas ilimitadas para orçamentos</li>
                  <li>✓ Notificações instantâneas de novos leads</li>
                  <li>✓ Até 5 ofertas ativas simultâneas</li>
                  <li>✓ Selo de Empresa Verificada</li>
                </ul>
              </div>
              {isNativeAndroid ? (
                <button
                  type="button"
                  disabled={isPro || isPurchasingPlan !== null}
                  onClick={() => handleNativePurchase('pro')}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  {isPurchasingPlan === 'pro' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando no Google Play...</span>
                    </>
                  ) : isPro ? (
                    'Plano Atual Ativo'
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Assinar via Google Play</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled={isPro}
                  onClick={() => setCheckoutPlan('pro')}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20 cursor-pointer"
                >
                  {isPro ? 'Plano Atual Ativo' : 'Assinar Plano Pró'}
                </button>
              )}
            </div>

            {/* Premium */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold uppercase">
                  <Crown className="w-4 h-4 text-emerald-600" />
                  <span>Plano Premium</span>
                </div>
                <h4 className="text-2xl font-bold text-slate-900">R$ {monetization.planPremiumMonthly.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/mês</span></h4>
                <p className="text-xs text-slate-500">Capacidade operacional máxima para empresas líderes</p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li>✓ Propostas ilimitadas para orçamentos</li>
                  <li>✓ Ofertas ativas ilimitadas no marketplace</li>
                  <li>✓ Selo corporativo de Empresa Premium</li>
                  <li>✓ Acesso prioritário imediato a novos leads</li>
                  <li>✓ Suporte VIP dedicado</li>
                </ul>
              </div>
              {isNativeAndroid ? (
                <button
                  type="button"
                  disabled={isPremium || isPurchasingPlan !== null}
                  onClick={() => handleNativePurchase('premium')}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                >
                  {isPurchasingPlan === 'premium' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando no Google Play...</span>
                    </>
                  ) : isPremium ? (
                    'Plano Atual Ativo'
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Assinar via Google Play</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled={isPremium}
                  onClick={() => setCheckoutPlan('premium')}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  {isPremium ? 'Plano Atual Ativo' : 'Assinar Plano Premium'}
                </button>
              )}
            </div>
          </div>

          {/* CARD DE COMPRA AVULSA DE LEADS NA ABA DE PLANOS */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                Sem Mensalidade
              </span>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Prefere comprar pacotes de leads sob demanda?</span>
              </h4>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                Adquira créditos avulsos (1 Lead, Pacote de 5 Leads ou Pacote de 20 Leads) para responder orçamentos específicos quando quiser, pagando via PIX sem compromisso mensal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLeadCreditsModalOpen(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>Ver Pacotes de Leads</span>
            </button>
          </div>

          {/* SEÇÃO INDEPENDENTE: DESTAQUE PATROCINADO (PLANO ≠ DESTAQUE) */}
          <div className="mt-8 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Visibilidade Máxima • Topo das Buscas</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Destaque Patrocinado da Empresa</h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  O <strong>Destaque Patrocinado</strong> é uma contratação separada e independente do seu plano. Empresas com qualquer plano (Gratuito, Pró ou Premium) podem contratar diárias de destaque para figurar no topo do guia e na tela inicial.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs shrink-0 text-center sm:text-right">
                <span className="text-[10px] text-slate-500 font-medium block uppercase">Investimento Diário</span>
                <span className="text-2xl font-black text-slate-900">
                  R$ {monetization.featuredDailyRate.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500"> /dia</span>
                </span>
                <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                  {currentBiz.featured ? '★ Sua empresa está em DESTAQUE' : 'Sem destaque ativo'}
                </span>
              </div>
            </div>

            {/* Configuração de Período do Destaque */}
            <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-amber-200/70 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-800">Escolha a duração do Destaque:</span>
                <div className="flex items-center gap-2">
                  {[7, 15, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setHighlightDays(days)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                        highlightDays === days
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-amber-100">
                <div className="text-xs text-slate-600">
                  Total para <strong>{highlightDays} dias de destaque</strong>:{' '}
                  <strong className="text-base text-slate-900">
                    R$ {(highlightDays * monetization.featuredDailyRate).toFixed(2)}
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={isHighlighting}
                  onClick={handleHireHighlight}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isHighlighting ? 'Processando...' : 'Contratar Destaque Patrocinado'}</span>
                </button>
              </div>

              {highlightSuccess && highlightPendingInfo && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Solicitação de Destaque Registrada (Status: PENDING)</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    A solicitação de <strong>{highlightPendingInfo.days} dias de destaque</strong> (R$ {highlightPendingInfo.totalCost.toFixed(2)}) foi gerada no status PENDING. A ativação no guia ocorrerá após a confirmação do pagamento.
                  </p>
                  {monetization.adminPixKey && (
                    <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>Chave PIX: <strong className="font-mono text-slate-900">{monetization.adminPixKey}</strong></span>
                      {monetization.adminWhatsapp && (
                        <a
                          href={buildWhatsAppLink(
                            monetization.adminWhatsapp,
                            `Olá! Sou da empresa *${currentBiz.name}* no EconomizaJá. Solicitei ${highlightPendingInfo.days} dias de Destaque Patrocinado (R$ ${highlightPendingInfo.totalCost.toFixed(2)}) e gostaria de enviar o comprovante PIX para confirmação.`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] text-center transition shrink-0"
                        >
                          Enviar Comprovante WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO TRANSPARÊNCIA: ENCERRAMENTO DE PARCERIA & EXCLUSÃO DE CONTA */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Encerramento de Parceria & Privacidade (LGPD)</span>
            </h4>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Deseja pausar suas atividades temporariamente ou excluir sua empresa e cadastro da plataforma? Você pode solicitar a pausa/suspensão ao administrador ou eliminar sua conta e dados de forma definitiva.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {monetization?.adminWhatsapp && (
              <a
                href={buildWhatsAppLink(
                  monetization.adminWhatsapp,
                  `Olá Administrador do EconomizaJá! Sou responsável pela empresa *${currentBiz.name}* e gostaria de solicitar a pausa/desativação temporária da minha empresa no guia.`
                )}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Solicitar Pausa</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setPublicRoute('delete_account')}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Cadastro & Dados</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: CHECKOUT DE PLANO (APENAS WEB - BLOQUEADO NO ANDROID NATIVO) */}
      {checkoutPlan && !isNativeAndroid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          {/* Overlay Click */}
          <div className="absolute inset-0" onClick={() => setCheckoutPlan(null)} />
          
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Assinatura Corporativa
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Ativação do Plano {checkoutPlan === 'pro' ? 'Pró' : 'Premium'}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutPlan(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Valor Mensal</span>
                <div className="text-2xl font-bold text-slate-900">
                  R${' '}
                  {checkoutPlan === 'pro'
                    ? monetization.planProMonthly.toFixed(2)
                    : monetization.planPremiumMonthly.toFixed(2)}
                  <span className="text-xs text-slate-400 font-normal"> /mês</span>
                </div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200">
                Estado inicial: PENDING
              </span>
            </div>

            {/* Aviso de Conformidade com Google Play e Segurança */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <strong className="flex items-center gap-1.5 font-bold">
                <Smartphone className="w-4 h-4 text-blue-700" />
                <span>Google Play Billing & Faturamento Digital</span>
              </strong>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                No app Android publicado na Google Play Store, cobranças digitais de planos e serviços são processadas através do Google Play Billing. Nenhum benefício é liberado antes da confirmação real do provedor no backend (transição segura de PENDING para ACTIVE).
              </p>
            </div>

            {/* OPÇÃO 1: PIX DIRETO (CANAL EXTERNO WEB) */}
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  <span>Canal Web / Administrativo: Pagamento via PIX</span>
                </span>
                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                  Sem taxas
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Chave PIX ({monetization.adminPixKeyType || 'E-mail'})</span>
                    <strong className="text-slate-900 text-xs font-mono">{monetization.adminPixKey || 'pix@economizaja.com.br'}</strong>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(monetization.adminPixKey || 'pix@economizaja.com.br');
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 3000);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Chave</span>
                      </>
                    )}
                  </button>
                </div>

                {monetization.adminPixBeneficiary && (
                  <p className="text-[11px] text-slate-600">
                    <strong>Titular:</strong> {monetization.adminPixBeneficiary} • <strong>Banco:</strong> {monetization.adminPixBank || 'Banco Digital'}
                  </p>
                )}

                <p className="text-[11px] text-slate-500 font-medium p-2 bg-white rounded-lg border border-slate-100">
                  <strong>Precisa de Boleto?</strong> Chame no WhatsApp abaixo informando seu CNPJ para gerarmos o Boleto Bancário.
                </p>

                <p className="text-[11px] text-slate-500">
                  {monetization.adminReceiptInstructions || 'Após efetuar o PIX ou Boleto, envie o comprovante para nosso WhatsApp com o nome da sua empresa para ativação.'}
                </p>
              </div>

              {/* Botão WhatsApp */}
              {monetization.adminWhatsapp && (
                <a
                  href={buildWhatsAppLink(
                    monetization.adminWhatsapp,
                    `Olá! Sou da empresa *${currentBiz.name}* no EconomizaJá. Acabei de realizar o pagamento PIX do *Plano ${
                      checkoutPlan === 'pro' ? 'Pró' : 'Premium'
                    }* e gostaria de solicitar a ativação.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
                >
                  <Phone className="w-4 h-4" />
                  <span>Enviar Comprovante via WhatsApp</span>
                </a>
              )}
            </div>

            {/* AÇÕES DE CHECKOUT */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  upgradeBusinessPlan(currentBiz.id, checkoutPlan);
                  setCheckoutPlan(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs"
              >
                <span>Solicitar Assinatura (Gerar Cobrança PENDING)</span>
              </button>

              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROBLEMA 3: MODAL DE LIMITE DE PROPOSTAS DO PLANO GRATUITO */}
      {showProposalLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowProposalLimitModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900">
                Limite Mensal de Propostas Atingido
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                No plano <strong>Gratuito</strong>, sua empresa tem direito a até <strong>3 propostas por mês</strong>. Você já enviou <strong>{monthlyProposalsCount} de 3</strong> propostas neste mês.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 text-left space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-emerald-600" />
                <span>Vantagens do Plano Pró:</span>
              </div>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                <li>✓ Envio de propostas <strong>ilimitadas</strong> todos os meses</li>
                <li>✓ Notificações prioritárias de novos pedidos</li>
                <li>✓ Selo de Empresa Verificada no catálogo</li>
              </ul>
            </div>

            {isNativeAndroid ? (
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isPurchasingPlan !== null}
                  onClick={async () => {
                    setShowProposalLimitModal(false);
                    await handleNativePurchase('pro');
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Assinar Plano Pró via Google Play</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProposalLimitModal(false);
                    setIsLeadCreditsModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Comprar Saldo de Leads Avulso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowProposalLimitModal(false)}
                  className="w-full py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProposalLimitModal(false);
                    setIsLeadCreditsModalOpen(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Comprar Saldo de Leads</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProposalLimitModal(false);
                    setActiveTab('planos');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition min-h-[44px]"
                >
                  Ver Planos Mensais
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE COMPRA DE SALDO DE LEADS (AVULSO, 5 LEADS, 20 LEADS) */}
      <LeadCreditsModal
        isOpen={isLeadCreditsModalOpen}
        onClose={() => setIsLeadCreditsModalOpen(false)}
        business={currentBiz}
        onOpenPlansTab={() => setActiveTab('planos')}
      />

    </div>
  );
};
