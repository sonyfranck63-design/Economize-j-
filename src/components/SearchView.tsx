import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import { BusinessAvatar } from './BusinessAvatar';
import { SafeImage } from './SafeImage';
import { buildWhatsAppLink } from '../utils/whatsappUtils';
import {
  Search,
  Filter,
  Star,
  MapPin,
  ShieldCheck,
  Tag,
  Clock,
  MessageCircle,
  SlidersHorizontal,
  X,
  PlusCircle,
  Bell,
} from 'lucide-react';

export const SearchView: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    businesses,
    offers,
    setSelectedBusinessId,
    setIsQuoteModalOpen,
    setIsPriceAlertModalOpen,
    currentLocation,
  } = useApp();

  const [activeSearchTab, setActiveSearchTab] = useState<'empresas' | 'ofertas' | 'produtos'>('empresas');

  // Filter States
  const [maxDistance, setMaxDistance] = useState<number>(20); // km
  const [minRating, setMinRating] = useState<number>(0); // stars
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);
  const [onlyOpen, setOnlyOpen] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'distance' | 'rating'>('relevance');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Garante posicionamento no topo ao mudar categoria ou pesquisa
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedCategory, searchQuery]);

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses
      .filter((b) => {
        if (b.active === false) return false;

        // Text query matching name, description, services, products, subcategory
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = b.name.toLowerCase().includes(q);
          const matchesDesc = b.description.toLowerCase().includes(q);
          const matchesSub = b.subcategory.toLowerCase().includes(q);
          const matchesService = b.services.some((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
          const matchesProduct = b.products.some((p) => p.title.toLowerCase().includes(q));
          if (!matchesName && !matchesDesc && !matchesSub && !matchesService && !matchesProduct) {
            return false;
          }
        }

        // Category
        if (selectedCategory && b.categoryId !== selectedCategory) {
          return false;
        }

        // Filters
        if (b.distanceKm > maxDistance) return false;
        if (minRating > 0 && b.rating < minRating) return false;
        if (onlyVerified && !b.verified) return false;
        if (onlyOpen && !b.openNow) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
        if (sortBy === 'rating') return b.rating - a.rating;
        // Relevance: Featured first, then rating
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.rating - a.rating;
      });
  }, [businesses, searchQuery, selectedCategory, maxDistance, minRating, onlyVerified, onlyOpen, sortBy]);

  // Filtered Offers
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = o.title.toLowerCase().includes(q);
        const matchDesc = o.description.toLowerCase().includes(q);
        const matchBiz = o.businessName.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchBiz) return false;
      }
      if (selectedCategory && o.categoryId !== selectedCategory) return false;
      return true;
    });
  }, [offers, searchQuery, selectedCategory]);

  // Products from businesses
  const matchingProducts = useMemo(() => {
    const list: Array<{ business: any; product: any }> = [];
    businesses.forEach((b) => {
      b.products.forEach((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          if (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
            list.push({ business: b, product: p });
          }
        } else {
          list.push({ business: b, product: p });
        }
      });
    });
    return list;
  }, [businesses, searchQuery]);

  const resetFilters = () => {
    setSelectedCategory(null);
    setMaxDistance(20);
    setMinRating(0);
    setOnlyVerified(false);
    setOnlyOpen(false);
    setSortBy('relevance');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Search Bar & Filter Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="search-main-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar empresas, serviços ou produtos..."
              className="w-full pl-12 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFiltersModal(!showFiltersModal)}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-xl border text-sm font-semibold transition shrink-0 ${
              showFiltersModal || minRating > 0 || onlyVerified || onlyOpen || maxDistance < 20
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-1.5 rounded-full font-medium shrink-0 transition ${
              selectedCategory === null
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas as Categorias
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
              className={`px-3.5 py-1.5 rounded-full font-medium shrink-0 transition ${
                selectedCategory === c.id
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Tab Selector: Empresas vs Ofertas vs Produtos */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSearchTab('empresas')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeSearchTab === 'empresas'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Empresas & Profissionais ({filteredBusinesses.length})
            </button>

            <button
              onClick={() => setActiveSearchTab('ofertas')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeSearchTab === 'ofertas'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ofertas ({filteredOffers.length})
            </button>

            <button
              onClick={() => setActiveSearchTab('produtos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeSearchTab === 'produtos'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Produtos Cadastrados ({matchingProducts.length})
            </button>
          </div>

          <button
            onClick={() => setIsPriceAlertModalOpen(true)}
            className="hidden sm:flex items-center gap-1 text-emerald-600 font-bold hover:text-emerald-700"
            title="Cadastrar alerta de preço para esta busca"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Criar Alerta de Preço</span>
          </button>
        </div>
      </div>

      {/* Filter Drawer / Panel */}
      {showFiltersModal && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-900">Refinar Resultados</span>
            <button
              onClick={resetFilters}
              className="text-xs text-emerald-600 hover:underline font-semibold"
            >
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Raio de Distância */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Distância máxima: {maxDistance} km</label>
              <input
                type="range"
                min={1}
                max={50}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Avaliação Mínima */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Avaliação mínima</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
              >
                <option value={0}>Qualquer nota</option>
                <option value={4}>4 estrelas ou mais (⭐ 4+)</option>
                <option value={4.5}>4.5 estrelas ou mais (⭐ 4.5+)</option>
              </select>
            </div>

            {/* Ordenação */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
              >
                <option value="relevance">Relevância / Destaque</option>
                <option value="distance">Menor Distância</option>
                <option value="rating">Melhor Avaliação</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyVerified}
                  onChange={(e) => setOnlyVerified(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Apenas empresas verificadas</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyOpen}
                  onChange={(e) => setOnlyOpen(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Abertas agora</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS SECTION */}
      {activeSearchTab === 'empresas' && (
        <div className="space-y-4">
          {filteredBusinesses.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm space-y-3">
              <p className="text-slate-500 text-sm">
                Nenhuma empresa ou profissional encontrado para sua busca em <strong>{currentLocation.city}</strong>.
              </p>
              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition"
              >
                Pedir Orçamento Aberto para Outras Empresas
              </button>
            </div>
          ) : (
            filteredBusinesses.map((biz) => (
              <div
                key={biz.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <BusinessAvatar
                    src={biz.logo}
                    name={biz.name}
                    className="w-16 h-16 rounded-2xl border border-slate-100"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {biz.featured && (
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                          DESTAQUE
                        </span>
                      )}
                      {biz.verified && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verificada
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 uppercase font-medium">
                        {biz.subcategory}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{biz.name}</h3>
                    <p className="text-xs text-slate-600 line-clamp-1 max-w-xl">{biz.description}</p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {biz.rating} ({biz.reviewCount} avaliações)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {biz.neighborhood} (~{biz.distanceKm} km)
                      </span>
                      <span>•</span>
                      <span className={biz.openNow ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {biz.openNow ? 'Aberto agora' : 'Fechado no momento'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
                  <button
                    onClick={() => setSelectedBusinessId(biz.id)}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition text-center"
                  >
                    Ver Perfil & Serviços
                  </button>

                  <a
                    href={buildWhatsAppLink(biz.whatsapp, `Olá! Encontrei o perfil de ${biz.name} no EconomizaJá e gostaria de tirar uma dúvida sobre serviços.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition shrink-0"
                    title="Falar no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RESULTS: OFERTAS */}
      {activeSearchTab === 'ofertas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="h-44 relative bg-slate-100">
                <SafeImage
                  src={offer.imageUrl}
                  alt={offer.title}
                  category={offer.categoryId}
                  fallbackKeyword={`${offer.title} ${offer.businessName}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Oferta Verificada
                </div>
              </div>
              <div className="p-4 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{offer.businessName}</span>
                <h3 className="font-bold text-sm text-slate-900">{offer.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{offer.description}</p>
                <div className="flex items-baseline gap-2 pt-2 border-t border-slate-100">
                  <span className="text-lg font-bold text-emerald-600">
                    R$ {offer.currentPrice.toFixed(2)}
                  </span>
                  {offer.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      R$ {offer.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setSelectedBusinessId(offer.businessId)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    Ver Empresa
                  </button>
                  <a
                    href={buildWhatsAppLink(offer.businessWhatsapp, `Olá! Vi a oferta "${offer.title}" por R$ ${offer.currentPrice.toFixed(2)} no EconomizaJá.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESULTS: PRODUTOS CADASTRADOS */}
      {activeSearchTab === 'produtos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchingProducts.map(({ business, product }, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                  {product.category}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">{product.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{product.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400 block">Vendido e entregue por:</span>
                <span className="font-bold text-xs text-slate-800">{business.name} ({business.neighborhood})</span>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-lg font-bold text-emerald-600">
                    R$ {product.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => setSelectedBusinessId(business.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Consultar Loja
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
