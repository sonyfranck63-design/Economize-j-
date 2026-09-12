import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Search, Tag, FileText, Plus } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setIsQuoteModalOpen, quoteRequests } = useApp();

  const openQuotesCount = quoteRequests.filter((q) => (q.proposals || []).length > 0).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-16 w-full max-w-lg mx-auto px-1">
        
        {/* Home */}
        <button
          id="nav-tab-home"
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition min-h-[44px] ${
            activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Início</span>
        </button>

        {/* Buscar */}
        <button
          id="nav-tab-search"
          type="button"
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition min-h-[44px] ${
            activeTab === 'search' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Buscar</span>
        </button>

        {/* Quick Action: Pedir Orçamento */}
        <button
          id="nav-btn-pedir-orcamento-central"
          type="button"
          onClick={() => setIsQuoteModalOpen(true)}
          className="flex-1 flex flex-col items-center justify-center -mt-3 group min-h-[44px]"
          title="Pedir Orçamento Grátis"
        >
          <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-active:scale-95 transition border-2 border-white">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-slate-800 mt-0.5 leading-none">Orçar</span>
        </button>

        {/* Ofertas */}
        <button
          id="nav-tab-offers"
          type="button"
          onClick={() => setActiveTab('offers')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition min-h-[44px] ${
            activeTab === 'offers' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Ofertas</span>
        </button>

        {/* Propostas / Cotações */}
        <button
          id="nav-tab-quotes"
          type="button"
          onClick={() => setActiveTab('quotes')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition min-h-[44px] ${
            activeTab === 'quotes' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <FileText className="w-5 h-5 shrink-0" />
            {openQuotesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-1 ring-white">
                {openQuotesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Cotações</span>
        </button>

      </div>
    </nav>
  );
};
