import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import { X, PlusCircle, CheckCircle2, ShieldAlert, Sparkles, Upload } from 'lucide-react';

export const QuoteRequestModal: React.FC = () => {
  const {
    isQuoteModalOpen,
    setIsQuoteModalOpen,
    createQuoteRequest,
    currentLocation,
    quoteCategoryPreset,
    setQuoteCategoryPreset,
    setActiveTab,
    setComparingQuoteRequestId,
  } = useApp();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(quoteCategoryPreset || 'casa');
  const [subcategory, setSubcategory] = useState('');
  const [city, setCity] = useState(currentLocation.city);
  const [neighborhood, setNeighborhood] = useState(currentLocation.neighborhood);
  const [description, setDescription] = useState('');
  const [desiredDeadline, setDesiredDeadline] = useState('O quanto antes (próximos 3 dias)');
  const [budgetRange, setBudgetRange] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (quoteCategoryPreset) {
      setCategoryId(quoteCategoryPreset);
    }
  }, [quoteCategoryPreset]);

  if (!isQuoteModalOpen) return null;

  const currentCategoryObj = CATEGORIES.find((c) => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !city.trim()) return;

    const newId = createQuoteRequest({
      userId: 'u-current',
      userName: userName.trim() || 'Cliente EconomizaJá',
      userPhone: userPhone.trim() || '(11) 99999-8888',
      userEmail: 'cliente@economizaja.app',
      city: city.trim(),
      state: currentLocation.state || 'SP',
      neighborhood: neighborhood.trim() || 'Centro',
      categoryId,
      subcategory: subcategory || (currentCategoryObj?.subcategories[0] ?? ''),
      title: title.trim(),
      description: description.trim(),
      desiredDeadline,
      budgetRange: budgetRange.trim() || undefined,
    });

    setSubmittedId(newId);
  };

  const handleClose = () => {
    setIsQuoteModalOpen(false);
    setQuoteCategoryPreset(null);
    setSubmittedId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Sem Custo • Sem Compromisso</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Pedir Orçamentos</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedId ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Solicitação Enviada com Sucesso!</h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Empresas parceiras e profissionais qualificados em <strong>{city}</strong> já foram notificados sobre sua solicitação.
              Você receberá propostas na aba <strong>Cotações</strong>.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setComparingQuoteRequestId(submittedId);
                  handleClose();
                  setActiveTab('quotes');
                }}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition"
              >
                Ver Cotação & Propostas
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition"
              >
                Continuar Navegando
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            
            {/* O que precisa? */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                O que você precisa? <span className="text-rose-500">*</span>
              </label>
              <input
                id="quote-input-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Preciso trocar o telhado de uma casa de aprox. 100m²"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800 bg-slate-50/50"
              />
            </div>

            {/* Categoria & Subcategoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    const found = CATEGORIES.find((c) => c.id === e.target.value);
                    if (found && found.subcategories.length > 0) {
                      setSubcategory(found.subcategories[0]);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Especialidade / Tipo</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  {currentCategoryObj?.subcategories.map((sub, idx) => (
                    <option key={idx} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cidade & Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Cidade <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>
            </div>

            {/* Descrição Detalhada */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Descrição detalhada <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva detalhes como medidas aproximadas, estado atual, se você já possui materiais ou se precisa do fornecimento..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
              />
            </div>

            {/* Prazo Desejado & Faixa de Preço */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Prazo desejado</label>
                <select
                  value={desiredDeadline}
                  onChange={(e) => setDesiredDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Urgente (hoje ou amanhã)">Urgente (hoje ou amanhã)</option>
                  <option value="O quanto antes (próximos 3 dias)">O quanto antes (próximos 3 dias)</option>
                  <option value="Nas próximas 2 semanas">Nas próximas 2 semanas</option>
                  <option value="Apenas pesquisando / Sem pressa">Apenas pesquisando / Sem pressa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Faixa de preço estimada (opcional)</label>
                <input
                  type="text"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                  placeholder="Ex: Até R$ 1.500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                />
              </div>
            </div>

            {/* Seus dados para contato */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 block mb-2">Dados para receber as propostas:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
                <input
                  type="tel"
                  placeholder="Seu WhatsApp para contato"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>
            </div>

            <button
              id="btn-submit-quote"
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide transition shadow-md shadow-emerald-600/20 active:scale-98 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ENVIAR SOLICITAÇÃO DE ORÇAMENTO</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
