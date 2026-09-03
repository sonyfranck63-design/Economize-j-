import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Search, Tag, FileText, Heart, PlusCircle } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setIsQuoteModalOpen, quoteRequests } = useApp();

  const openQuotesCount = quoteRequests.filter((q) => q.proposals.length > 0).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 md:hidden pb-safe">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        
        {/* Home */}
        <button
          id="nav-tab-home"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Início</span>
        </button>

        {/* Buscar */}
        <button
          id="nav-tab-search"
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'search' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px]">Buscar</span>
        </button>

        {/* Quick Action: Pedir Orçamento */}
        <button
          id="nav-btn-pedir-orcamento-central"
          onClick={() => setIsQuoteModalOpen(true)}
          className="flex flex-col items-center justify-center -mt-4 group"
          title="Pedir Orçamento Grátis"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-active:scale-90 transition border-2 border-white">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-800 mt-0.5">Orçar</span>
        </button>

        {/* Ofertas */}
        <button
          id="nav-tab-offers"
          onClick={() => setActiveTab('offers')}
          className={`flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'offers' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Tag className="w-5 h-5" />
          <span className="text-[10px]">Ofertas</span>
        </button>

        {/* Propostas / Comparar */}
        <button
          id="nav-tab-quotes"
          onClick={() => setActiveTab('quotes')}
          className={`relative flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'quotes' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Cotações</span>
          {openQuotesCount > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {openQuotesCount}
            </span>
          )}
        </button>

      </div>
    </nav>
  );
};
