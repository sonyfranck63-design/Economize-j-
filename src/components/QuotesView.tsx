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
} from 'lucide-react';
import { QuoteRequest } from '../types';

type TabFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const QuotesView: React.FC = () => {
  const {
    quoteRequests,
    setComparingQuoteRequestId,
    setIsQuoteModalOpen,
    cancelQuoteRequest,
    deleteQuoteRequest,
    currentUser,
    setPublicRoute,
  } = useApp();

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

  // Contadores para as abas
  const totalCount = quoteRequests.length;
  const activeCount = quoteRequests.filter(
    (qr) => qr.status === 'aberto' || qr.status === 'propostas_recebidas'
  ).length;
  const completedCount = quoteRequests.filter(
    (qr) => qr.status === 'escolhido' || qr.status === 'finalizado'
  ).length;
  const cancelledCount = quoteRequests.filter((qr) => qr.status === 'cancelado').length;

  // Filtragem
  const filteredQuotes = quoteRequests.filter((qr) => {
    if (activeTab === 'active') return qr.status === 'aberto' || qr.status === 'propostas_recebidas';
    if (activeTab === 'completed') return qr.status === 'escolhido' || qr.status === 'finalizado';
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
    <div className="space-y-6 pb-12">
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
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm space-y-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'all'
                ? 'Você ainda não tem nenhum orçamento no histórico'
                : activeTab === 'active'
                ? 'Nenhum orçamento em andamento no momento'
                : activeTab === 'completed'
                ? 'Nenhum orçamento concluído ou com proposta escolhida'
                : 'Nenhum orçamento encerrado'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Precisa trocar pneus, fazer reformas, consertar celular ou outro serviço? Peça orçamentos sem compromisso.
            </p>
            <button
              onClick={() => setIsQuoteModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-sm hover:bg-slate-800 transition"
            >
              Pedir Meu Primeiro Orçamento
            </button>
          </div>
        ) : (
          filteredQuotes.map((qr) => {
            const proposals = qr.proposals || [];
            const hasProposals = proposals.length > 0;
            const isCancelled = qr.status === 'cancelado';
            const isChosen = qr.status === 'escolhido' || qr.status === 'finalizado';

            return (
              <div
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
              </div>
            );
          })
        )}
      </div>

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
  );
};

