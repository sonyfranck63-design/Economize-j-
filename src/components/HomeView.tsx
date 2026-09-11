import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import { BusinessAvatar } from './BusinessAvatar';
import { SafeImage } from './SafeImage';
import {
  Search,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  Tag,
  Clock,
  Car,
  Home,
  Smartphone,
  Utensils,
  Laptop,
  ShoppingBag,
  PlusCircle,
  TrendingDown,
  Navigation,
  CheckCircle,
  MessageCircle,
  SlidersHorizontal,
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  automotivo: <Car className="w-6 h-6" />,
  casa: <Home className="w-6 h-6" />,
  tecnologia: <Smartphone className="w-6 h-6" />,
  beleza: <Sparkles className="w-6 h-6" />,
  alimentacao: <Utensils className="w-6 h-6" />,
  'servicos-digitais': <Laptop className="w-6 h-6" />,
  produtos: <ShoppingBag className="w-6 h-6" />,
};

const SEARCH_SUGGESTIONS = [
  'Trocar pneus',
  'Consertar celular',
  'Pintar minha casa',
  'Eletricista',
  'Ar-condicionado',
];

export const HomeView: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setActiveTab,
    setSelectedCategory,
    currentLocation,
    setIsLocationSelectorOpen,
    detectUserLocation,
    isLocating,
    businesses,
    offers,
    quoteRequests,
    setIsQuoteModalOpen,
    setSelectedBusinessId,
    setComparingQuoteRequestId,
    toggleFavoriteOffer,
    favorites,
    setQuoteCategoryPreset,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchQuery(localSearch.trim());
      setActiveTab('search');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocalSearch(suggestion);
    setSearchQuery(suggestion);
    setActiveTab('search');
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setActiveTab('search');
  };

  const featuredBusinesses = businesses.filter((b) => b.featured && b.active !== false);
  const activeOffers = offers.slice(0, 4);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Section - Sleek Interface Dark Banner */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl mx-auto">
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-emerald-400 tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compare e Economize</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display leading-tight text-white">
            Antes de comprar ou contratar, <br className="hidden sm:block" />
            <span className="text-emerald-400">peça orçamentos.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto font-normal">
            Encontre ofertas verificadas, compare orçamentos reais e economize tempo e dinheiro na sua região.
          </p>

          {/* Search Form - Glassmorphic on dark bg */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <div className="relative flex-1 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-md border border-white/10 focus-within:border-emerald-400/50 transition">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                id="home-search-input"
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="O que você está procurando?"
                className="bg-transparent text-sm text-white placeholder-slate-400 outline-none w-full font-medium"
              />
            </div>
            <button
              id="home-btn-pesquisar"
              type="submit"
              className="py-3.5 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0 flex items-center justify-center gap-2"
            >
              <span>Pesquisar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Exemplos:</span>
            {SEARCH_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(item)}
                className="bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-1 rounded-full border border-white/10 transition active:scale-95 text-[11px]"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Location Bar Inside Hero */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">
                Sua localização: <strong className="text-white">{currentLocation.neighborhood ? `${currentLocation.neighborhood}, ` : ''}{currentLocation.city} - {currentLocation.state}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="home-btn-gps"
                onClick={detectUserLocation}
                disabled={isLocating}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition flex items-center gap-1"
              >
                <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Obtendo...' : 'Usar minha localização'}</span>
              </button>

              <button
                id="home-btn-city-picker"
                onClick={() => setIsLocationSelectorOpen(true)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition"
              >
                Digitar cidade
              </button>
            </div>
          </div>

        </div>

        {/* Sleek emerald ambient glow */}
        <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"></div>
      </section>

      {/* Main Feature Highlight: PEDIR ORÇAMENTOS (Lead Magnet) */}
      <section className="rounded-2xl bg-emerald-600 p-6 sm:p-8 text-white shadow-xl shadow-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-100">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Mais Econômico e Sem Compromisso</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display">
            Precisa de um serviço ou produto?
          </h2>
          <p className="text-sm text-emerald-100 max-w-xl">
            Diga o que você precisa. O EconomizaJá envia seu pedido para prestadores da sua região. Você compara preços e escolhe o melhor!
          </p>
        </div>

        <button
          id="btn-home-pedir-orcamento-banner"
          onClick={() => setIsQuoteModalOpen(true)}
          className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-600 font-bold text-sm tracking-wide transition shadow-lg active:scale-95 shrink-0 flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5 text-emerald-600" />
          <span>PEDIR ORÇAMENTOS</span>
        </button>
      </section>

      {/* Categories Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Categorias Populares</h2>
            <p className="text-xs text-slate-500">Encontre especialistas e lojas perto de você</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className="p-3.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 text-slate-800 transition text-center flex flex-col items-center justify-center gap-2 shadow-sm group active:scale-95"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition shadow-xs">
                {CATEGORY_ICON_MAP[cat.id] || <Tag className="w-5 h-5" />}
              </div>
              <span className="text-xs font-medium text-slate-700 group-hover:text-emerald-700 line-clamp-1">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Ofertas Próximas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">Ofertas Perto de Você</h2>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                DADOS DE DEMONSTRAÇÃO
              </span>
            </div>
            <p className="text-xs text-slate-500">Promoções cadastradas por empresas locais de {currentLocation.city}</p>
          </div>
          <button
            onClick={() => setActiveTab('offers')}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeOffers.map((offer) => {
            const isFav = favorites.offerIds.includes(offer.id);
            return (
              <div
                key={offer.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1 flex flex-col group justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden rounded-xl bg-slate-100 mb-3">
                    <SafeImage
                      src={offer.imageUrl}
                      alt={offer.title}
                      category={offer.categoryId}
                      fallbackKeyword={`${offer.title} ${offer.businessName}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-xs">
                      Oferta Local
                    </div>
                    {offer.originalPrice && (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-xs">
                        -R$ {(offer.originalPrice - offer.currentPrice).toFixed(0)}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{offer.businessName}</span>
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mt-0.5">{offer.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{offer.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-600">
                      R$ {offer.currentPrice.toFixed(2)}
                    </span>
                    {offer.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        R$ {offer.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Até {new Date(offer.validUntil).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      {offer.businessNeighborhood}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedBusinessId(offer.businessId)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition text-center"
                    >
                      Ver Empresa
                    </button>
                    <a
                      href={`https://wa.me/${offer.businessWhatsapp}?text=${encodeURIComponent(`Olá! Vi a oferta "${offer.title}" por R$ ${offer.currentPrice.toFixed(2)} no EconomizaJá e gostaria de aproveitar!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center justify-center gap-1 text-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Empresas em Destaque (Patrocinado / Destaque) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Empresas em Destaque</h2>
            <p className="text-xs text-slate-500">Parceiros com alta avaliação e atendimento rápido</p>
          </div>
          <button
            onClick={() => setActiveTab('search')}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Explorar todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuredBusinesses.map((biz) => (
            <div
              key={biz.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <BusinessAvatar
                src={biz.logo}
                name={biz.name}
                className="w-16 h-16 rounded-2xl border border-slate-100"
              />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    DESTAQUE
                  </span>
                  {biz.verified && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verificada
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900 truncate">{biz.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{biz.description}</p>

                <div className="flex items-center gap-3 text-xs pt-1">
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {biz.rating} <span className="text-slate-400 font-normal">({biz.reviewCount})</span>
                  </span>
                  <span className="text-slate-200">•</span>
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {biz.neighborhood} (~{biz.distanceKm} km)
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                <button
                  onClick={() => setSelectedBusinessId(biz.id)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition text-center"
                >
                  Ver Perfil
                </button>
                <button
                  onClick={() => {
                    setQuoteCategoryPreset(biz.categoryId);
                    setIsQuoteModalOpen(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition text-center"
                >
                  Cotar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Solicitações de Orçamento Recentes (Comparação Transparente) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Solicitações de Orçamento</h2>
            <p className="text-xs text-slate-500">Veja propostas recebidas e compare os preços</p>
          </div>
          <button
            onClick={() => setActiveTab('quotes')}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Ver minhas cotações</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {quoteRequests.filter((qr) => qr.status !== 'cancelado').length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center space-y-3">
            <p className="text-sm font-medium text-slate-600">Nenhuma solicitação de orçamento em andamento.</p>
            <button
              onClick={() => setIsQuoteModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Pedir Orçamento Grátis
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quoteRequests
              .filter((qr) => qr.status !== 'cancelado')
              .slice(0, 4)
              .map((qr) => (
                <div
                  key={qr.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="border-l-4 border-emerald-500 pl-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        ID: #{qr.id.replace('req_', '')} • {qr.neighborhood}
                      </span>
                      <h3 className="font-semibold text-sm text-slate-900 mt-0.5">{qr.title}</h3>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                      {(qr.proposals || []).length} {(qr.proposals || []).length === 1 ? 'proposta' : 'respostas'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{qr.description}</p>

                  {/* Best proposal snippet */}
                  {(qr.proposals || []).length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium">Melhor proposta:</span>
                        <p className="font-bold text-slate-900">{qr.proposals[0].businessName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          R$ {qr.proposals[0].price.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-400">{qr.proposals[0].deadlineText}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Prazo: {qr.desiredDeadline}
                    </span>
                    <button
                      onClick={() => {
                        setComparingQuoteRequestId(qr.id);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>Compare as Opções</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

    </div>
  );
};
