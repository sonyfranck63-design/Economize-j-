import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Heart, Star, MapPin, MessageCircle, ArrowRight, Building2, Tag } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const {
    favorites,
    businesses,
    offers,
    setSelectedBusinessId,
    toggleFavoriteBusiness,
    toggleFavoriteOffer,
    setActiveTab,
  } = useApp();

  const [favTab, setFavTab] = useState<'empresas' | 'ofertas'>('empresas');

  const favBusinesses = businesses.filter((b) => favorites.businessIds.includes(b.id));
  const favOffers = offers.filter((o) => favorites.offerIds.includes(o.id));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Meus Favoritos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Empresas de confiança e ofertas que você salvou para comparar ou consultar depois.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFavTab('empresas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              favTab === 'empresas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Empresas ({favBusinesses.length})
          </button>
          <button
            onClick={() => setFavTab('ofertas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              favTab === 'ofertas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ofertas ({favOffers.length})
          </button>
        </div>
      </div>

      {favTab === 'empresas' ? (
        <div className="space-y-4">
          {favBusinesses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">Você ainda não salvou nenhuma empresa favorita.</p>
              <button
                onClick={() => setActiveTab('search')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Explorar Empresas Locais
              </button>
            </div>
          ) : (
            favBusinesses.map((biz) => (
              <div
                key={biz.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={biz.logo}
                    alt={biz.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">{biz.subcategory}</span>
                    <h3 className="font-bold text-base text-slate-900">{biz.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {biz.rating}
                      </span>
                      <span>•</span>
                      <span>{biz.neighborhood}, {biz.city}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedBusinessId(biz.id)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                  >
                    Ver Perfil
                  </button>
                  <button
                    onClick={() => toggleFavoriteBusiness(biz.id)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-rose-500 transition"
                    title="Remover dos favoritos"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favOffers.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
              <Tag className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">Nenhuma oferta salva nos favoritos.</p>
              <button
                onClick={() => setActiveTab('offers')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Ver Todas as Ofertas
              </button>
            </div>
          ) : (
            favOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{offer.businessName}</span>
                    <h3 className="font-bold text-sm text-slate-900 mt-0.5">{offer.title}</h3>
                  </div>
                  <button
                    onClick={() => toggleFavoriteOffer(offer.id)}
                    className="text-rose-500 p-1"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-600">
                    R$ {offer.currentPrice.toFixed(2)}
                  </span>
                  <button
                    onClick={() => setSelectedBusinessId(offer.businessId)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                  >
                    Ver Empresa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
