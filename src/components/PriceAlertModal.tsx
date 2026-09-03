import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import { X, Bell, Trash2, CheckCircle2, TrendingDown } from 'lucide-react';

export const PriceAlertModal: React.FC = () => {
  const {
    isPriceAlertModalOpen,
    setIsPriceAlertModalOpen,
    priceAlerts,
    createPriceAlert,
    removePriceAlert,
    currentLocation,
  } = useApp();

  const [keyword, setKeyword] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [categoryId, setCategoryId] = useState('automotivo');

  if (!isPriceAlertModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !maxPrice) return;

    createPriceAlert({
      userId: 'u-current',
      keyword: keyword.trim(),
      maxPrice: Number(maxPrice),
      categoryId,
      city: currentLocation.city,
    });

    setKeyword('');
    setMaxPrice('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md mb-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Economia Automática</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Quero Pagar Menos</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina o valor máximo que deseja pagar. Avisaremos você assim que uma oferta compatível surgir!
            </p>
          </div>
          <button
            onClick={() => setIsPriceAlertModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Creation Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            Criar Novo Alerta de Preço
          </span>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Produto ou Serviço Desejado
            </label>
            <input
              type="text"
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex: Pneu aro 15, Troca de tela iPhone, Pintura de sala..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quero pagar até (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Ex: 350.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition active:scale-98 flex items-center justify-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>ATIVAR ALERTA DE PREÇO</span>
          </button>
        </form>

        {/* Existing Alerts */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            Seus Alertas Ativos ({priceAlerts.length})
          </span>

          {priceAlerts.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Nenhum alerta cadastrado no momento.</p>
          ) : (
            <div className="space-y-2">
              {priceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 text-xs shadow-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 capitalize block">{alert.keyword}</span>
                    <span className="text-emerald-600 font-semibold">
                      Até R$ {alert.maxPrice.toFixed(2)} • {alert.city}
                    </span>
                  </div>

                  <button
                    onClick={() => removePriceAlert(alert.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition rounded-lg"
                    title="Excluir alerta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
