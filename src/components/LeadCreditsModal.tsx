import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  TrendingUp,
  Copy,
  Check,
  Phone,
  QrCode,
  Building2,
  ShieldCheck,
  CreditCard,
  Crown,
  Info,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildWhatsAppLink } from '../utils/whatsappUtils';
import { Business } from '../types';
import { Capacitor } from '@capacitor/core';

interface LeadCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onOpenPlansTab?: () => void;
}

export type LeadPackType = 'single' | 'pack5' | 'pack20';

export const LeadCreditsModal: React.FC<LeadCreditsModalProps> = ({
  isOpen,
  onClose,
  business,
  onOpenPlansTab,
}) => {
  const { monetization } = useApp();
  const isNativeAndroid = Capacitor.isNativePlatform();

  const [selectedPack, setSelectedPack] = useState<LeadPackType>('pack5');
  const [copiedPix, setCopiedPix] = useState(false);

  if (!isOpen || !business) return null;

  // Valores dinâmicos da tabela de configurações
  const costSingle = monetization.costPerLead || 15.0;
  const costPack5 = monetization.packLeads5 || 59.9;
  const costPack20 = monetization.packLeads20 || 199.9;

  const getPackDetails = (type: LeadPackType) => {
    switch (type) {
      case 'single':
        return {
          title: 'Lead Avulso (1 Oportunidade)',
          shortName: '1 Lead Avulso',
          leadsCount: 1,
          price: costSingle,
          pricePerLead: costSingle,
          badge: 'Flexível',
          badgeColor: 'bg-slate-100 text-slate-700',
          description: 'Ideal para responder a uma cotação específica sem compromisso.',
        };
      case 'pack5':
        return {
          title: 'Pacote Econômico (5 Leads)',
          shortName: 'Pacote de 5 Leads',
          leadsCount: 5,
          price: costPack5,
          pricePerLead: costPack5 / 5,
          badge: 'Mais Escolhido',
          badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold',
          description: 'Excelente custo-benefício para pequenas empresas e oficinas locais.',
        };
      case 'pack20':
        return {
          title: 'Pacote Pro / Turbo (20 Leads)',
          shortName: 'Pacote de 20 Leads',
          leadsCount: 20,
          price: costPack20,
          pricePerLead: costPack20 / 20,
          badge: 'Maior Economia',
          badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold',
          description: 'Para alta demanda. Garanta o menor custo unitário por oportunidade.',
        };
    }
  };

  const activeDetails = getPackDetails(selectedPack);

  const pixKey = monetization.adminPixKey || 'pix@economizaja.com.br';
  const pixKeyType = monetization.adminPixKeyType || 'E-mail';
  const pixBeneficiary = monetization.adminPixBeneficiary || 'EconomizaJá Intermediações e Tecnologia LTDA';
  const pixBank = monetization.adminPixBank || 'Banco Digital / PJ';
  const adminPhone = monetization.adminWhatsapp || '5511999998888';
  const receiptNotes =
    monetization.adminReceiptInstructions ||
    'Após realizar o PIX, envie o comprovante pelo WhatsApp com o nome da sua empresa para liberação imediata dos seus créditos.';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const whatsAppMessage = `Olá! Acabei de comprar o ${activeDetails.shortName} (R$ ${activeDetails.price.toFixed(
    2
  )}) para a empresa *${business.name}* no EconomizaJá. Segue o comprovante:`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      {/* Backdrop com fechamento */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 border border-slate-100 z-10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho com botão fechar explícito 44x44px */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                Créditos Comerciais
              </span>
              <span className="text-xs text-slate-400 font-medium">EconomizaJá Parceiros</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              Comprar Saldo de Leads
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Empresa: <strong className="text-slate-800">{business.name}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Empresa / Saldo Atual de Leads */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700">
              Plano: <strong className="uppercase">{business.plan || 'Gratuito'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl font-bold border border-amber-300">
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Saldo: {business.leadCredits || 0} crédito(s)</span>
          </div>
        </div>

        {/* SELEÇÃO DE PACOTES (VITRINE) */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Escolha o Pacote Desejado:
          </label>

          {/* Pacote 1: Avulso */}
          <div
            onClick={() => setSelectedPack('single')}
            className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
              selectedPack === 'single'
                ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">1 Lead Avulso</span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 text-slate-600">
                  Sem mensalidade
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Responda a 1 orçamento específico</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black text-slate-900">
                R$ {costSingle.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Pacote 2: 5 Leads (Destaque) */}
          <div
            onClick={() => setSelectedPack('pack5')}
            className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-3 relative ${
              selectedPack === 'pack5'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Pacote de 5 Leads</span>
                <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Mais Vendido
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                R$ {(costPack5 / 5).toFixed(2)} por lead
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black text-emerald-700">
                R$ {costPack5.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Pacote 3: 20 Leads */}
          <div
            onClick={() => setSelectedPack('pack20')}
            className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
              selectedPack === 'pack20'
                ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-2 ring-amber-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Pacote de 20 Leads</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-amber-100 text-amber-900">
                  Melhor Custo Unitário
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Apenas R$ {(costPack20 / 20).toFixed(2)} por lead
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black text-slate-900">
                R$ {costPack20.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* DADOS DE PAGAMENTO: GOOGLE PLAY NO ANDROID OU PIX NA WEB */}
        {isNativeAndroid ? (
          <div className="border border-blue-200 bg-blue-50/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase">
              <Smartphone className="w-4 h-4 text-blue-700" />
              <span>Google Play & Faturamento Digital</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              No aplicativo Android, em conformidade com as diretrizes da Google Play Store, transações de produtos digitais são integradas ao ecossistema do Google Play.
            </p>
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Recomendado: Propostas Ilimitadas</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Assine o <strong>Plano Pró</strong> com cobrança mensal gerenciada com segurança pelo Google Play para enviar orçamentos ilimitados, sem se preocupar com recargas de saldo.
              </p>
              {onOpenPlansTab && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPlansTab();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Conhecer Planos no Google Play</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              Para pacotes avulsos de créditos sob demanda via PIX, acesse sua conta pelo portal web no navegador.
            </p>
          </div>
        ) : (
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>Pagamento via PIX</span>
              </span>
              <span className="text-xs font-extrabold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                Total: R$ {activeDetails.price.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Chave PIX e Botão Copiar */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Chave PIX ({pixKeyType})
                  </span>
                  <strong className="text-slate-900 text-xs font-mono truncate block">
                    {pixKey}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs shrink-0 active:scale-95 min-h-[40px]"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Chave</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dados Bancários */}
              {pixBeneficiary && (
                <p className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-emerald-100">
                  <strong>Favorecido:</strong> {pixBeneficiary}
                  <br />
                  <strong>Instituição:</strong> {pixBank}
                </p>
              )}

              {/* Instruções */}
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {receiptNotes}
              </p>
            </div>

            {/* Botão de WhatsApp */}
            {adminPhone && (
              <a
                href={buildWhatsAppLink(adminPhone, whatsAppMessage)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs active:scale-95 min-h-[44px]"
              >
                <Phone className="w-4 h-4" />
                <span>Enviar Comprovante pelo WhatsApp</span>
              </a>
            )}
          </div>
        )}

        {/* OPÇÃO ALTERNATIVA: PLANO COM LEADS ILIMITADOS (APENAS NA WEB) */}
        {!isNativeAndroid && onOpenPlansTab && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Prefere propostas ilimitadas?</span>
              </span>
              <p className="text-[11px] text-slate-500">
                Assine o Plano Pró por R$ {monetization.planProMonthly.toFixed(2)}/mês e envie propostas sem limites.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPlansTab();
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shrink-0 active:scale-95"
            >
              Ver Planos
            </button>
          </div>
        )}

        {/* Rodapé Fechar */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition min-h-[44px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
