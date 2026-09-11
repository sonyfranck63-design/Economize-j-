import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Search, Tag, FileText, Heart, PlusCircle } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setIsQuoteModalOpen, quoteRequests } = useApp();

  const openQuotesCount = quoteRequests.filter((q) => (q.proposals || []).length > 0).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 md:hidden pb-safe">
      <div className="grid grid-cols-5 h-16 w-full px-2">
        
        {/* Home */}
        <button
          id="nav-tab-home"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center gap-1 transition min-h-[44px] min-w-[44px] ${
            activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-xs">Início</span>
        </button>

        {/* Buscar */}
        <button
          id="nav-tab-search"
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center gap-1 transition min-h-[44px] min-w-[44px] ${
            activeTab === 'search' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-xs">Buscar</span>
        </button>

        {/* Quick Action: Pedir Orçamento */}
        <button
          id="nav-btn-pedir-orcamento-central"
          onClick={() => setIsQuoteModalOpen(true)}
          className="flex flex-col items-center justify-center -mt-4 group min-h-[44px] min-w-[44px]"
          title="Pedir Orçamento Grátis"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-active:scale-90 transition border-2 border-white">
            <PlusCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-800 mt-0.5">Orçar</span>
        </button>

        {/* Ofertas */}
        <button
          id="nav-tab-offers"
          onClick={() => setActiveTab('offers')}
          className={`flex flex-col items-center justify-center gap-1 transition min-h-[44px] min-w-[44px] ${
            activeTab === 'offers' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-xs">Ofertas</span>
        </button>

        {/* Propostas / Comparar */}
        <button
          id="nav-tab-quotes"
          onClick={() => setActiveTab('quotes')}
          className={`relative flex flex-col items-center justify-center gap-1 transition min-h-[44px] min-w-[44px] ${
            activeTab === 'quotes' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-xs">Cotações</span>
          {openQuotesCount > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center">
              {openQuotesCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
