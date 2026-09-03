import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import { Tag, MapPin, Clock, MessageCircle, Heart, Info, ArrowUpDown } from 'lucide-react';

export const OffersView: React.FC = () => {
  const {
    offers,
    setSelectedBusinessId,
    toggleFavoriteOffer,
    favorites,
    currentLocation,
    setIsPriceAlertModalOpen,
  } = useApp();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'expiry'>('price_asc');

  const filtered = offers
    .filter((o) => (selectedCat ? o.categoryId === selectedCat : true))
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.currentPrice - b.currentPrice;
      return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
    });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">Ofertas Perto de Você</h2>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                DADOS DE DEMONSTRAÇÃO
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Promoções reais e pontuais cadastradas pelas empresas da região de <strong>{currentLocation.city}</strong>
            </p>
          </div>

          <button
            onClick={() => setIsPriceAlertModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition shrink-0 self-start sm:self-auto"
          >
            🔔 Quero Pagar Menos (Criar Alerta)
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSelectedCat(null)}
              className={`px-3.5 py-1.5 rounded-full font-medium transition ${
                selectedCat === null ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(selectedCat === c.id ? null : c.id)}
                className={`px-3.5 py-1.5 rounded-full font-medium shrink-0 transition ${
                  selectedCat === c.id ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-700 border-none focus:outline-hidden cursor-pointer"
            >
              <option value="price_asc">Menor Preço</option>
              <option value="expiry">Termina mais rápido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((offer) => {
          const isFav = favorites.offerIds.includes(offer.id);
          return (
            <div
              key={offer.id}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                <img
                  src={offer.imageUrl}
                  alt={offer.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />

                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                  {offer.businessNeighborhood}
                </div>

                <button
                  onClick={() => toggleFavoriteOffer(offer.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white text-slate-700 transition shadow-xs"
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                {offer.originalPrice && (
                  <div className="absolute bottom-3 left-3 bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                    DESCONTO: R$ {(offer.originalPrice - offer.currentPrice).toFixed(2)} OFF
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <button
                    onClick={() => setSelectedBusinessId(offer.businessId)}
                    className="text-xs font-bold text-slate-400 uppercase tracking-wide hover:text-emerald-600 block text-left"
                  >
                    {offer.businessName}
                  </button>

                  <h3 className="font-bold text-base text-slate-900 mt-1">{offer.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{offer.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-600">
                      R$ {offer.currentPrice.toFixed(2)}
                    </span>
                    {offer.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        de R$ {offer.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Válido até {new Date(offer.validUntil).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      {offer.businessCity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <button
                      onClick={() => setSelectedBusinessId(offer.businessId)}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition text-center"
                    >
                      Ver Perfil
                    </button>
                    <a
                      href={`https://wa.me/${offer.businessWhatsapp}?text=${encodeURIComponent(`Olá! Vi a oferta "${offer.title}" por R$ ${offer.currentPrice.toFixed(2)} no EconomizaJá e gostaria de agendar ou retirar.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 text-center shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
