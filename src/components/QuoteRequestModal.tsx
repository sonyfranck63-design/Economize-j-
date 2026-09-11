import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import { X, PlusCircle, CheckCircle2, ShieldAlert, Sparkles, Upload, AlertCircle, LogIn, User } from 'lucide-react';

export const QuoteRequestModal: React.FC = () => {
  const {
    isQuoteModalOpen,
    setIsQuoteModalOpen,
    createQuoteRequest,
    currentLocation,
    quoteCategoryPreset,
    quoteTargetBusinessId,
    setQuoteTargetBusinessId,
    setQuoteCategoryPreset,
    setActiveTab,
    setComparingQuoteRequestId,
    currentUser,
    businesses,
    setIsAuthModalOpen,
    setUserRole,
  } = useApp();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(quoteCategoryPreset || 'casa');
  const [subcategory, setSubcategory] = useState('');
  const [city, setCity] = useState(currentLocation.city);
  const [neighborhood, setNeighborhood] = useState(currentLocation.neighborhood);
  const [description, setDescription] = useState('');
  const [desiredDeadline, setDesiredDeadline] = useState('O quanto antes (próximos 3 dias)');
  const [budgetRange, setBudgetRange] = useState('');
  const [userName, setUserName] = useState(currentUser?.fullName || '');
  const [userPhone, setUserPhone] = useState(currentUser?.phone || '');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quoteCategoryPreset) {
      setCategoryId(quoteCategoryPreset);
    }
  }, [quoteCategoryPreset]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName && !userName) setUserName(currentUser.fullName);
      if (currentUser.phone && !userPhone) setUserPhone(currentUser.phone);
    }
  }, [currentUser]);

  const handleClose = () => {
    setIsQuoteModalOpen(false);
    setQuoteCategoryPreset(null);
    setQuoteTargetBusinessId(null);
    setSubmittedId(null);
  };

  // Bloqueia scroll do body enquanto modal está aberto para impedir que a página suba ou se mova
  useEffect(() => {
    if (isQuoteModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isQuoteModalOpen]);

  // Adiciona suporte a fechar com ESC para acessibilidade
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  if (!isQuoteModalOpen) return null;

  const currentCategoryObj = CATEGORIES.find((c) => c.id === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser?.id) {
      setError('Para enviar sua solicitação de orçamento com segurança, faça login ou cadastre sua conta.');
      setUserRole('customer');
      setIsAuthModalOpen(true);
      return;
    }

    if (!title.trim()) {
      setError('Por favor, informe o título do serviço ou produto.');
      return;
    }

    if (!description.trim()) {
      setError('Por favor, descreva o que você precisa.');
      return;
    }

    if (!city.trim()) {
      setError('Por favor, informe a cidade do atendimento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newId = await createQuoteRequest({
        userId: currentUser.id,
        targetBusinessId: quoteTargetBusinessId || undefined,
        userName: userName.trim() || currentUser.fullName || 'Cliente EconomizaJá',
        userPhone: userPhone.trim() || currentUser.phone || '(11) 99999-8888',
        userEmail: currentUser.email || 'cliente@economizaja.app',
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
    } catch (err: any) {
      console.error('Erro ao enviar solicitação de orçamento:', err);
      setError(err.message || 'Erro ao registrar solicitação de orçamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      {/* Background Overlay */}
      <div className="fixed inset-0" onClick={handleClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh] my-auto overflow-hidden">
        
        {/* Header - Totalmente Fixo e Acessível */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-6 border-b border-slate-100 bg-white shrink-0">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Sem Custo • Sem Compromisso</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">Pedir Orçamentos</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Fechar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {quoteTargetBusinessId && businesses.find(b => b.id === quoteTargetBusinessId) && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 text-sm text-emerald-800">
              <ShieldAlert className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span><strong>Orçamento exclusivo para:</strong> {businesses.find(b => b.id === quoteTargetBusinessId)?.name}</span>
            </div>
          )}

          {submittedId ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Solicitação Enviada com Sucesso!</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Empresas parceiras e profissionais qualificados em <strong>{city}</strong> já foram notificados sobre sua solicitação.
                Você receberá propostas na aba <strong>Cotações</strong>.
              </p>
              <div className="pt-4 pb-2 text-left max-w-sm mx-auto bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-sm">
                  <span className="text-slate-500 font-medium block">Solicitante:</span>
                  <span className="font-bold text-slate-900 block mb-3">{userName || currentUser?.fullName || 'Consumidor'}</span>
                  
                  <span className="text-slate-500 font-medium block">Destinatário:</span>
                  <span className="font-bold text-slate-900 block">
                    {quoteTargetBusinessId && businesses.find(b => b.id === quoteTargetBusinessId) 
                      ? businesses.find(b => b.id === quoteTargetBusinessId)?.name 
                      : 'Geral (Múltiplas Empresas)'}
                  </span>
                </div>
              </div>

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
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{error}</p>
                    {!currentUser && (
                      <button
                        type="button"
                        onClick={() => { setUserRole('customer'); setIsAuthModalOpen(true); }}
                        className="mt-1.5 font-bold text-rose-800 underline block text-left"
                      >
                        Clique aqui para entrar ou cadastrar-se agora
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!currentUser && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-800">
                  <span className="leading-tight">Você precisa estar conectado para registrar o pedido.</span>
                  <button
                    type="button"
                    onClick={() => { setUserRole('customer'); setIsAuthModalOpen(true); }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 shadow-xs"
                  >
                    Entrar / Cadastrar
                  </button>
                </div>
              )}
              
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
                      if (found && (found.subcategories || []).length > 0) {
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
                    {(currentCategoryObj?.subcategories || []).map((sub, idx) => (
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

              {/* Seus dados para contato (Consumidor) */}
              <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Seus dados de contato (Cliente / Solicitante):
                  </span>
                  <span className="text-[10px] bg-slate-200/70 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                    Consumidor
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  As empresas cadastradas que atenderem este serviço responderão diretamente para este nome e WhatsApp com suas propostas:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Seu Nome (Consumidor)
                    </label>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Seu WhatsApp (para receber propostas)
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: (11) 99999-8888"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <button
                id="btn-submit-quote"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition shadow-md shadow-emerald-600/20 active:scale-98 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'ENVIANDO SOLICITAÇÃO...' : 'ENVIAR SOLICITAÇÃO DE ORÇAMENTO'}</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
