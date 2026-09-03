import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Tag,
  CheckCircle2,
  XCircle,
  FileText,
  SlidersHorizontal,
  Lock,
  Download,
  AlertTriangle,
} from 'lucide-react';

export const AdminPortalView: React.FC = () => {
  const {
    businesses,
    offers,
    quoteRequests,
    toggleBusinessVerified,
    toggleBusinessFeatured,
    removeOffer,
  } = useApp();

  const [adminTab, setAdminTab] = useState<'empresas' | 'ofertas' | 'leads' | 'monetizacao'>('empresas');

  // Monetization calculations for real-world metrics
  const totalSubscribersRevenue = businesses.reduce((acc, b) => {
    if (b.planTier === 'pro') return acc + 59.9;
    if (b.planTier === 'premium') return acc + 119.9;
    return acc;
  }, 0);

  const totalProposalsCount = quoteRequests.reduce((acc, q) => acc + q.proposals.length, 0);
  const estimatedLeadsRevenue = totalProposalsCount * 12.5; // Average R$ 12.50 per qualified lead proposal

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-md border border-slate-700">
                SISTEMA OPERACIONAL
              </span>
              <span className="text-xs text-slate-400 font-medium">EconomizaJá v1.0.0</span>
            </div>
            <h2 className="text-2xl font-bold mt-1 text-white">Painel Administrativo & Monetização</h2>
            <p className="text-xs text-slate-400">
              Gestão de parceiros, moderação de ofertas, controle de receita de leads e assinaturas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-950/60 text-emerald-300 font-semibold px-3 py-1.5 rounded-xl border border-emerald-800/80 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Ambiente Seguro Google Play
            </span>
          </div>
        </div>

        {/* Global Business Revenue Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Receita de Assinaturas
            </span>
            <span className="text-xl font-bold text-emerald-400 block mt-1">
              R$ {totalSubscribersRevenue.toFixed(2)}/mês
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Venda de Leads (Est.)
            </span>
            <span className="text-xl font-bold text-amber-300 block mt-1">
              R$ {estimatedLeadsRevenue.toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Empresas Ativas
            </span>
            <span className="text-xl font-bold text-white block mt-1">{businesses.length}</span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Cotações & Propostas
            </span>
            <span className="text-xl font-bold text-white block mt-1">
              {quoteRequests.length} ({totalProposalsCount} propostas)
            </span>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setAdminTab('empresas')}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              adminTab === 'empresas' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Empresas & Moderação ({businesses.length})
          </button>
          <button
            onClick={() => setAdminTab('ofertas')}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              adminTab === 'ofertas' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Ofertas & Promoções ({offers.length})
          </button>
          <button
            onClick={() => setAdminTab('leads')}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              adminTab === 'leads' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Orçamentos / Leads ({quoteRequests.length})
          </button>
          <button
            onClick={() => setAdminTab('monetizacao')}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              adminTab === 'monetizacao' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Estratégia de Monetização Real
          </button>
        </div>
      </div>

      {/* TAB: EMPRESAS */}
      {adminTab === 'empresas' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Gerenciar Parceiros & Moderação</h3>
            <span className="text-xs text-slate-500">
              Ative selos de verificação ou destaque pago conforme contratado
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {businesses.map((b) => (
              <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={b.logo}
                    alt={b.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{b.name}</h4>
                      <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        Plano: {b.planTier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {b.subcategory} • {b.neighborhood}, {b.city} • WhatsApp: {b.whatsapp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBusinessVerified(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      b.verified
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b.verified ? '✓ Verificada' : 'Não Verificada'}
                  </button>

                  <button
                    onClick={() => toggleBusinessFeatured(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      b.featured
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b.featured ? '⭐ Destaque Ativo' : 'Tornar Destaque'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: OFERTAS */}
      {adminTab === 'ofertas' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Moderação de Ofertas Ativas</h3>
            <span className="text-xs text-slate-500">
              Remova ofertas enganosas ou expiradas para manter alta confiabilidade
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {offers.map((o) => (
              <div key={o.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700">{o.businessName}</span>
                    <span className="text-xs text-slate-400">• Válido até {o.validUntil}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-0.5">{o.title}</h4>
                  <p className="text-xs text-slate-500">{o.description}</p>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    R$ {o.currentPrice.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => removeOffer(o.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition self-start sm:self-auto"
                >
                  Moderar / Remover Oferta
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: LEADS */}
      {adminTab === 'leads' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Fluxo de Solicitações de Orçamento</h3>

          <div className="space-y-3">
            {quoteRequests.map((q) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-700">{q.categoryId}</span>
                    <h4 className="font-bold text-sm text-slate-900">{q.title}</h4>
                  </div>
                  <span className="text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200 font-bold text-slate-800 shadow-xs">
                    {q.proposals.length} propostas enviadas
                  </span>
                </div>
                <p className="text-xs text-slate-600">{q.description}</p>
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Solicitante: {q.userName} ({q.city})</span>
                  <span>Status: <strong>{q.status}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: MONETIZAÇÃO REAL */}
      {adminTab === 'monetizacao' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Fontes de Receita e Sustentabilidade do EconomizaJá
            </h3>
            <p className="text-xs text-slate-500">
              Conforme definido no modelo de negócios do prompt (Itens 13 e 16):
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-xs font-bold uppercase text-emerald-700">1. Venda de Leads Qualificados</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Empresas podem pagar entre R$ 5,00 e R$ 25,00 por solicitação de orçamento detalhada enviada por clientes locais, garantindo retorno sobre investimento.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-xs font-bold uppercase text-emerald-700">2. Assinaturas Recorrentes (SaaS)</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Planos Pró (R$ 59,90/mês) e Premium (R$ 119,90/mês) com envio ilimitado de propostas e relatórios avançados de concorrência.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-xs font-bold uppercase text-emerald-700">3. Destaque Patrocinado</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prioridade no topo das buscas nas cidades atendidas e banner na tela inicial para empresas que desejam máxima visibilidade.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-xs font-bold uppercase text-emerald-700">4. Afiliados & Publicidade Regional</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Links para lojas de e-commerce e peças automotivas, além de banners de publicidade de grandes redes regionais.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
