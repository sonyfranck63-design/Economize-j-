import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
  Tag,
  Clock,
  Sparkles,
} from 'lucide-react';

export const BusinessPortalView: React.FC = () => {
  const {
    businesses,
    quoteRequests,
    submitProposal,
    addOffer,
    setComparingQuoteRequestId,
  } = useApp();

  // Pick the first business as current active managed business in demo
  const [selectedBizId, setSelectedBizId] = useState(businesses[0]?.id || 'b1');
  const currentBiz = businesses.find((b) => b.id === selectedBizId) || businesses[0];

  const [activeTab, setActiveTab] = useState<'leads' | 'ofertas' | 'planos' | 'metricas'>('leads');

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
  const [newOfferValidDays, setNewOfferValidDays] = useState('7');

  if (!currentBiz) {
    return <div className="p-8 text-center text-stone-500">Nenhuma empresa cadastrada.</div>;
  }

  // Quote requests relevant to this business's category and city
  const relevantQuotes = quoteRequests.filter(
    (q) => q.categoryId === currentBiz.categoryId
  );

  const handleSendProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuoteId || !proposalPrice) return;

    submitProposal(activeQuoteId, {
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
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle.trim() || !newOfferPrice) return;

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + Number(newOfferValidDays));

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
      imageUrl: currentBiz.coverImage,
    });

    setNewOfferTitle('');
    setNewOfferPrice('');
    setNewOfferOrigPrice('');
    setNewOfferDesc('');
    setActiveTab('leads');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentBiz.logo}
              alt={currentBiz.name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md">
                  PAINEL DO PARCEIRO
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Plano Atual: <strong className="text-emerald-700 uppercase">{currentBiz.planTier}</strong>
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{currentBiz.name}</h2>
              <p className="text-xs text-slate-500">{currentBiz.neighborhood}, {currentBiz.city}</p>
            </div>
          </div>

          {/* Switch Managed Business (For testing different niches) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Empresa gerenciada:</span>
            <select
              value={selectedBizId}
              onChange={(e) => setSelectedBizId(e.target.value)}
              className="text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subcategory})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time KPI Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              Visualizações
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1">428</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              Cliques no WhatsApp
            </span>
            <span className="text-xl font-bold text-slate-900 block mt-1">64</span>
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
                (acc, q) => acc + q.proposals.filter((p) => p.businessId === currentBiz.id).length,
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Oportunidades de Venda na Categoria "{currentBiz.subcategory}"
              </h3>
              <p className="text-xs text-slate-500">
                Clientes em {currentBiz.city} que solicitaram orçamentos recentemente
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {relevantQuotes.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
                <p className="text-xs text-slate-500">Nenhum novo orçamento aguardando nesta categoria no momento.</p>
              </div>
            ) : (
              relevantQuotes.map((q) => {
                const alreadySent = q.proposals.some((p) => p.businessId === currentBiz.id);
                const myProposal = q.proposals.find((p) => p.businessId === currentBiz.id);

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                          LEAD REGIONAL • {q.neighborhood}
                        </span>
                        <h4 className="font-bold text-base text-slate-900 mt-1">{q.title}</h4>
                      </div>

                      {alreadySent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Proposta Enviada (R$ {myProposal?.price.toFixed(2)})
                        </span>
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
                        {q.proposals.length} empresas concorrendo neste pedido
                      </span>

                      {!alreadySent ? (
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
                          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                        >
                          Ver Comparativo de Propostas
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
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
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

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition"
            >
              Publicar Oferta no App
            </button>
          </form>
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
                disabled={currentBiz.planTier === 'free'}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                {currentBiz.planTier === 'free' ? 'Plano Atual' : 'Migrar'}
              </button>
            </div>

            {/* Pró */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl relative border border-slate-800">
              <div className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase">
                Mais Popular
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Plano Pró</span>
                <h4 className="text-2xl font-bold">R$ 59,90 <span className="text-xs text-slate-400 font-normal">/mês</span></h4>
                <p className="text-xs text-slate-300">Para profissionais e oficinas em crescimento</p>
                <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                  <li>✓ Propostas ilimitadas para orçamentos</li>
                  <li>✓ Notificações instantâneas de novos leads</li>
                  <li>✓ Até 5 ofertas ativas simultâneas</li>
                  <li>✓ Selo de Empresa Verificada</li>
                </ul>
              </div>
              <button
                disabled={currentBiz.planTier === 'pro'}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20"
              >
                {currentBiz.planTier === 'pro' ? 'Plano Atual Ativo' : 'Assinar Plano Pró'}
              </button>
            </div>

            {/* Premium / Destaque */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold uppercase">
                  <Crown className="w-4 h-4 text-emerald-600" />
                  <span>Plano Destaque Premium</span>
                </div>
                <h4 className="text-2xl font-bold text-slate-900">R$ 119,90 <span className="text-xs text-slate-400 font-normal">/mês</span></h4>
                <p className="text-xs text-slate-500">Liderança absoluta na sua categoria e região</p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li>✓ Posição nº 1 no topo das buscas</li>
                  <li>✓ Destaque na tela inicial do app</li>
                  <li>✓ Leads prioritários imediatos</li>
                  <li>✓ Ofertas ilimitadas</li>
                  <li>✓ Suporte VIP dedicado</li>
                </ul>
              </div>
              <button
                disabled={currentBiz.planTier === 'premium'}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                {currentBiz.planTier === 'premium' ? 'Plano Atual Ativo' : 'Quero Ser Destaque'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
