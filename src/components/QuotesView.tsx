import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { triggerCelebrationFireworks } from '../utils/confetti';
import {
  PlusCircle,
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Trash2,
  Ban,
  AlertTriangle,
  X,
  Sparkles,
  SlidersHorizontal,
  Building2,
  MessageCircle,
} from 'lucide-react';
import { QuoteRequest } from '../types';
import { buildWhatsAppLink } from '../utils/whatsappUtils';
import { motion, AnimatePresence } from 'motion/react';
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '../utils/motionVariants';
import { QuoteCardSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { PullToRefresh } from './PullToRefresh';

type TabFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const QuotesView: React.FC = () => {
  const {
    quoteRequests,
    businesses,
    setComparingQuoteRequestId,
    setIsQuoteModalOpen,
    cancelQuoteRequest,
    deleteQuoteRequest,
    currentUser,
    setPublicRoute,
    setActiveTab: setNavTab,
    isLoadingData,
    refreshQuoteRequests,
  } = useApp();

  const [viewMode, setViewMode] = useState<'customer' | 'business'>('customer');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [quoteToCancel, setQuoteToCancel] = useState<QuoteRequest | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fechar modais ao apertar Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isProcessing) {
          setQuoteToCancel(null);
          setQuoteToDelete(null);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isProcessing]);

  // Empresas do usuário logado
  const userBusinesses = currentUser?.id
    ? businesses.filter((b) => (b.ownerId || '').toLowerCase() === (currentUser.id || '').toLowerCase())
    : [];

  // Orçamentos onde as empresas do usuário participam
  const businessQuotes = quoteRequests.filter((qr) => {
    const hasMyProposal = qr.proposals.some((p) =>
      userBusinesses.some((b) => (b.id || '').toLowerCase() === (p.businessId || '').toLowerCase())
    );
    const isTargeted = userBusinesses.some(
      (b) => (b.id || '').toLowerCase() === (qr.targetBusinessId || '').toLowerCase()
    );
    return hasMyProposal || isTargeted;
  });

  const wonBusinessQuotes = businessQuotes.filter((qr) => {
    return qr.proposals.some(
      (p) =>
        userBusinesses.some((b) => (b.id || '').toLowerCase() === (p.businessId || '').toLowerCase()) &&
        (p.status === 'escolhida' || (qr.status === 'escolhido' && p.status !== 'recusada'))
    );
  });

  // Filtra as cotações pessoais do solicitante (o Admin não herda cotações alheias como pessoais)
  const myQuotes = currentUser?.id
    ? quoteRequests.filter((qr) => qr.userId === currentUser.id)
    : quoteRequests;

  // Contadores para as abas baseadas nas cotações pessoais
  const totalCount = myQuotes.length;
  const activeCount = myQuotes.filter(
    (qr) => qr.status === 'aberto' || qr.status === 'propostas_recebidas'
  ).length;
  const completedCount = myQuotes.filter(
    (qr) => qr.status === 'escolhido' || qr.status === 'escolhida' || qr.status === 'finalizado'
  ).length;
  const cancelledCount = myQuotes.filter((qr) => qr.status === 'cancelado').length;

  // Filtragem
  const filteredQuotes = myQuotes.filter((qr) => {
    if (activeTab === 'active') return qr.status === 'aberto' || qr.status === 'propostas_recebidas';
    if (activeTab === 'completed') return qr.status === 'escolhido' || qr.status === 'escolhida' || qr.status === 'finalizado';
    if (activeTab === 'cancelled') return qr.status === 'cancelado';
    return true;
  });

  const handleConfirmCancel = async () => {
    if (!quoteToCancel) return;
    setIsProcessing(true);
    try {
      await cancelQuoteRequest(quoteToCancel.id);
      setQuoteToCancel(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao encerrar a solicitação de orçamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!quoteToDelete) return;
    setIsProcessing(true);
    try {
      await deleteQuoteRequest(quoteToDelete.id);
      setQuoteToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir a solicitação de orçamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PullToRefresh onRefresh={refreshQuoteRequests}>
      <div className="space-y-6 pb-12">
        {/* Banner de Supervisão para o Administrador */}
      {currentUser?.role === 'admin' && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  Supervisão de Administrador
                </span>
                <span className="text-xs text-slate-400">Visão de Consumidor Ativa</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Esta tela exibe apenas seus orçamentos pessoais solicitados como cliente. Para auditar todas as solicitações e propostas da plataforma, utilize o Painel Admin.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNavTab('admin_portal')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shrink-0 active:scale-95 shadow-sm"
          >
            Abrir Painel Admin
          </button>
        </div>
      )}

      {/* Seletor de Perfil: Consumidor vs Minha Empresa (se possuir empresa cadastrada) */}
      {userBusinesses.length > 0 && (
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('customer')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'customer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Meus Pedidos (Consumidor)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              viewMode === 'customer' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {myQuotes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('business')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'business'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Serviços da Minha Empresa</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              viewMode === 'business' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {wonBusinessQuotes.length > 0 ? `${wonBusinessQuotes.length} ganho(s)` : businessQuotes.length}
            </span>
          </button>
        </div>
      )}

      {/* VISÃO DA EMPRESA PARCEIRA */}
      {viewMode === 'business' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                  Painel Rápido do Parceiro
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {userBusinesses.map(b => b.name).join(', ')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Orçamentos Vinculados à Sua Empresa</h3>
              <p className="text-xs text-slate-500">
                Abaixo estão as propostas enviadas pela sua empresa e os serviços onde você foi contratado pelo cliente.
              </p>
            </div>

            <button
              onClick={() => setNavTab('business_portal')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Abrir Painel do Parceiro</span>
            </button>
          </div>

          {/* Lista de cotações da empresa */}
          {isLoadingData ? (
            <div className="space-y-4">
              <QuoteCardSkeleton />
              <QuoteCardSkeleton />
            </div>
          ) : businessQuotes.length === 0 ? (
            <EmptyState
              icon={Building2}
              badge="Painel do Parceiro"
              title="Nenhum orçamento em andamento para sua empresa"
              description="Acesse o Painel do Parceiro para ver novas oportunidades na sua região e enviar propostas comerciais."
              action={{
                label: 'Buscar Oportunidades no Painel',
                onClick: () => setNavTab('business_portal'),
                icon: Building2,
              }}
            />
          ) : (
            <motion.div
              variants={staggerContainerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {businessQuotes.map((q) => {
                const myProposal = q.proposals.find((p) =>
                  userBusinesses.some((b) => (b.id || '').toLowerCase() === (p.businessId || '').toLowerCase())
                );
                const isWon = Boolean(
                  myProposal &&
                    (myProposal.status === 'escolhida' ||
                      (q.status === 'escolhido' && (q.proposals.length === 1 || myProposal.status !== 'recusada')))
                );
                const hasPhone = Boolean(q.userPhone && !q.userPhone.includes('****'));

                return (
                  <motion.div
                    variants={staggerItemVariants}
                    key={q.id}
                    className={`bg-white rounded-2xl p-5 shadow-xs transition space-y-3 ${
                      isWon
                        ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/5'
                        : 'border border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isWon ? (
                            <span className="text-[10px] font-extrabold uppercase text-white bg-emerald-600 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              🎉 Proposta Aceita • R$ {myProposal?.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Proposta Enviada • R$ {myProposal?.price.toFixed(2)}
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {q.city} - {q.neighborhood}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">{q.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{q.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block font-medium">Cliente</span>
                        <span className="text-xs font-bold text-slate-700">{q.userName}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Prazo solicitado: {q.desiredDeadline || 'A combinar'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isWon && hasPhone && (
                          <a
                            href={buildWhatsAppLink(q.userPhone, `Olá ${q.userName}! Sua proposta para "${q.title}" foi aprovada no EconomizaJá.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Chamar Cliente no WhatsApp</span>
                          </a>
                        )}

                        <button
                          onClick={() => setComparingQuoteRequestId(q.id)}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                        >
                          Ver Detalhes do Pedido
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      ) : (
        /* VISÃO DO CONSUMIDOR (PADRÃO) */
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Minhas Solicitações de Orçamento</h2>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhe propostas recebidas de oficinas, profissionais e lojas. Você tem controle total para encerrar ou excluir suas cotações a qualquer momento.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentUser && (
                <button
                  onClick={() => setPublicRoute('delete_account')}
                  className="px-3.5 py-3 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-500 hover:text-rose-700 font-semibold text-xs transition flex items-center gap-1.5"
                  title="Solicitar eliminação dos meus dados e cadastro (LGPD Art. 18)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                  <span className="hidden sm:inline">Excluir Conta</span>
                </button>
              )}

              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>PEDIR NOVO ORÇAMENTO</span>
              </button>
            </div>
          </div>

          {/* Tabs / Filtros */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Todos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {totalCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                  activeTab === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Em Aberto</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'active' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {activeCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                  activeTab === 'completed'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Concluídos / Escolhidos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'completed' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'}`}>
                  {completedCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('cancelled')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                  activeTab === 'cancelled'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Encerrados</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'cancelled' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {cancelledCount}
                </span>
              </button>
            </div>
          )}

          {/* List */}
          {isLoadingData ? (
            <div className="space-y-4">
              <QuoteCardSkeleton />
              <QuoteCardSkeleton />
              <QuoteCardSkeleton />
            </div>
          ) : (
            <motion.div
              variants={staggerContainerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
          {filteredQuotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              badge="Cotações Rápidas"
              title={
                activeTab === 'all'
                  ? 'Você ainda não pediu nenhum orçamento'
                  : activeTab === 'active'
                  ? 'Nenhum orçamento em andamento no momento'
                  : activeTab === 'completed'
                  ? 'Nenhum orçamento concluído ou com proposta escolhida'
                  : 'Nenhum orçamento encerrado'
              }
              description="Precisa trocar pneus, fazer reformas, consertar celular ou outro serviço? Peça orçamentos sem compromisso e receba propostas das melhores empresas locais."
              action={{
                label: 'Pedir Meu Primeiro Orçamento',
                onClick: () => setIsQuoteModalOpen(true),
                icon: PlusCircle,
              }}
            />
          ) : (
          filteredQuotes.map((qr) => {
            const proposals = qr.proposals || [];
            const hasProposals = proposals.length > 0;
            const isCancelled = qr.status === 'cancelado';
            const isChosen = qr.status === 'escolhido' || qr.status === 'finalizado';

            return (
              <motion.div
                variants={staggerItemVariants}
                key={qr.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition space-y-4 ${
                  isCancelled
                    ? 'border-slate-200 bg-slate-50/60 opacity-90'
                    : isChosen
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className={`border-l-4 pl-3 ${isCancelled ? 'border-slate-400' : isChosen ? 'border-emerald-600' : 'border-emerald-500'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        isCancelled
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {qr.categoryId}
                      </span>
                      <span className="text-xs text-slate-400">
                        {isNaN(Date.parse(qr.createdAt)) ? qr.createdAt : new Date(qr.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold mt-1 ${isCancelled ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-900'}`}>
                      {qr.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCancelled ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-200/80 px-3 py-1 rounded-full border border-slate-300">
                        <Ban className="w-3.5 h-3.5 text-slate-500" />
                        Encerrado pelo Cliente
                      </span>
                    ) : isChosen ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerCelebrationFireworks();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-full border border-emerald-300 transition cursor-pointer shadow-xs active:scale-95"
                        title="Proposta escolhida! Clique para soltar fogos de comemoração 🎉"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        <span>Proposta Escolhida 🎉</span>
                      </button>
                    ) : hasProposals ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        {proposals.length} {proposals.length === 1 ? 'Proposta Recebida' : 'Propostas Recebidas'}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Aguardando Propostas
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{qr.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Local: {qr.neighborhood}, {qr.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Prazo desejado: {qr.desiredDeadline}</span>
                  </div>
                  {qr.budgetRange && (
                    <div>
                      <span>Faixa estimada: <strong className="text-slate-700">{qr.budgetRange}</strong></span>
                    </div>
                  )}
                </div>

                {isCancelled && (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Este pedido foi encerrado. As empresas parceiras não podem mais enviar propostas comerciais para esta solicitação.
                    </span>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {isCancelled ? (
                      <span className="text-slate-500 italic">
                        {hasProposals ? `${proposals.length} propostas arquivadas no histórico` : 'Encerrado sem propostas aceitas'}
                      </span>
                    ) : proposals.length === 0 ? (
                      <span className="text-amber-700 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Notificando empresas da sua região...
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Valores a partir de R$ {Math.min(...proposals.map((p) => p.price)).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                    {/* Botão Encerrar Pedido (se ativo) */}
                    {!isCancelled && (
                      <button
                        onClick={() => setQuoteToCancel(qr)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition flex items-center gap-1.5"
                        title="Encerrar pedido para não receber mais propostas nem mensagens"
                      >
                        <Ban className="w-3.5 h-3.5 text-slate-500" />
                        <span>Encerrar Pedido</span>
                      </button>
                    )}

                    {/* Botão Excluir Pedido (sempre disponível com confirmação) */}
                    <button
                      onClick={() => setQuoteToDelete(qr)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition flex items-center gap-1"
                      title="Excluir definitivamente do seu histórico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>

                    {/* Botão Principal de Ver / Comparar Opções */}
                    <button
                      onClick={() => setComparingQuoteRequestId(qr.id)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <span>{hasProposals ? 'COMPARE AS OPÇÕES' : 'DETALHES DO PEDIDO'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
      )}
    </>
  )}

      {/* MODAL DE CONFIRMAÇÃO: ENCERRAR PEDIDO */}
      {quoteToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          {/* Overlay Click */}
          <div className="absolute inset-0" onClick={() => !isProcessing && setQuoteToCancel(null)} />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Ban className="w-5 h-5" />
                </div>
                <h3 className="text-base">Deseja encerrar este pedido?</h3>
              </div>
              <button
                onClick={() => !isProcessing && setQuoteToCancel(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Você está encerrando o pedido: <strong>"{quoteToCancel.title}"</strong>.
              </p>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
                <strong className="block text-emerald-900 font-bold">O que acontece ao encerrar:</strong>
                <ul className="list-disc pl-4 space-y-1 text-emerald-900">
                  <li>As empresas parceiras serão avisadas de que o serviço não necessita mais de propostas.</li>
                  <li>Você <strong>para de receber contatos ou mensagens no WhatsApp</strong> sobre este pedido.</li>
                  <li>O histórico e as propostas já enviadas continuarão arquivados para sua consulta.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setQuoteToCancel(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Manter em Aberto
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Encerrando...' : 'Sim, Encerrar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR PEDIDO */}
      {quoteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          {/* Overlay Click */}
          <div className="absolute inset-0" onClick={() => !isProcessing && setQuoteToDelete(null)} />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base text-slate-900">Excluir solicitação de orçamento?</h3>
              </div>
              <button
                onClick={() => !isProcessing && setQuoteToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Você está prestes a excluir definitivamente o pedido: <strong>"{quoteToDelete.title}"</strong>.
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <strong>Atenção:</strong> Esta ação é irreversível. O pedido e todas as {quoteToDelete.proposals?.length || 0} proposta(s) comerciais vinculadas serão apagadas permanentemente do seu histórico.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setQuoteToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Excluindo...' : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
};

