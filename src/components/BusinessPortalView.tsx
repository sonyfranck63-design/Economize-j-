import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CompanyRegistrationView } from './CompanyRegistrationView';
import { BusinessAvatar } from './BusinessAvatar';
import { SafeImage } from './SafeImage';
import { getSmartImage, isInvalidOrDeadImageUrl, OFFER_IMAGE_SUGGESTIONS } from '../utils/imageUtils';
import { isQuoteMatchingBusiness, isLocationMatch } from '../utils/quoteStorage';
import { buildWhatsAppLink, formatWhatsAppNumber } from '../utils/whatsappUtils';
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
} from 'lucide-react';

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
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Se houver empresas com ownerId correspondente ao usuário, usamos elas (ou todas se admin).
  const ownedBusinesses = currentUser
    ? (currentUser.role === 'admin'
        ? businesses
        : businesses.filter((b) => (b.ownerId || '').toLowerCase() === (currentUser.id || '').toLowerCase()))
    : [];
  
  // Pick the first business as current active managed business
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  
  const currentBiz = selectedBizId 
    ? ownedBusinesses.find((b) => b.id === selectedBizId) 
    : (ownedBusinesses.length > 0 ? ownedBusinesses[0] : null);

  // Se o dropdown não tiver selecionado ninguem ainda mas tiver empresa, seleciona a primeira
  React.useEffect(() => {
    if (!selectedBizId && ownedBusinesses.length > 0) {
      setSelectedBizId(ownedBusinesses[0].id);
    }
  }, [ownedBusinesses, selectedBizId]);

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
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalDeadline, setProposalDeadline] = useState('Execução em até 2 dias úteis');
  const [proposalDescription, setProposalDescription] = useState('');

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

  const [quotesScope, setQuotesScope] = useState<'category' | 'all_region'>('category');

  // Cotações filtradas estritamente pela categoria da empresa
  const categoryQuotes = quoteRequests.filter((q) => {
    if (q.status === 'cancelado') return false;
    if (q.targetBusinessId) {
      return (q.targetBusinessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase();
    }
    return isQuoteMatchingBusiness(q, currentBiz);
  });

  // Cotações gerais de toda a cidade ou estado da empresa
  const regionalQuotes = quoteRequests.filter((q) => {
    if (q.status === 'cancelado') return false;
    if (q.targetBusinessId) {
      return (q.targetBusinessId || '').toLowerCase() === (currentBiz.id || '').toLowerCase();
    }
    return isLocationMatch(currentBiz, q);
  });

  // Se houver da categoria, usa categoria; senão, ou se selecionado 'all_region', exibe as da região
  const relevantQuotes = quotesScope === 'all_region'
    ? regionalQuotes
    : (categoryQuotes.length > 0 ? categoryQuotes : regionalQuotes);

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

  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuoteId || !proposalPrice) return;

    try {
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
              onClick={handleStartRegistration}
              title="Cadastrar outra empresa"
              className="text-xs font-bold px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Empresa</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {quotesScope === 'all_region'
                  ? `Todos os Orçamentos da Região de ${currentBiz.city || currentBiz.state || 'Atendimento'}`
                  : `Oportunidades de Venda na Categoria "${currentBiz.subcategory || currentBiz.categoryId}"`}
              </h3>
              <p className="text-xs text-slate-500">
                {quotesScope === 'all_region'
                  ? `Exibindo todas as solicitações abertas em ${currentBiz.city || 'sua região'} para você enviar propostas`
                  : `Clientes em ${currentBiz.city || 'sua região'} que solicitaram orçamentos`}
              </p>

              {/* Botões de Alternância de Escopo de Orçamentos */}
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setQuotesScope('category')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    quotesScope === 'category'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Minha Categoria</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${quotesScope === 'category' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {categoryQuotes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuotesScope('all_region')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    quotesScope === 'all_region'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Geral da Região ({currentBiz.city || currentBiz.state || 'Geral'})</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${quotesScope === 'all_region' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {regionalQuotes.length}
                  </span>
                </button>
              </div>
            </div>

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
              className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              title="Atualizar lista de orçamentos e leads recebidos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar Leads'}</span>
            </button>
          </div>

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

          <div className="space-y-3">
            {relevantQuotes.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
                <p className="text-xs text-slate-500">Nenhum novo orçamento aguardando nesta categoria no momento.</p>
              </div>
            ) : (
              relevantQuotes.map((q) => {
                const alreadySent = q.proposals.some((p) => p.businessId === currentBiz.id);
                const myProposal = q.proposals.find((p) => p.businessId === currentBiz.id);
                const isProposalAccepted = Boolean(
                  myProposal &&
                    (myProposal.status === 'escolhida' ||
                      (q.status === 'escolhido' && (q.proposals.length === 1 || myProposal.status !== 'recusada')))
                );

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition ${
                      isProposalAccepted
                        ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20'
                        : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {q.targetBusinessId && (
                            <span className="text-[10px] font-bold uppercase text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                              Orçamento Direcionado para Sua Empresa
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                            LEAD REGIONAL • {q.neighborhood}
                          </span>
                          {q.subcategory && (
                            <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              {q.subcategory}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-slate-900 mt-1">{q.title}</h4>
                      </div>

                      {q.status === 'cancelado' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          Encerrado pelo Cliente
                        </span>
                      ) : alreadySent ? (
                        isProposalAccepted ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-emerald-600 px-3 py-1 rounded-md shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                            🎉 Proposta Escolhida (R$ {myProposal?.price.toFixed(2)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Proposta Enviada (R$ {myProposal?.price.toFixed(2)})
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          Novo Lead
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {q.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Prazo solicitado: <strong>{q.desiredDeadline}</strong></span>
                      <span>Cliente: {q.userName} ({q.userPhone})</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {(q.proposals || []).length} empresas concorrendo neste pedido
                      </span>

                      {q.status === 'cancelado' ? (
                        <button
                          onClick={() => setComparingQuoteRequestId(q.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                        >
                          Ver Detalhes (Encerrado)
                        </button>
                      ) : !alreadySent ? (
                        <button
                          onClick={() => setActiveQuoteId(q.id)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>ENVIAR PROPOSTA DE ORÇAMENTO</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setComparingQuoteRequestId(q.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            isProposalAccepted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                              : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {isProposalAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />}
                          <span>
                            {isProposalAccepted ? 'Ver Proposta Escolhida & Contato' : 'Ver Comparativo de Propostas'}
                          </span>
                        </button>
                      )}
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

              <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 border border-slate-100">
                Ao enviar a proposta, o cliente verá o valor, sua avaliação ({currentBiz.rating} ⭐) e poderá escolher sua empresa ou clicar no WhatsApp.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveQuoteId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/20"
                >
                  Confirmar Envio
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
                <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">Você ainda não possui nenhuma oferta ativa.</p>
                </div>
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
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
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
              <button
                disabled={isPro}
                onClick={() => setCheckoutPlan('pro')}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20"
              >
                {isPro ? 'Plano Atual Ativo' : 'Assinar Plano Pró'}
              </button>
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
              <button
                disabled={isPremium}
                onClick={() => setCheckoutPlan('premium')}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                {isPremium ? 'Plano Atual Ativo' : 'Assinar Plano Premium'}
              </button>
            </div>
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

      {/* MODAL DE CHECKOUT E PAGAMENTO PIX / GOOGLE PLAY */}
      {checkoutPlan && (
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

    </div>
  );
};
