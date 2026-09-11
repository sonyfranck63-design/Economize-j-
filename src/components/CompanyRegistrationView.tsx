import React, { useState } from 'react';
import { Building2, MapPin, Phone, CheckCircle2, ChevronRight, Store, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSmartImage } from '../utils/imageUtils';

interface CompanyRegistrationViewProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const CompanyRegistrationView: React.FC<CompanyRegistrationViewProps> = ({ onComplete, onCancel }) => {
  const { createBusiness, currentUser, setIsAuthModalOpen, setUserRole } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ownerName: currentUser?.fullName || '',
    phone: '',
    whatsapp: '',
    categoryId: 'casa',
    subcategory: '',
    city: currentUser?.city || '',
    state: currentUser?.state || 'SP',
    neighborhood: '',
    address: '',
    description: '',
    photoUrl: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser?.id) {
      setError('Você precisa estar autenticado para cadastrar uma empresa. Faça login ou crie sua conta.');
      setUserRole('business');
      setIsAuthModalOpen(true);
      return;
    }

    if (!formData.name.trim()) {
      setError('Por favor, informe o nome comercial da empresa.');
      return;
    }

    if (!formData.phone.trim() && !formData.whatsapp.trim()) {
      setError('Por favor, informe pelo menos um telefone ou WhatsApp de contato.');
      return;
    }

    setIsSubmitting(true);

    const verifiedPhoto = formData.photoUrl.trim() || getSmartImage(formData.categoryId, `${formData.subcategory} ${formData.name}`);

    try {
      await createBusiness({
        ownerId: currentUser.id,
        name: formData.name.trim(),
        ownerName: formData.ownerName.trim() || currentUser.fullName || 'Responsável',
        email: currentUser.email || '',
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
        categoryId: formData.categoryId,
        subcategory: formData.subcategory.trim() || 'Serviços Gerais',
        city: formData.city.trim() || 'São Paulo',
        state: formData.state.trim() || 'SP',
        neighborhood: formData.neighborhood.trim() || 'Centro',
        address: formData.address.trim() || 'Não informado',
        description: formData.description.trim(),
        logo: verifiedPhoto,
        coverImage: verifiedPhoto,
        photos: [verifiedPhoto],
        rating: 5,
        reviewCount: 0,
        verified: false,
        featured: false,
        openNow: true,
        workingHours: 'Seg a Sex: 08h às 18h',
        distanceKm: 0,
        plan: 'gratis',
        isDemo: false,
        services: [],
        products: [],
      });
      
      onComplete();
    } catch (err: any) {
      console.error('Erro ao cadastrar empresa:', err);
      setError(err.message || 'Ocorreu um erro ao cadastrar a empresa no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Autenticação Necessária</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Para vincular a empresa ao seu perfil e salvar com segurança no sistema, faça login ou cadastre-se como empresa parceira.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => { setUserRole('business'); setIsAuthModalOpen(true); }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
          >
            Entrar ou Criar Conta de Empresa
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in pb-24">
      <div className="mb-6">
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1">
          &larr; Voltar
        </button>
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
          <Store className="w-6 h-6 text-emerald-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Cadastre seu Negócio</h1>
        <p className="text-slate-500 mt-1">
          Preencha os dados abaixo para criar o perfil da sua empresa na plataforma e começar a receber orçamentos.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Informações Básicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Empresa / Negócio *</label>
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Hidráulica Silva"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Responsável *</label>
              <input
                required
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Ex: João da Silva"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefone Principal *</label>
              <input
                required
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(00) 0000-0000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp (se diferente)</label>
              <input
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="(00) 90000-0000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição Breve do Negócio *</label>
            <textarea
              required
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva rapidamente o que sua empresa faz..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm resize-none"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Categoria & Localização</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoria Principal *</label>
              <select
                required
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm bg-white"
              >
                <option value="automotivo">Automotivo & Mecânica</option>
                <option value="casa">Casa, Reformas & Hidráulica</option>
                <option value="saude">Saúde & Beleza</option>
                <option value="alimentacao">Alimentação & Gastronomia</option>
                <option value="tecnologia">Tecnologia & Consertos</option>
                <option value="servicos">Serviços Gerais</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Especialidade (Opcional)</label>
              <input
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                placeholder="Ex: Encanador 24h"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cidade *</label>
              <input
                required
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bairro *</label>
              <input
                required
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                placeholder="Ex: Centro"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Foto de Capa / Logotipo (Opcional)</h2>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Automático Inteligente</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL da Imagem da Empresa</label>
            <input
              name="photoUrl"
              value={formData.photoUrl}
              onChange={handleChange}
              placeholder="https://exemplo.com/foto-empresa.jpg (Opcional)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Se deixar em branco, o sistema selecionará uma foto profissional em alta resolução de acordo com sua categoria ({formData.categoryId}).
            </p>
          </div>

          {/* Preview da foto */}
          <div className="rounded-xl border border-slate-100 p-3 bg-slate-50 flex items-center gap-3">
            <img
              src={formData.photoUrl.trim() || getSmartImage(formData.categoryId, `${formData.subcategory} ${formData.name}`)}
              alt="Prévia"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-lg object-cover border border-slate-200"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-700 block">Prévia da Foto da Empresa</span>
              <span className="text-slate-400 text-[11px]">
                {formData.photoUrl.trim() ? 'Foto personalizada informada' : 'Foto profissional automática atribuída'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Cadastrando...' : 'Finalizar Cadastro da Empresa'}
          {!isSubmitting && <ChevronRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
