import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Navigation, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalContentVariants } from '../utils/motionVariants';

const POPULAR_CITIES = [
  { city: 'São Paulo', state: 'SP', neighborhood: 'Santo Amaro' },
  { city: 'São Paulo', state: 'SP', neighborhood: 'Vila Mariana' },
  { city: 'Curitiba', state: 'PR', neighborhood: 'Batel' },
  { city: 'Belo Horizonte', state: 'MG', neighborhood: 'Savassi' },
  { city: 'Campinas', state: 'SP', neighborhood: 'Cambuí' },
  { city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Tijuca' },
];

export const LocationSelectorModal: React.FC = () => {
  const {
    isLocationSelectorOpen,
    setIsLocationSelectorOpen,
    currentLocation,
    setCurrentLocation,
    detectUserLocation,
    isLocating,
  } = useApp();

  const [inputCity, setInputCity] = useState(currentLocation.city);
  const [inputNeighborhood, setInputNeighborhood] = useState(currentLocation.neighborhood);
  const [inputState, setInputState] = useState(currentLocation.state);

  // Fechar com ESC para acessibilidade
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLocationSelectorOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setIsLocationSelectorOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCity.trim()) return;

    setCurrentLocation({
      city: inputCity.trim(),
      state: inputState.trim().toUpperCase(),
      neighborhood: inputNeighborhood.trim(),
    });
    setIsLocationSelectorOpen(false);
  };

  const handleSelectCity = (item: { city: string; state: string; neighborhood: string }) => {
    setCurrentLocation(item);
    setIsLocationSelectorOpen(false);
  };

  return (
    <AnimatePresence>
      {isLocationSelectorOpen && (
        <motion.div
          key="location-modal-backdrop"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="fixed inset-0" onClick={() => setIsLocationSelectorOpen(false)} />
          <motion.div
            key="location-modal-card"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100"
          >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sua Localização</h3>
              <p className="text-xs text-slate-500">Veja ofertas e empresas que atendem a sua região</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationSelectorOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Quick Action */}
        <div className="mt-4">
          <button
            id="btn-use-gps-location"
            onClick={() => {
              detectUserLocation();
              setIsLocationSelectorOpen(false);
            }}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition active:scale-98 shadow-sm shadow-emerald-600/20"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Detectando via GPS...' : 'USAR MINHA LOCALIZAÇÃO'}</span>
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-medium">ou digite sua cidade</span>
          </div>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
            <input
              type="text"
              required
              value={inputCity}
              onChange={(e) => setInputCity(e.target.value)}
              placeholder="Ex: São Paulo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
              <input
                type="text"
                value={inputNeighborhood}
                onChange={(e) => setInputNeighborhood(e.target.value)}
                placeholder="Ex: Santo Amaro"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
              <input
                type="text"
                maxLength={2}
                value={inputState}
                onChange={(e) => setInputState(e.target.value.toUpperCase())}
                placeholder="SP"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm uppercase text-center focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition"
          >
            Confirmar Cidade
          </button>
        </form>

        {/* Popular Cities Suggestions */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Cidades com parceiros ativos (Demo)</p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_CITIES.map((c, idx) => {
              const isSelected = currentLocation.city === c.city && currentLocation.neighborhood === c.neighborhood;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectCity(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-transparent'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                  <span>{c.city} ({c.neighborhood})</span>
                </button>
              );
            })}
          </div>
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
