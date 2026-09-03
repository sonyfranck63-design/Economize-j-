import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Star,
  MapPin,
  Clock,
  MessageCircle,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Award,
  ArrowRight,
} from 'lucide-react';

export const CompareQuotesModal: React.FC = () => {
  const {
    comparingQuoteRequestId,
    setComparingQuoteRequestId,
    quoteRequests,
    acceptProposal,
    setSelectedBusinessId,
    setActiveChatBusinessId,
  } = useApp();

  if (!comparingQuoteRequestId) return null;

  const quote = quoteRequests.find((q) => q.id === comparingQuoteRequestId);

  if (!quote) return null;

  // Sort proposals by price (lowest price first) for smart comparison
  const sortedProposals = [...quote.proposals].sort((a, b) => a.price - b.price);
  const lowestPrice = sortedProposals.length > 0 ? sortedProposals[0].price : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md">
                COMPARE AS OPÇÕES
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {quote.neighborhood}, {quote.city}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{quote.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{quote.description}</p>
          </div>
          <button
            onClick={() => setComparingQuoteRequestId(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Proposals Comparison Grid */}
        <div className="mt-6 space-y-4">
          {sortedProposals.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-slate-500 text-sm font-medium">
                Sua solicitação está aberta. As empresas de {quote.city} estão analisando seu pedido para enviar as propostas.
              </p>
              <p className="text-xs text-slate-400">Você receberá uma notificação assim que o primeiro orçamento for registrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProposals.map((prop, idx) => {
                const isBestPrice = prop.price === lowestPrice;
                const isAccepted = prop.status === 'escolhida';

                return (
                  <div
                    key={prop.id}
                    className={`rounded-2xl border p-5 transition flex flex-col justify-between space-y-4 relative ${
                      isAccepted
                        ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                        : isBestPrice
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-sm'
                        : 'border-slate-100 bg-white shadow-sm'
                    }`}
                  >
                    {/* Badge */}
                    <div className="flex items-center justify-between">
                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          PROPOSTA ESCOLHIDA
                        </span>
                      ) : isBestPrice ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-slate-900 text-white px-2 py-0.5 rounded-md">
                          <Award className="w-3 h-3 text-emerald-400" />
                          MELHOR PREÇO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          Opção {idx + 1}
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(prop.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Company Info */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{prop.businessName}</h4>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {prop.businessRating} <span className="text-slate-400 font-normal">({prop.businessReviewCount})</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          ~{prop.businessDistanceKm} km de você
                        </span>
                      </div>
                    </div>

                    {/* Proposal Description & Details */}
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                      <p className="text-slate-700 leading-relaxed font-medium">{prop.description}</p>
                      
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Prazo: {prop.deadlineText}</span>
                      </div>
                    </div>

                    {/* Price Tag */}
                    <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Valor Total da Proposta</span>
                        <span className="text-2xl font-bold text-slate-900">
                          R$ {prop.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: VER PROPOSTA / FALAR COM EMPRESA / ESCOLHER */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => setSelectedBusinessId(prop.businessId)}
                        className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition text-center"
                        title="Ver Perfil Completo"
                      >
                        Ver Perfil
                      </button>

                      <a
                        href={`https://wa.me/${prop.businessWhatsapp}?text=${encodeURIComponent(`Olá! Vi sua proposta de R$ ${prop.price.toFixed(2)} para o orçamento "${quote.title}" no EconomizaJá e gostaria de conversar.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center justify-center gap-1 text-center shadow-xs"
                        title="Falar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        disabled={isAccepted}
                        onClick={() => acceptProposal(quote.id, prop.id)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold transition text-center ${
                          isAccepted
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95'
                        }`}
                      >
                        {isAccepted ? 'Escolhida' : 'ESCOLHER'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
