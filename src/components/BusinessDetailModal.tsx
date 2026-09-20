import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessAvatar } from './BusinessAvatar';
import { SafeImage } from './SafeImage';
import { buildWhatsAppLink } from '../utils/whatsappUtils';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalContentVariants } from '../utils/motionVariants';
import {
  X,
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  ShieldCheck,
  Heart,
  PlusCircle,
  Navigation,
  CheckCircle2,
  Tag,
  Share2,
} from 'lucide-react';

export const BusinessDetailModal: React.FC = () => {
  const {
    selectedBusinessId,
    setSelectedBusinessId,
    businesses,
    offers,
    setIsQuoteModalOpen,
    setQuoteCategoryPreset,
    setQuoteTargetBusinessId,
    toggleFavoriteBusiness,
    favorites,
    addReview,
    reviews,
    currentUser,
    setIsAuthModalOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'servicos' | 'produtos' | 'ofertas' | 'avaliacoes'>('servicos');

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Adiciona suporte a fechar com ESC para melhorar a acessibilidade e UX
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBusinessId(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setSelectedBusinessId]);

  const biz = selectedBusinessId ? businesses.find((b) => b.id === selectedBusinessId) : null;
  const bizOffers = biz ? offers.filter((o) => o.businessId === biz.id) : [];
  const isFav = biz ? favorites.businessIds.includes(biz.id) : false;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!reviewComment.trim() || !biz) return;

    // PROBLEMA 5: 1. Antes de chamar addReview, verificar se já existe review com businessId === businessId e userName === currentUser.fullName no array reviews do contexto
    const currentName = currentUser.fullName?.trim().toLowerCase();
    const currentId = currentUser.id;

    const alreadyReviewed = reviews.some((r) => {
      if (r.businessId !== biz.id) return false;
      const matchName = Boolean(currentName && r.userName?.trim().toLowerCase() === currentName);
      const matchId = Boolean(currentId && (r as any).userId === currentId);
      return matchName || matchId;
    });

    // 2. Se existir, mostrar mensagem "Você já avaliou esta empresa"
    if (alreadyReviewed) {
      alert('Você já avaliou esta empresa');
      return;
    }

    await addReview(biz.id, reviewRating, reviewComment.trim());

    setReviewComment('');
    setShowReviewForm(false);
  };

  const handleOpenMaps = () => {
    if (!biz) return;
    const query = encodeURIComponent(`${biz.address}, ${biz.neighborhood}, ${biz.city} - ${biz.state}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <AnimatePresence>
      {Boolean(selectedBusinessId && biz) && biz && (
        <motion.div
          key="business-detail-backdrop"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-xs"
        >
          {/* Background Overlay */}
          <div className="absolute inset-0" onClick={() => setSelectedBusinessId(null)} />
          
          {/* Modal Container */}
          <motion.div
            key="business-detail-card"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden"
          >
        
        {/* Cover / Header */}
        <div className="relative h-44 sm:h-56 bg-slate-900 shrink-0">
          <SafeImage
            src={biz.coverImage}
            alt={biz.name}
            category={biz.categoryId}
            fallbackKeyword={`${biz.subcategory} ${biz.name}`}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

          {/* Close & Fav buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={() => toggleFavoriteBusiness(biz.id)}
              className="p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-xs transition"
              title="Salvar como favorita"
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            <button
              onClick={() => setSelectedBusinessId(null)}
              className="p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-xs transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Business identity badge */}
          <div className="absolute -bottom-6 left-6 flex items-end gap-4 z-10">
            <BusinessAvatar
              src={biz.logo || biz.photos?.[0]}
              name={biz.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-md bg-white"
              iconClassName="w-8 h-8 text-emerald-600"
            />
          </div>
        </div>

        {/* Info & Action Bar */}
        <div className="px-6 pt-8 pb-4 shrink-0 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                  {biz.subcategory}
                </span>
                {biz.verified && (
                  <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Empresa Verificada
                  </span>
                )}
                {biz.featured && (
                  <span className="text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md font-extrabold">
                    DESTAQUE
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mt-1">{biz.name}</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">{biz.description}</p>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-slate-800">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {biz.rating} ({biz.reviewCount} avaliações)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {biz.neighborhood}, {biz.city} (~{biz.distanceKm} km)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {biz.openHours}
                </span>
              </div>
            </div>

            {/* Main Action CTAs: PEDIR ORÇAMENTO + FALAR NO WHATSAPP */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <button
                id="biz-btn-pedir-orcamento"
                onClick={() => {
                  setQuoteCategoryPreset(biz.categoryId);
                  setQuoteTargetBusinessId(biz.id);
                  setSelectedBusinessId(null);
                  setIsQuoteModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>PEDIR ORÇAMENTO</span>
              </button>

              {/* Bug 3 Fix (Opção B): WhatsApp exige login antes de redirecionar */}
              <button
                id="biz-btn-whatsapp"
                onClick={() => {
                  if (!currentUser) {
                    // Usuário não logado: abre modal de autenticação
                    setSelectedBusinessId(null);
                    setIsAuthModalOpen(true);
                    return;
                  }
                  // Usuário logado: abre WhatsApp diretamente
                  const url = buildWhatsAppLink(
                    biz.whatsapp,
                    `Olá! Vi o perfil de ${biz.name} no EconomizaJá e gostaria de falar com um atendente.`
                  );
                  window.open(url, '_blank', 'noreferrer');
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>FALAR NO WHATSAPP</span>
              </button>

              <button
                id="biz-btn-ver-mapa"
                onClick={handleOpenMaps}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>VER NO MAPA</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs — overflow-x-auto para não transbordar no mobile */}
          <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 text-xs overflow-x-auto scrollbar-none -mx-1 px-1">
            <button
              onClick={() => setActiveTab('servicos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'servicos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Serviços ({(biz.services?.length || 0)})
            </button>
            <button
              onClick={() => setActiveTab('produtos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'produtos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Produtos ({(biz.products?.length || 0)})
            </button>
            <button
              onClick={() => setActiveTab('ofertas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'ofertas' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ofertas ({bizOffers.length})
            </button>
            <button
              onClick={() => setActiveTab('avaliacoes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'avaliacoes' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Avaliações ({(biz.reviews?.length || 0)})
            </button>
          </div>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* SERVIÇOS */}
          {activeTab === 'servicos' && (
            <div className="space-y-3">
              {(biz.services || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nenhum serviço cadastrado para esta empresa.</p>
              ) : (
                (biz.services || []).map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-start justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{svc.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{svc.description}</p>
                      <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                        Prazo estimado: {svc.estimatedTime}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900 block">
                        {svc.priceEstimate}
                      </span>
                      <button
                        onClick={() => {
                          setQuoteCategoryPreset(biz.categoryId);
                          setQuoteTargetBusinessId(biz.id);
                          setSelectedBusinessId(null);
                          setIsQuoteModalOpen(true);
                        }}
                        className="mt-1 text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Cotar Este
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PRODUTOS */}
          {activeTab === 'produtos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(biz.products || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 col-span-2">Nenhum produto cadastrado para esta empresa.</p>
              ) : (
                (biz.products || []).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600">{prod.category}</span>
                      <h4 className="font-bold text-sm text-slate-900">{prod.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{prod.description}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">
                        R$ {prod.price.toFixed(2)}
                      </span>
                      {/* Bug 3 Fix (Opção B): produto também exige login antes de abrir WhatsApp */}
                      <button
                        onClick={() => {
                          if (!currentUser) {
                            setSelectedBusinessId(null);
                            setIsAuthModalOpen(true);
                            return;
                          }
                          const url = buildWhatsAppLink(
                            biz.whatsapp,
                            `Olá! Gostaria de reservar o produto "${prod.title}" por R$ ${prod.price.toFixed(2)} anunciado no EconomizaJá.`
                          );
                          window.open(url, '_blank', 'noreferrer');
                        }}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Consultar Disponibilidade
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* OFERTAS ATIVAS */}
          {activeTab === 'ofertas' && (
            <div className="space-y-3">
              {bizOffers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nenhuma oferta ativa no momento para esta empresa.</p>
              ) : (
                bizOffers.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                        PROMOÇÃO ATIVA
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{o.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{o.description}</p>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Válido até {new Date(o.validUntil).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className="text-xl font-bold text-emerald-600">
                          R$ {o.currentPrice.toFixed(2)}
                        </span>
                        {o.originalPrice && (
                          <span className="text-xs text-slate-400 line-through">
                            R$ {o.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Bug 3 Fix (Opção B): oferta também exige login antes de abrir WhatsApp */}
                      <button
                        onClick={() => {
                          if (!currentUser) {
                            setSelectedBusinessId(null);
                            setIsAuthModalOpen(true);
                            return;
                          }
                          const url = buildWhatsAppLink(
                            o.businessWhatsapp,
                            `Olá! Vi a promoção "${o.title}" por R$ ${o.currentPrice.toFixed(2)} no EconomizaJá e quero garantir.`
                          );
                          window.open(url, '_blank', 'noreferrer');
                        }}
                        className="inline-block mt-2 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs"
                      >
                        Garantir Oferta
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* AVALIAÇÕES REAIS */}
          {activeTab === 'avaliacoes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Avaliações de Clientes</h4>
                  <p className="text-xs text-slate-500">Transparência total baseada em experiências reais</p>
                </div>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  {showReviewForm ? 'Cancelar' : 'Deixar Avaliação'}
                </button>
              </div>

              {/* Review form */}
              {showReviewForm && (
                <form onSubmit={handleReviewSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">Sua Avaliação</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 font-semibold flex items-center">
                      {currentUser?.fullName || 'Faça login para avaliar'}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-600">Nota:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 text-amber-400"
                        >
                          <Star className={`w-4 h-4 ${reviewRating >= star ? 'fill-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    required
                    rows={2}
                    placeholder="Conte como foi o atendimento, preço e qualidade..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  />

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Publicar Avaliação
                  </button>
                </form>
              )}

              {/* Reviews list */}
              <div className="space-y-3">
                {(biz.reviews || []).map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{rev.authorName}</span>
                        {rev.verifiedCustomer && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                            Cliente Verificado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
