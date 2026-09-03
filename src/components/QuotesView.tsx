import React from 'react';
import { useApp } from '../context/AppContext';
import { PlusCircle, FileText, ArrowRight, CheckCircle2, Clock, MapPin } from 'lucide-react';

export const QuotesView: React.FC = () => {
  const { quoteRequests, setComparingQuoteRequestId, setIsQuoteModalOpen } = useApp();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Minhas Solicitações de Orçamento</h2>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe propostas recebidas de oficinas, profissionais e lojas para comparar e escolher a melhor oferta.
          </p>
        </div>

        <button
          onClick={() => setIsQuoteModalOpen(true)}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>PEDIR NOVO ORÇAMENTO</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {quoteRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm space-y-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Você ainda não tem nenhum orçamento em andamento</h3>
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
          quoteRequests.map((qr) => {
            const hasProposals = qr.proposals.length > 0;
            return (
              <div
                key={qr.id}
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="border-l-4 border-emerald-500 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        {qr.categoryId}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(qr.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{qr.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {qr.status === 'escolhido' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Finalizado / Escolhido
                      </span>
                    ) : hasProposals ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        {qr.proposals.length} {qr.proposals.length === 1 ? 'Proposta Recebida' : 'Propostas Recebidas'}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Aguardando Propostas
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-600">{qr.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Local: {qr.neighborhood}, {qr.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Prazo: {qr.desiredDeadline}</span>
                  </div>
                  {qr.budgetRange && (
                    <div>
                      <span>Preço estimado: <strong className="text-slate-700">{qr.budgetRange}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {qr.proposals.length === 0
                      ? 'Notificando empresas da sua região...'
                      : `Valores a partir de R$ ${Math.min(...qr.proposals.map((p) => p.price)).toFixed(2)}`}
                  </span>

                  <button
                    onClick={() => setComparingQuoteRequestId(qr.id)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <span>COMPARE AS OPÇÕES</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
