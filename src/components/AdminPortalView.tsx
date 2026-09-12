import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessAvatar } from './BusinessAvatar';
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
  QrCode,
  Save,
  Phone,
  CreditCard,
  Check,
  ExternalLink,
  Info,
  Clock,
} from 'lucide-react';
import { dataService } from '../services/dataService';

export const AdminPortalView: React.FC = () => {
  const {
    currentUser,
    businesses,
    offers,
    quoteRequests,
    monetization,
    updateMonetization,
    toggleBusinessActive,
    toggleBusinessVerified,
    toggleBusinessFeatured,
    removeOffer,
    deleteBusiness,
  } = useApp();

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
        <p className="text-slate-500 mt-2">Esta área é restrita a administradores do sistema.</p>
      </div>
    );
  }

  const [adminTab, setAdminTab] = useState<'empresas' | 'ofertas' | 'leads' | 'assinaturas' | 'monetizacao'>('empresas');

  // Pending monetization state
  const [pendingItems, setPendingItems] = useState<{
    subscriptions: any[];
    featuredListings: any[];
    payments: any[];
  }>({ subscriptions: [], featuredListings: [], payments: [] });
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingMonetization = async () => {
    setIsLoadingPending(true);
    try {
      const data = await dataService.getAdminPendingMonetization();
      setPendingItems(data);
    } catch (e) {
      console.warn('Erro ao carregar itens pendentes:', e);
    } finally {
      setIsLoadingPending(false);
    }
  };

  React.useEffect(() => {
    fetchPendingMonetization();
  }, []);

  const handleApproveSubscription = async (subId: string) => {
    if (!confirm('Deseja confirmar o pagamento e ATIVAR esta assinatura?')) return;
    setProcessingId(subId);
    try {
      await dataService.confirmPlanSubscription(subId);
      alert('Assinatura ativada com sucesso!');
      await fetchPendingMonetization();
    } catch (err: any) {
      alert(`Erro ao ativar assinatura: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveFeatured = async (featId: string) => {
    if (!confirm('Deseja confirmar o pagamento e ATIVAR este destaque patrocinado?')) return;
    setProcessingId(featId);
    try {
      await dataService.confirmFeaturedListing(featId);
      alert('Destaque ativado com sucesso!');
      await fetchPendingMonetization();
    } catch (err: any) {
      alert(`Erro ao ativar destaque: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Form state for monetization & PIX settings
  const [formData, setFormData] = useState({
    costPerLead: monetization.costPerLead,
    packLeads5: monetization.packLeads5,
    packLeads20: monetization.packLeads20,
    planProMonthly: monetization.planProMonthly,
    planPremiumMonthly: monetization.planPremiumMonthly,
    featuredDailyRate: monetization.featuredDailyRate,
    platformCommissionPercent: monetization.platformCommissionPercent,
    adminPixKey: monetization.adminPixKey || 'pix@economizaja.com.br',
    adminPixKeyType: monetization.adminPixKeyType || 'email',
    adminPixBeneficiary: monetization.adminPixBeneficiary || 'EconomizaJá Intermediações e Tecnologia LTDA',
    adminPixBank: monetization.adminPixBank || 'Banco Inter / Nubank PJ',
    adminWhatsapp: monetization.adminWhatsapp || '5511999998888',
    adminReceiptInstructions:
      monetization.adminReceiptInstructions ||
      'Após efetuar o PIX, envie o comprovante para nosso WhatsApp com o nome da sua empresa para ativação em até 15 minutos.',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveMonetization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMonetization({
        costPerLead: Number(formData.costPerLead),
        packLeads5: Number(formData.packLeads5),
        packLeads20: Number(formData.packLeads20),
        planProMonthly: Number(formData.planProMonthly),
        planPremiumMonthly: Number(formData.planPremiumMonthly),
        featuredDailyRate: Number(formData.featuredDailyRate),
        platformCommissionPercent: Number(formData.platformCommissionPercent),
        adminPixKey: formData.adminPixKey,
        adminPixKeyType: formData.adminPixKeyType as any,
        adminPixBeneficiary: formData.adminPixBeneficiary,
        adminPixBank: formData.adminPixBank,
        adminWhatsapp: formData.adminWhatsapp,
        adminReceiptInstructions: formData.adminReceiptInstructions,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert(`Não foi possível salvar configurações: ${(err as Error).message}`);
    }
  };

  // Monetization calculations for real-world metrics
  const totalSubscribersRevenue = businesses.reduce((acc, b) => {
    const tier = (b.plan || b.planTier || 'gratis').toLowerCase();
    if (tier === 'pro') return acc + monetization.planProMonthly;
    if (tier === 'premium') return acc + monetization.planPremiumMonthly;
    return acc;
  }, 0);

  const totalProposalsCount = quoteRequests.reduce((acc, q) => acc + q.proposals.length, 0);
  const estimatedLeadsRevenue = totalProposalsCount * monetization.costPerLead;

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
            onClick={() => setAdminTab('assinaturas')}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              adminTab === 'assinaturas' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Cobranças & Assinaturas ({pendingItems.subscriptions.length + pendingItems.featuredListings.length})</span>
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
            <h3 className="text-base font-bold text-slate-900">Gerenciar Parceiros &amp; Moderação</h3>

            <span className="text-xs text-slate-500">
              Ative selos de verificação. Destaques pagos são gerenciados na aba <strong>Cobranças</strong>
            </span>
          </div>

          {/* AVISO CRÍTICO: Sobre o fluxo de destaque */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-amber-800">
              <strong>Atenção — Fluxo de Destaque Pago:</strong> Para ativar o destaque de uma empresa, vá para a aba{' '}
              <button
                onClick={() => setAdminTab('assinaturas')}
                className="underline font-bold text-amber-900 hover:text-amber-700"
              >
                Cobranças &amp; Assinaturas
              </button>{' '}
              e confirme o pagamento pendente recebido via PIX. O destaque só é ativado após confirmação real do pagamento.
            </div>
          </div>

          {businesses.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Building2 className="w-8 h-8 text-slate-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-900">Nenhuma empresa encontrada</h4>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Sua plataforma ainda não possui parceiros cadastrados. Quando as empresas se cadastrarem, elas aparecerão aqui para moderação.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {businesses.map((b) => (
              <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BusinessAvatar
                    src={b.logo}
                    name={b.name}
                    className="w-12 h-12 rounded-xl border border-slate-100 shadow-xs"
                    iconClassName="w-5 h-5 text-emerald-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{b.name}</h4>
                      <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        Plano: {b.plan || b.planTier || 'gratis'}
                      </span>
                      {/* Destaque: somente indicador visual — ativação é feita via pagamento confirmado */}
                      {b.featured && (
                        <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                          ⭐ Destaque Ativo
                          {b.featuredUntil && <span className="text-amber-600">até {b.featuredUntil}</span>}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {b.subcategory} • {b.neighborhood}, {b.city} • WhatsApp: {b.whatsapp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBusinessActive(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      b.active !== false
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                    title={b.active !== false ? 'Empresa ativa e visível no guia público' : 'Empresa suspensa (invisível ao público)'}
                  >
                    {b.active !== false ? '🟢 Ativa' : '⏸️ Suspensa'}
                  </button>

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

                  {/* REMOVIDO: botão "Tornar Destaque" que bypassa pagamento.
                      Para ativar destaque, use a aba Cobranças & Assinaturas → Confirmar pagamento PIX. */}

                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
                        deleteBusiness(b.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition"
                    title="Excluir parceiro"
                  >
                    Excluir Parceiro
                  </button>
                </div>
              </div>
            ))}
            </div>
          )}
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

          {offers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Tag className="w-8 h-8 text-slate-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-900">Nenhuma oferta cadastrada</h4>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Ainda não há ofertas ou promoções ativas na plataforma.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* TAB: LEADS */}
      {adminTab === 'leads' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Fluxo de Solicitações de Orçamento</h3>

          {quoteRequests.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-900">Nenhum orçamento solicitado</h4>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Os pedidos de orçamento dos clientes aparecerão aqui.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* TAB: COBRANÇAS & ASSINATURAS PENDENTES */}
      {adminTab === 'assinaturas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>Auditoria & Ativação de Pagamentos Pendentes</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Valide os comprovantes de PIX recebidos no WhatsApp e ative as assinaturas e destaques com segurança transacional
                </p>
              </div>

              <button
                onClick={fetchPendingMonetization}
                disabled={isLoadingPending}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>{isLoadingPending ? 'Atualizando...' : 'Atualizar Lista'}</span>
              </button>
            </div>

            {/* SEÇÃO 1: ASSINATURAS PENDENTES */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span>1. Assinaturas de Planos Aguardando Confirmação</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.2 rounded-full font-extrabold">
                  {pendingItems.subscriptions.length}
                </span>
              </h4>

              {pendingItems.subscriptions.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 text-xs text-slate-500">
                  Nenhuma solicitação de assinatura pendente no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingItems.subscriptions.map((sub) => {
                    const bizName = sub.businesses?.name || 'Empresa';
                    const cleanPhone = (sub.businesses?.whatsapp || '').replace(/\D/g, '');
                    return (
                      <div key={sub.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                              STATUS: PENDING
                            </span>
                            <span className="text-xs font-bold uppercase text-emerald-700">
                              PLANO {sub.plan_tier}
                            </span>
                            <span className="text-xs text-slate-400">
                              • Solicitado em {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{bizName}</h4>
                          <p className="text-xs text-slate-500">
                            Cidade: {sub.businesses?.city || 'Local'} • Provedor: {sub.billing_provider || 'PIX'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Ver WhatsApp</span>
                            </a>
                          )}

                          <button
                            disabled={processingId === sub.id}
                            onClick={() => handleApproveSubscription(sub.id)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{processingId === sub.id ? 'Ativando...' : 'Confirmar & Ativar Plano'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: DESTAQUES PATROCINADOS PENDENTES */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span>2. Destaques Patrocinados Aguardando Confirmação</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.2 rounded-full font-extrabold">
                  {pendingItems.featuredListings.length}
                </span>
              </h4>

              {pendingItems.featuredListings.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 text-xs text-slate-500">
                  Nenhuma solicitação de destaque pendente no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingItems.featuredListings.map((feat) => {
                    const bizName = feat.businesses?.name || 'Empresa';
                    const cleanPhone = (feat.businesses?.whatsapp || '').replace(/\D/g, '');
                    const days = Math.max(1, Math.round((new Date(feat.end_date).getTime() - new Date(feat.start_date).getTime()) / (1000 * 60 * 60 * 24)));
                    const totalCost = Number(feat.daily_cost) * days;

                    return (
                      <div key={feat.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                              STATUS: PENDING
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {days} dias • R$ {totalCost.toFixed(2)} (R$ {Number(feat.daily_cost).toFixed(2)}/dia)
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{bizName}</h4>
                          <p className="text-xs text-slate-500">
                            Cidade: {feat.businesses?.city || 'Local'} • Início agendado: {feat.start_date}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Ver WhatsApp</span>
                            </a>
                          )}

                          <button
                            disabled={processingId === feat.id}
                            onClick={() => handleApproveFeatured(feat.id)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{processingId === feat.id ? 'Ativando...' : 'Confirmar & Ativar Destaque'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MONETIZAÇÃO REAL & CONFIGURAÇÃO PIX */}
      {adminTab === 'monetizacao' && (
        <div className="space-y-6">
          {/* Alerta de Conformidade Google Play */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <strong className="text-amber-950 font-bold block text-sm">
                Diretriz de Pagamento Google Play vs Pagamento Web/PIX:
              </strong>
              <p>
                No aplicativo Android (instalado via Google Play Store), as compras digitais de assinaturas utilizam o Google Play Billing oficial.
              </p>
              <p>
                Os dados de <strong>PIX e WhatsApp</strong> configurados abaixo são exibidos para compras corporativas e parceiros que acessam via <strong>Web / Computador</strong> ou negociam diretamente com você, sem taxa de intermediação do Google.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveMonetization} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>Configurações de Recebimento via PIX & Preços</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina seus dados bancários para receber pagamentos de planos e leads das empresas parceiras
                </p>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Configurações salvas com sucesso!</span>
                </div>
              )}
            </div>

            {/* SEÇÃO 1: DADOS DO PIX */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                <span>Dados da Chave PIX (Para Receber dos Parceiros)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Chave PIX
                  </label>
                  <select
                    value={formData.adminPixKeyType}
                    onChange={(e) => setFormData({ ...formData, adminPixKeyType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="email">E-mail</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                    <option value="telefone">Telefone Celular</option>
                    <option value="aleatoria">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sua Chave PIX
                  </label>
                  <input
                    type="text"
                    value={formData.adminPixKey}
                    onChange={(e) => setFormData({ ...formData, adminPixKey: e.target.value })}
                    placeholder="ex: contato@suaempresa.com ou CNPJ"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Beneficiário / Titular
                  </label>
                  <input
                    type="text"
                    value={formData.adminPixBeneficiary}
                    onChange={(e) => setFormData({ ...formData, adminPixBeneficiary: e.target.value })}
                    placeholder="Seu Nome Completo ou Razão Social"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banco / Instituição Financeira
                  </label>
                  <input
                    type="text"
                    value={formData.adminPixBank}
                    onChange={(e) => setFormData({ ...formData, adminPixBank: e.target.value })}
                    placeholder="ex: Nubank, Banco Inter, Itaú"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp para Receber Comprovantes de Pagamento (com DDD)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.adminWhatsapp}
                    onChange={(e) => setFormData({ ...formData, adminWhatsapp: e.target.value })}
                    placeholder="ex: 5511999998888 (DDI + DDD + Número)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instruções exibidas para a empresa ao pagar
                  </label>
                  <textarea
                    rows={2}
                    value={formData.adminReceiptInstructions}
                    onChange={(e) => setFormData({ ...formData, adminReceiptInstructions: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: VALORES DE TABELA */}
            <div className="space-y-4 border-t border-slate-100 pt-5">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Tabela de Preços do Aplicativo (R$)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plano Pró Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.planProMonthly}
                    onChange={(e) => setFormData({ ...formData, planProMonthly: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plano Premium Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.planPremiumMonthly}
                    onChange={(e) => setFormData({ ...formData, planPremiumMonthly: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Avulso (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.costPerLead}
                    onChange={(e) => setFormData({ ...formData, costPerLead: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pacote 5 Leads (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.packLeads5}
                    onChange={(e) => setFormData({ ...formData, packLeads5: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pacote 20 Leads (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.packLeads20}
                    onChange={(e) => setFormData({ ...formData, packLeads20: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destaque Diário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.featuredDailyRate}
                    onChange={(e) => setFormData({ ...formData, featuredDailyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* BOTÃO SALVAR */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações de Recebimento</span>
              </button>
            </div>
          </form>

          {/* GUIA DE FATURAMENTO E MONETIZAÇÃO */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Fontes de Receita e Sustentabilidade do EconomizaJá
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-xs font-bold uppercase text-emerald-700">1. Venda de Leads Qualificados</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Empresas pagam por solicitação de orçamento detalhada enviada por clientes locais, com retorno comprovado.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-xs font-bold uppercase text-emerald-700">2. Assinaturas Recorrentes (SaaS)</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Planos Pró e Premium com propostas prioritárias, selo verificado e relatórios de concorrência.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-xs font-bold uppercase text-emerald-700">3. Destaque Patrocinado</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Prioridade máxima no topo das buscas nas cidades atendidas e banner na tela inicial.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-xs font-bold uppercase text-emerald-700">4. Afiliados & Publicidade Regional</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Banners regionais e parcerias com fornecedores de peças e insumos comissionados.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
