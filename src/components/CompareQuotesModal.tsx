import React from 'react';
import { useApp } from '../context/AppContext';
import { triggerCelebrationFireworks } from '../utils/confetti';
import { isCategoryMatch, isLocationMatch } from '../utils/quoteStorage';
import { formatWhatsAppNumber, buildWhatsAppLink } from '../utils/whatsappUtils';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalContentVariants } from '../utils/motionVariants';
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
  Send,
  PlusCircle,
  Building2,
  AlertCircle,
  Trash2,
  Ban,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const CompareQuotesModal: React.FC = () => {
  const {
    comparingQuoteRequestId,
    setComparingQuoteRequestId,
    quoteRequests,
    acceptProposal,
    cancelQuoteRequest,
    deleteQuoteRequest,
    setSelectedBusinessId,
    setActiveChatBusinessId,
    currentUser,
    businesses,
    submitProposal,
    setIsAuthModalOpen,
    setUserRole,
  } = useApp();

  const [activeProposalForm, setActiveProposalForm] = React.useState(false);
  const [proposalPrice, setProposalPrice] = React.useState('');
  const [proposalDeadline, setProposalDeadline] = React.useState('Atendimento em até 3 dias úteis');
  const [proposalDescription, setProposalDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);

  // Fechar modal com Escape para acessibilidade
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setComparingQuoteRequestId(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setComparingQuoteRequestId]);

  const quote = comparingQuoteRequestId ? quoteRequests.find((q) => q.id === comparingQuoteRequestId) : null;

  // Identifica empresas pertencentes exclusivamente ao usuário logado (o admin supervisiona, não se passa por parceiro)
  const userBusinesses = currentUser?.id
    ? businesses.filter((b) => (b.ownerId || '').toLowerCase() === currentUser.id.toLowerCase())
    : [];

  // Empresas que atendem à categoria do orçamento (com matching flexível e inteligente)
  const myRelevantBusinesses = quote
    ? userBusinesses.filter((b) => isCategoryMatch(b.categoryId, quote.categoryId))
    : [];

  const hasRelevantBusiness = myRelevantBusinesses.length > 0;

  // Check if any business belonging to currentUser submitted a proposal
  const myProposal = quote
    ? quote.proposals.find(
        (p) =>
          myRelevantBusinesses.some((mb) => mb.id === p.businessId) ||
          businesses.some((b) => b.id === p.businessId && b.ownerId === currentUser?.id)
      )
    : undefined;

  const alreadyResponded = Boolean(myProposal);

  const isQuoteChosen = Boolean(
    quote &&
      (quote.status === 'escolhido' ||
        quote.status === 'finalizado' ||
        quote.proposals.some((p) => p.status === 'escolhida'))
  );

  // Partner's proposal is considered accepted if marked as 'escolhida' or if the quote is chosen and it's the sole proposal or marked
  const isMyProposalAccepted = Boolean(
    myProposal &&
      (myProposal.status === 'escolhida' ||
        (isQuoteChosen && (quote?.proposals.length === 1 || myProposal.status !== 'recusada')))
  );

  // Clean WhatsApp numbers com DDI 55
  const cleanClientWhatsapp = quote ? formatWhatsAppNumber(quote.userPhone) : '';

  // Sort proposals by price (lowest price first) for smart comparison
  const sortedProposals = quote ? [...quote.proposals].sort((a, b) => a.price - b.price) : [];
  const lowestPrice = sortedProposals.length > 0 ? sortedProposals[0].price : 0;
  const highestPrice = sortedProposals.length > 0 ? sortedProposals[sortedProposals.length - 1].price : 0;
  const maxSavings = highestPrice - lowestPrice;
  const hasMultipleQuotes = sortedProposals.length > 1 && maxSavings > 0;

  return (
    <AnimatePresence>
      {Boolean(comparingQuoteRequestId && quote) && (
        <motion.div
          key="compare-quotes-backdrop"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="fixed inset-0" onClick={() => setComparingQuoteRequestId(null)} />
          <motion.div
            key="compare-quotes-modal"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 overflow-hidden"
          >
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-md ${
                quote.status === 'cancelado'
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {quote.status === 'cancelado' ? 'PEDIDO ENCERRADO' : 'COMPARE AS OPÇÕES'}
              </span>
              {currentUser?.role === 'admin' && currentUser?.id !== quote.userId && (
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Supervisão Administrativa
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                {quote.neighborhood}, {quote.city}
              </span>
            </div>
            <h3 className={`text-xl font-bold mt-1 ${quote.status === 'cancelado' ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
              {quote.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{quote.description}</p>
            {hasMultipleQuotes && quote.status !== 'cancelado' && (
              <p className="text-xs font-semibold text-emerald-600 mt-2">
                💰 Diferença de até R$ {maxSavings.toFixed(2).replace('.', ',')} entre as propostas!
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-start">
            {/* Opções para o dono do pedido ou admin */}
            {(currentUser?.id === quote.userId || currentUser?.role === 'admin') && (
              <div className="flex items-center gap-1.5 mr-2">
                {quote.status !== 'cancelado' && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition flex items-center gap-1"
                    title="Encerrar pedido para não receber mais propostas"
                  >
                    <Ban className="w-3.5 h-3.5 text-slate-500" />
                    <span>Encerrar</span>
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition flex items-center gap-1"
                  title="Excluir pedido definitivamente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setComparingQuoteRequestId(null)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner informativo se o pedido foi encerrado */}
        {quote.status === 'cancelado' && (
          <div className="my-4 p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs text-slate-700">
            <div className="p-2 bg-slate-200 rounded-xl text-slate-600 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <strong className="font-bold text-slate-900 block text-sm">Esta solicitação foi encerrada pelo solicitante</strong>
              <p className="text-slate-600 mt-0.5">
                O cliente já atendeu sua necessidade ou optou por encerrar a cotação. O recebimento de novas propostas foi finalizado.
              </p>
            </div>
          </div>
        )}

        {/* Partner Proposal Section - Only for businesses matching the quote (Admin não envia propostas como parceiro) */}
        {hasRelevantBusiness && currentUser?.role !== 'admin' && !alreadyResponded && quote.status !== 'cancelado' && (
          <div className="mb-6 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
            {!activeProposalForm ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Seja o primeiro a enviar uma proposta!</h4>
                    <p className="text-xs text-slate-600">
                      Sua empresa <strong>{myRelevantBusinesses[0]?.name}</strong> está apta a atender este cliente.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveProposalForm(true)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition flex items-center gap-2 active:scale-95 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ENVIAR PROPOSTA AGORA</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Preencher Detalhes da Proposta
                  </h4>
                  <button onClick={() => setActiveProposalForm(false)} className="text-emerald-600 hover:text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    Cancelar
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={proposalPrice}
                      onChange={(e) => setProposalPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800 shadow-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Prazo de Execução</label>
                    <input
                      type="text"
                      value={proposalDeadline}
                      onChange={(e) => setProposalDeadline(e.target.value)}
                      placeholder="Ex: 2 dias úteis"
                      className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800 shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descrição e Observações</label>
                  <textarea
                    rows={2}
                    value={proposalDescription}
                    onChange={(e) => setProposalDescription(e.target.value)}
                    placeholder="Detalhe o que está incluso no seu serviço..."
                    className="w-full px-4 py-2 rounded-xl border border-emerald-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800 shadow-xs"
                  />
                </div>

                <button
                  disabled={isSubmitting || !proposalPrice}
                  onClick={async () => {
                    if (!proposalPrice) return;
                    setIsSubmitting(true);
                    try {
                      // Usar a primeira empresa compatível encontrada
                      const biz = myRelevantBusinesses[0];
                      await submitProposal(quote.id, {
                        businessId: biz.id,
                        businessName: biz.name,
                        businessRating: biz.rating,
                        businessReviewCount: biz.reviewCount,
                        businessDistanceKm: biz.distanceKm,
                        businessWhatsapp: biz.whatsapp,
                        price: parseFloat(proposalPrice),
                        deadlineText: proposalDeadline,
                        description: proposalDescription,
                        quoteRequestId: quote.id,
                      });
                      setActiveProposalForm(false);
                    } catch (err: any) {
                      alert(err.message || "Erro ao enviar proposta.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? 'ENVIANDO...' : 'CONFIRMAR E ENVIAR PROPOSTA'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Se o usuário for empresa mas não possuir negócio no segmento desta cotação */}
        {currentUser?.role === 'business' && !hasRelevantBusiness && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Esta cotação é de outro segmento</h4>
              <p className="text-[11px] text-slate-500">
                Esta solicitação é para a categoria <strong>{quote.categoryId}</strong>. Suas empresas cadastradas atendem a outras categorias.
              </p>
            </div>
          </div>
        )}

        {/* If user's proposal was accepted or already responded */}
        {isMyProposalAccepted ? (
          <div className="mb-6 p-5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 text-white shadow-inner">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white text-emerald-800 px-2.5 py-0.5 rounded-full shadow-xs">
                    🎉 Proposta Escolhida!
                  </span>
                  <span className="text-xs text-emerald-100 font-medium">Contratado pelo cliente</span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">
                  Parabéns! O cliente aceitou a sua proposta de R$ {myProposal?.price.toFixed(2)}
                </h4>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Inicie o contato pelo WhatsApp abaixo para combinar o dia, horário e detalhes da execução do serviço.
                </p>
              </div>
            </div>
            {cleanClientWhatsapp && (
              <a
                href={buildWhatsAppLink(
                  cleanClientWhatsapp,
                  `Olá ${quote.userName || ''}! Sou da empresa ${myProposal?.businessName}. Vi que você aceitou minha proposta de R$ ${myProposal?.price.toFixed(2)} para o pedido "${quote.title}" no EconomizaJá! Gostaria de combinar a data e horário para o atendimento.`
                )}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition flex items-center gap-2 shadow-md shrink-0 active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Conversar no WhatsApp</span>
              </a>
            )}
          </div>
        ) : alreadyResponded ? (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-bold">Você já enviou uma proposta para este pedido!</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">
              {isQuoteChosen ? 'Orçamento Definido' : 'Aguardando decisão do cliente'}
            </span>
          </div>
        ) : null}

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
                const isAccepted =
                  prop.status === 'escolhida' ||
                  (isQuoteChosen && (sortedProposals.length === 1 || prop.status === 'escolhida'));
                const isMyProposal =
                  myRelevantBusinesses.some((mb) => mb.id === prop.businessId) ||
                  businesses.some((b) => b.id === prop.businessId && b.ownerId === currentUser?.id);
                
                const cleanBizWhatsapp = formatWhatsAppNumber(prop.businessWhatsapp);

                const isValidDate = prop.createdAt && !isNaN(new Date(prop.createdAt).getTime());
                const formattedDate = isValidDate
                  ? new Date(prop.createdAt).toLocaleDateString('pt-BR')
                  : 'Recente';

                return (
                  <div
                    key={prop.id}
                    className={`rounded-2xl border p-5 transition flex flex-col justify-between space-y-4 relative ${
                      isAccepted
                        ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                        : isBestPrice
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-sm'
                        : 'border-slate-100 bg-white shadow-sm'
                    }`}
                  >
                    {/* Badge */}
                    <div className="flex items-center justify-between">
                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
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
                        {formattedDate}
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

                      {/* WhatsApp Button adaptativo */}
                      {isMyProposal ? (
                        cleanClientWhatsapp ? (
                          <a
                            href={buildWhatsAppLink(
                              cleanClientWhatsapp,
                              isAccepted
                                ? `Olá ${quote.userName || ''}! Sou da empresa ${prop.businessName}. Vi que você aceitou nossa proposta de R$ ${prop.price.toFixed(2)} para o seu pedido "${quote.title}" no EconomizaJá! Gostaria de combinar a data e detalhes para o atendimento.`
                                : `Olá ${quote.userName || ''}! Sou da empresa ${prop.businessName}. Enviei uma proposta de R$ ${prop.price.toFixed(2)} para o seu pedido "${quote.title}" no EconomizaJá e estou à disposição para conversar.`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 text-center shadow-xs"
                            title="Falar com o cliente solicitante via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp Cliente</span>
                          </a>
                        ) : (
                          <div
                            className="py-2.5 px-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1 text-center cursor-default"
                            title="Esta é a sua proposta enviada ao cliente"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Sua Proposta</span>
                          </div>
                        )
                      ) : (
                        <a
                          href={buildWhatsAppLink(
                            cleanBizWhatsapp,
                            isAccepted
                              ? `Olá! Aceitei sua proposta de R$ ${prop.price.toFixed(2)} para o orçamento "${quote.title}" no EconomizaJá e gostaria de combinar o atendimento!`
                              : `Olá! Vi sua proposta de R$ ${prop.price.toFixed(2)} para o orçamento "${quote.title}" no EconomizaJá e gostaria de conversar.`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center justify-center gap-1 text-center shadow-xs"
                          title="Falar com a empresa via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {/* Ação exclusiva do Consumidor Solicitante do Orçamento */}
                      {currentUser?.id === quote.userId && (
                        <button
                          disabled={quote.status === 'cancelado' || isProcessingAction}
                          onClick={async () => {
                            if (isAccepted) {
                              // Se já foi escolhida, permite soltar os fogos de comemoração novamente!
                              triggerCelebrationFireworks();
                              return;
                            }
                            setIsProcessingAction(true);
                            try {
                              await acceptProposal(quote.id, prop.id);
                              triggerCelebrationFireworks();
                            } catch (err: any) {
                              alert(err.message || 'Erro ao escolher proposta comercial.');
                            } finally {
                              setIsProcessingAction(false);
                            }
                          }}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition text-center ${
                            isAccepted
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95'
                              : quote.status === 'cancelado' || isProcessingAction
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95 cursor-pointer'
                          }`}
                          title={isAccepted ? "Proposta escolhida! Clique para soltar fogos de comemoração 🎉" : "Escolher esta proposta"}
                        >
                          {isProcessingAction ? (
                            'Processando...'
                          ) : isAccepted ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                              <span>Escolhida 🎉</span>
                            </>
                          ) : quote.status === 'cancelado' ? (
                            'Encerrado'
                          ) : (
                            'ESCOLHER'
                          )}
                        </button>
                      )}

                      {/* Visualização para o Administrador (Supervisão neutra, sem se passar por consumidor nem parceiro) */}
                      {currentUser?.role === 'admin' && currentUser?.id !== quote.userId && (
                        isAccepted ? (
                          <div className="flex items-center justify-center bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-2 py-2 font-bold text-[10px] uppercase text-center gap-1 shadow-xs">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Escolhida pelo Cliente</span>
                          </div>
                        ) : isQuoteChosen ? (
                          <div className="flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl px-2 py-2 font-semibold text-[10px] uppercase text-center">
                            Não Selecionada
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl px-2 py-2 text-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase leading-tight">Aguardando Decisão do Cliente</span>
                          </div>
                        )
                      )}
                      
                      {/* Partner view for proposal status */}
                      {currentUser?.role === 'business' && currentUser?.id !== quote.userId && (
                        isAccepted ? (
                          <div className="flex items-center justify-center bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl px-1 font-bold text-[10px] uppercase text-center shadow-xs">
                            ✓ Escolhida
                          </div>
                        ) : isQuoteChosen ? (
                          <div className="flex items-center justify-center bg-slate-100 text-slate-400 rounded-xl px-1 font-semibold text-[10px] uppercase text-center">
                            Não Selecionada
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl px-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase text-center leading-tight">Aguardando Cliente</span>
                          </div>
                        )
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL DE CONFIRMAÇÃO: ENCERRAR COTAÇÃO */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Ban className="w-5 h-5" />
                  </div>
                  <h3 className="text-base">Encerrar pedido de orçamento?</h3>
                </div>
                <button
                  onClick={() => !isProcessingAction && setShowCancelConfirm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  Deseja encerrar o pedido: <strong>"{quote.title}"</strong>?
                </p>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-emerald-950">
                  <strong className="block text-emerald-900 font-bold">Benefícios imediatos:</strong>
                  <ul className="list-disc pl-4 space-y-1 text-emerald-900">
                    <li>As empresas são notificadas e você não receberá mais mensagens nem propostas.</li>
                    <li>O histórico das cotações recebidas continua seguro para sua consulta.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Manter Aberto
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={async () => {
                    setIsProcessingAction(true);
                    try {
                      await cancelQuoteRequest(quote.id);
                      setShowCancelConfirm(false);
                    } catch (err: any) {
                      alert(err.message || 'Erro ao encerrar orçamento.');
                    } finally {
                      setIsProcessingAction(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isProcessingAction ? 'Encerrando...' : 'Sim, Encerrar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO: EXCLUIR COTAÇÃO */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600 font-bold">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base text-slate-900">Excluir do Histórico?</h3>
                </div>
                <button
                  onClick={() => !isProcessingAction && setShowDeleteConfirm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  Você está excluindo definitivamente o pedido: <strong>"{quote.title}"</strong>.
                </p>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <strong>Atenção:</strong> Todas as propostas e registros associados a este orçamento serão removidos permanentemente.
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={async () => {
                    setIsProcessingAction(true);
                    try {
                      await deleteQuoteRequest(quote.id);
                      setShowDeleteConfirm(false);
                      setComparingQuoteRequestId(null);
                    } catch (err: any) {
                      alert(err.message || 'Erro ao excluir orçamento.');
                    } finally {
                      setIsProcessingAction(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isProcessingAction ? 'Excluindo...' : 'Excluir Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
