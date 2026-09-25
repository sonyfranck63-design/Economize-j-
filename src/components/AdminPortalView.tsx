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
  Activity,
  RefreshCw,
  User,
  Trash2,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { buildWhatsAppLink } from '../utils/whatsappUtils';

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
    refreshBusinesses,
    addLeadCredits,
    adminActivatePlan,
  } = useApp();

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  ATENÇÃO: TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN     ║
  // ║  Regra dos Hooks do React: nunca chame hooks condicionalmente.   ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const [adminTab, setAdminTab] = useState<'empresas' | 'ofertas' | 'leads' | 'assinaturas' | 'monetizacao' | 'auditoria' | 'moderacao'>('empresas');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  // Cotações globais para auditoria administrativa independente
  const [adminQuotes, setAdminQuotes] = useState<any[]>([]);
  const [isLoadingAdminQuotes, setIsLoadingAdminQuotes] = useState<boolean>(false);

  // Estado dos logs de auditoria
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Moderação de Conteúdo (UGC)
  const [contentReports, setContentReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [moderatingReportId, setModeratingReportId] = useState<string | null>(null);

  // Ativação Manual de Plano para suporte/regularização com auditoria
  const [manualPlanBiz, setManualPlanBiz] = useState<any | null>(null);
  const [manualPlanTier, setManualPlanTier] = useState<'pro' | 'premium' | 'free'>('pro');
  const [manualPlanReason, setManualPlanReason] = useState<string>('');
  const [manualPlanDuration, setManualPlanDuration] = useState<number>(30);
  const [isSubmittingManualPlan, setIsSubmittingManualPlan] = useState<boolean>(false);

  // Pending monetization state
  const [pendingItems, setPendingItems] = useState<{
    subscriptions: any[];
    featuredListings: any[];
    payments: any[];
  }>({ subscriptions: [], featuredListings: [], payments: [] });
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Estados do Modal de Destaque Administrativo (Auditoria Real)
  const [highlightTargetBiz, setHighlightTargetBiz] = useState<any | null>(null);
  const [highlightDays, setHighlightDays] = useState<number>(7);
  const [highlightNotes, setHighlightNotes] = useState<string>('PIX conferido pelo administrador');
  const [isSubmittingHighlight, setIsSubmittingHighlight] = useState<boolean>(false);

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

  // --- Funções de busca de dados (definidas antes dos useEffect) ---

  const fetchAdminQuotes = async () => {
    setIsLoadingAdminQuotes(true);
    try {
      const data = await dataService.getAllQuoteRequestsForAdmin();
      setAdminQuotes(data || []);
    } catch (e) {
      console.warn('Erro ao carregar cotações de auditoria do admin:', e);
    } finally {
      setIsLoadingAdminQuotes(false);
    }
  };

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

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await dataService.getAdminActionLogs(150);
      setAuditLogs(logs);
    } catch (e) {
      console.warn('Erro ao carregar logs de auditoria:', e);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const fetchContentReports = async () => {
    setIsLoadingReports(true);
    try {
      const data = await dataService.adminGetContentReports('ALL');
      setContentReports(data || []);
    } catch (e) {
      console.warn('Erro ao carregar denúncias:', e);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // --- useEffects (todos antes do early return) ---

  React.useEffect(() => {
    // Só carrega dados se o usuário for admin — evita chamadas desnecessárias
    if (currentUser?.role !== 'admin') return;
    fetchAdminQuotes();
    fetchPendingMonetization();
    fetchContentReports();
  }, []);

  React.useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    if (adminTab === 'leads') {
      fetchAdminQuotes();
    }
    if (adminTab === 'auditoria' && auditLogs.length === 0) {
      fetchAuditLogs();
    }
    if (adminTab === 'moderacao') {
      fetchContentReports();
    }
  }, [adminTab]);

  // --- Guard: acesso negado (APÓS todos os hooks) ---
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
        <p className="text-slate-500 mt-2">Esta área é restrita a administradores do sistema.</p>
      </div>
    );
  }

  // --- Handlers (após o guard, pois não são hooks) ---

  const handleConfirmManualPlan = async () => {
    if (!manualPlanBiz) return;
    if (!manualPlanReason || manualPlanReason.trim().length < 3) {
      alert('Informe uma justificativa detalhada para a ativação administrativa do plano.');
      return;
    }
    setIsSubmittingManualPlan(true);
    try {
      await adminActivatePlan(manualPlanBiz.id, manualPlanTier, manualPlanReason, manualPlanDuration);
      await refreshBusinesses?.();
      alert(`Plano ${manualPlanTier.toUpperCase()} ativado com sucesso para "${manualPlanBiz.name}" por ${manualPlanDuration} dias!`);
      setManualPlanBiz(null);
      setManualPlanReason('');
      await fetchPendingMonetization();
    } catch (err: any) {
      alert(`Erro ao ativar plano administrativamente: ${err.message}`);
    } finally {
      setIsSubmittingManualPlan(false);
    }
  };

  const handleModerateReport = async (
    reportId: string,
    action: 'DISMISS' | 'HIDE_CONTENT' | 'SUSPEND_USER',
    notes?: string
  ) => {
    setModeratingReportId(reportId);
    try {
      await dataService.adminModerateContent(reportId, action, notes);
      alert('Ação de moderação executada com sucesso.');
      await fetchContentReports();
    } catch (err: any) {
      alert(`Erro na moderação: ${err.message}`);
    } finally {
      setModeratingReportId(null);
    }
  };

  const handleConfirmAdminHighlight = async () => {
    if (!highlightTargetBiz) return;
    setIsSubmittingHighlight(true);
    try {
      await toggleBusinessFeatured(highlightTargetBiz.id, highlightDays, highlightNotes);
      await refreshBusinesses?.();
      alert(`Destaque para a empresa "${highlightTargetBiz.name}" ativado com sucesso por ${highlightDays} dias!`);
      setHighlightTargetBiz(null);
      await fetchPendingMonetization();
    } catch (err: any) {
      alert(`Erro ao ativar destaque: ${err.message}`);
    } finally {
      setIsSubmittingHighlight(false);
    }
  };

  const handleApproveSubscription = async (subId: string) => {
    if (!confirm('Deseja confirmar o pagamento e ATIVAR esta assinatura?')) return;
    setProcessingId(subId);
    try {
      await dataService.confirmPlanSubscription(subId);
      await refreshBusinesses?.();
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
      await refreshBusinesses?.();
      alert('Destaque ativado com sucesso!');
      await fetchPendingMonetization();
    } catch (err: any) {
      alert(`Erro ao ativar destaque: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectFeatured = async (featId: string) => {
    if (!confirm('Deseja descartar/remover esta solicitação de destaque pendente?')) return;
    setProcessingId(featId);
    try {
      await dataService.rejectFeaturedListing(featId);
      alert('Solicitação de destaque descartada com sucesso.');
      await fetchPendingMonetization();
    } catch (err: any) {
      alert(`Erro ao descartar destaque: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubscription = async (subId: string) => {
    if (!confirm('Deseja descartar/remover esta solicitação de assinatura pendente?')) return;
    setProcessingId(subId);
    try {
      await dataService.rejectSubscription(subId);
      alert('Solicitação de assinatura descartada com sucesso.');
      await fetchPendingMonetization();
    } catch (err: any) {
      alert(`Erro ao descartar assinatura: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

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

  const displayQuotes = adminQuotes.length > 0 ? adminQuotes : quoteRequests;
  const totalProposalsCount = displayQuotes.reduce((acc, q) => acc + (q.proposals || []).length, 0);
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
            Orçamentos / Leads ({displayQuotes.length})
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
          <button
            onClick={() => setAdminTab('auditoria')}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              adminTab === 'auditoria' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auditoria de Ações</span>
          </button>
          <button
            onClick={() => setAdminTab('moderacao')}
            className={`px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              adminTab === 'moderacao' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Moderação UGC ({contentReports.filter(r => r.status === 'PENDING').length})</span>
          </button>
        </div>
      </div>

      {/* TAB: EMPRESAS */}
      {adminTab === 'empresas' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
          {/* Cabeçalho responsivo */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-bold text-slate-900">Gerenciar Parceiros &amp; Moderação</h3>
            <span className="text-xs text-slate-500">
              Ative selos de verificação. Destaques pagos são gerenciados na aba{' '}
              <button
                onClick={() => setAdminTab('assinaturas')}
                className="underline font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Cobranças
              </button>
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
              <div key={b.id} className="py-4 flex flex-col gap-3">
                {/* Linha 1: Avatar + Informações da empresa */}
                <div className="flex items-start gap-3">
                  <BusinessAvatar
                    src={b.logo}
                    name={b.name}
                    className="w-11 h-11 rounded-xl border border-slate-100 shadow-xs flex-shrink-0"
                    iconClassName="w-5 h-5 text-emerald-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900 truncate max-w-[140px] sm:max-w-none">{b.name}</h4>
                      <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md whitespace-nowrap">
                        PLANO: {(b.plan || b.planTier || 'gratis').toUpperCase()}
                      </span>
                      <span className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                        LEADS: {b.leadCredits || 0} CRÉDITOS
                      </span>
                      {/* Destaque: somente indicador visual — ativação é feita via pagamento confirmado */}
                      {b.featured && (
                        <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 whitespace-nowrap">
                          ⭐ DESTAQUE ATIVO
                          {b.featuredUntil && <span className="text-amber-600 font-semibold">ATÉ {b.featuredUntil}</span>}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {b.subcategory} • {b.neighborhood}, {b.city} • WhatsApp: {b.whatsapp}
                    </p>
                  </div>
                </div>

                {/* Linha 2: Botões de ação — flex-wrap para nunca transbordar no mobile */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleBusinessActive(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                      b.verified
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b.verified ? '✓ Verificada' : 'Não Verificada'}
                  </button>

                  <button
                    onClick={async () => {
                      const input = window.prompt(`Quantos créditos de leads deseja creditar para "${b.name}"?`, '5');
                      if (!input) return;
                      const count = parseInt(input, 10);
                      if (isNaN(count) || count <= 0) {
                        alert('Informe uma quantidade válida maior que zero.');
                        return;
                      }
                      try {
                        await addLeadCredits(b.id, count, `Créditos adicionados manualmente pelo administrador (${count} leads)`);
                        await refreshBusinesses?.();
                        alert(`${count} créditos de leads adicionados para ${b.name} com sucesso!`);
                      } catch (err: any) {
                        alert(`Erro ao adicionar créditos: ${err.message}`);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                    title="Adicionar créditos de leads após confirmação de PIX"
                  >
                    ⚡ + Créditos
                  </button>

                  {b.featured ? (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Deseja revogar o destaque da empresa "${b.name}"?`)) {
                          await toggleBusinessFeatured(b.id, 0, 'Destaque revogado pelo administrador');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                      title="Revogar destaque patrocinado"
                    >
                      ⭐ Revogar Destaque
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setHighlightTargetBiz(b);
                        setHighlightDays(7);
                        setHighlightNotes('PIX confirmado manualmente pelo administrador');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                      title="Ativar destaque após confirmação de pagamento PIX"
                    >
                      ⭐ Destacar (PIX)
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setManualPlanBiz(b);
                      setManualPlanTier('pro');
                      setManualPlanDuration(30);
                      setManualPlanReason('Ativação manual autorizada pelo suporte administrativo');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                    title="Ativar ou alterar plano manualmente com justificativa e auditoria"
                  >
                    👑 Gerenciar Plano
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
                        deleteBusiness(b.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition flex-shrink-0"
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

      {/* TAB: LEADS / COTAÇÕES */}
      {adminTab === 'leads' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Supervisão Global de Solicitações &amp; Propostas Comerciais</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auditoria completa de todas as cotações da plataforma, propostas de empresas e contratos fechados
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={fetchAdminQuotes}
                disabled={isLoadingAdminQuotes}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                title="Atualizar cotações do sistema"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdminQuotes ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isLoadingAdminQuotes ? 'Atualizando...' : 'Atualizar'}</span>
              </button>
              <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full">
                Total: {displayQuotes.length} solicitações
              </span>
            </div>
          </div>

          {displayQuotes.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-900">Nenhum orçamento no histórico</h4>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Os pedidos de orçamento solicitados pelos usuários aparecerão aqui para auditoria administrativa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayQuotes.map((q) => {
                const isExpanded = expandedQuoteId === q.id;
                const proposals = q.proposals || [];
                const chosenProposal = proposals.find((p) => p.status === 'escolhida');
                const isChosen = q.status === 'escolhido' || Boolean(chosenProposal);

                return (
                  <div 
                    key={q.id} 
                    className={`rounded-2xl border p-4 sm:p-5 transition space-y-3 ${
                      isChosen 
                        ? 'bg-emerald-50/30 border-emerald-200 ring-1 ring-emerald-500/10' 
                        : q.status === 'cancelado' 
                        ? 'bg-slate-50 border-slate-200 opacity-80' 
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                          {q.categoryId}
                        </span>
                        {q.targetBusinessId && (
                          <span className="text-[10px] font-bold uppercase text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md">
                            Direcionado Exclusivo
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {isNaN(Date.parse(q.createdAt)) ? q.createdAt : new Date(q.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isChosen ? (
                          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Contrato Definido
                          </span>
                        ) : q.status === 'cancelado' ? (
                          <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                            Encerrado
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Aguardando Decisão
                          </span>
                        )}

                        <button
                          onClick={() => setExpandedQuoteId(isExpanded ? null : q.id)}
                          className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition"
                        >
                          {isExpanded ? 'Recolher' : `Inspecionar (${proposals.length} propostas)`}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-slate-900">{q.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{q.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-400 block text-[10px] uppercase">Solicitante</span>
                        <strong className="text-slate-800">{q.userName}</strong> ({q.userPhone || 'Tel. não inf.'})
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400 block text-[10px] uppercase">Local</span>
                        <strong className="text-slate-800">{q.neighborhood ? `${q.neighborhood}, ` : ''}{q.city} - {q.state}</strong>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400 block text-[10px] uppercase">Prazo Desejado</span>
                        <strong className="text-slate-800">{q.desiredDeadline}</strong>
                      </div>
                    </div>

                    {/* Propostas Detalhadas em Auditoria */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Propostas Recebidas ({proposals.length})
                          </h5>
                          {chosenProposal && (
                            <span className="text-xs font-bold text-emerald-700">
                              Vencedora: {chosenProposal.businessName} (R$ {chosenProposal.price.toFixed(2)})
                            </span>
                          )}
                        </div>

                        {proposals.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Nenhuma empresa enviou proposta para este pedido até o momento.
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl p-3 border border-slate-200">
                            {proposals.map((p) => (
                              <div key={p.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-xs text-slate-900">{p.businessName}</strong>
                                    {p.status === 'escolhida' ? (
                                      <span className="text-[10px] font-bold uppercase px-2 py-0.2 bg-emerald-600 text-white rounded-md shadow-2xs">
                                        🎉 Escolhida pelo Cliente
                                      </span>
                                    ) : p.status === 'recusada' ? (
                                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.2 rounded-md">
                                        Recusada
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-md">
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Prazo: {p.deadlineText} • {p.description || 'Sem descrição adicional'}
                                  </p>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-sm font-extrabold text-slate-900">
                                    R$ {p.price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
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
                          {sub.businesses?.whatsapp && (
                            <a
                              href={buildWhatsAppLink(sub.businesses.whatsapp, `Olá! Sou da administração do EconomizaJá referente ao comprovante de assinatura da sua empresa ${sub.businesses?.name || ''}.`)}
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
                            onClick={() => handleRejectSubscription(sub.id)}
                            className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200"
                            title="Descartar ou remover solicitação de assinatura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Descartar</span>
                          </button>

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
                          {feat.businesses?.whatsapp && (
                            <a
                              href={buildWhatsAppLink(feat.businesses.whatsapp, `Olá! Sou da administração do EconomizaJá referente ao destaque patrocinado da sua empresa ${bizName}.`)}
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
                            onClick={() => handleRejectFeatured(feat.id)}
                            className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200"
                            title="Descartar solicitação duplicada ou não confirmada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Descartar</span>
                          </button>

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

      {/* TAB: AUDITORIA DE AÇÕES ADMINISTRATIVAS */}
      {adminTab === 'auditoria' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>Log de Ações Administrativas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro imutável de todas as ações realizadas pelos administradores no sistema
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              disabled={isLoadingAudit}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
              <span>{isLoadingAudit ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>

          {isLoadingAudit ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Carregando logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Activity className="w-8 h-8 text-slate-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-900">Nenhuma ação registrada ainda</h4>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                As ações administrativas (verificar empresa, ativar destaque, remover oferta etc.) aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => {
                const actionColors: Record<string, string> = {
                  EMPRESA_ATIVADA: 'bg-emerald-100 text-emerald-800',
                  EMPRESA_SUSPENSA: 'bg-rose-100 text-rose-800',
                  EMPRESA_VERIFICADA: 'bg-sky-100 text-sky-800',
                  EMPRESA_VERIFICACAO_REMOVIDA: 'bg-slate-100 text-slate-700',
                  DESTAQUE_ATIVADO: 'bg-amber-100 text-amber-800',
                  DESTAQUE_REVOGADO: 'bg-orange-100 text-orange-800',
                  OFERTA_REMOVIDA: 'bg-red-100 text-red-800',
                  CREDITOS_LEAD_ADICIONADOS: 'bg-emerald-100 text-emerald-800',
                  ACTIVATED: 'bg-amber-100 text-amber-800',
                  DEACTIVATED: 'bg-slate-100 text-slate-700',
                };
                const colorClass = actionColors[log.action] || 'bg-slate-100 text-slate-700';
                const date = new Date(log.createdAt);
                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${colorClass}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-500 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                        {log.entityType}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 truncate block">
                        {log.entityName || log.entityId || '—'}
                      </span>
                      {log.notes && (
                        <span className="text-xs text-slate-500 block truncate">{log.notes}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <span>{log.performerName}</span>
                      <span className="text-slate-300">•</span>
                      <span>{dateStr} {timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: MODERAÇÃO DE CONTEÚDO E UGC */}
      {adminTab === 'moderacao' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Moderação de Conteúdo & Denúncias (UGC)
              </h3>
              <p className="text-xs text-slate-500">
                Diretrizes do Google Play: resposta ativa a denúncias de usuários e moderação de conteúdo impróprio.
              </p>
            </div>
            <button
              onClick={fetchContentReports}
              disabled={isLoadingReports}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReports ? 'animate-spin' : ''}`} />
              Atualizar Denúncias
            </button>
          </div>

          {isLoadingReports ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mb-2" />
              <p className="text-xs text-slate-500">Carregando denúncias...</p>
            </div>
          ) : contentReports.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Nenhuma denúncia pendente</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Todas as denúncias de conteúdo gerado por usuários foram moderadas ou não há relatórios de violação.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {contentReports.map((report) => (
                <div key={report.id} className="py-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          report.status === 'PENDING'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : report.status === 'DISMISSED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {report.status === 'PENDING' ? 'PENDENTE' : report.status === 'DISMISSED' ? 'DESCARTADO' : 'RESOLVIDO'}
                        </span>
                        <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          TIPO: {report.content_type || 'CONTEÚDO'}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          Motivo: <strong className="text-slate-900">{report.reason}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {report.details ? report.details : 'Sem detalhes adicionais fornecidos pelo denunciante.'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Conteúdo ID: <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">{report.content_id}</code>
                        {report.created_at && (
                          <span className="ml-2">• {new Date(report.created_at).toLocaleString('pt-BR')}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {report.status === 'PENDING' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50">
                      <button
                        onClick={() => handleModerateReport(report.id, 'DISMISS', 'Denúncia analisada e considerada improcedente')}
                        disabled={moderatingReportId === report.id}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50"
                      >
                        Descartar Denúncia
                      </button>
                      <button
                        onClick={() => handleModerateReport(report.id, 'HIDE_CONTENT', 'Conteúdo ocultado por violar diretrizes')}
                        disabled={moderatingReportId === report.id}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition disabled:opacity-50"
                      >
                        Ocultar Conteúdo
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja suspender o autor deste conteúdo?')) {
                            handleModerateReport(report.id, 'SUSPEND_USER', 'Autor suspenso por violação recorrente ou grave');
                          }
                        }}
                        disabled={moderatingReportId === report.id}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition disabled:opacity-50"
                      >
                        Suspender Usuário / Empresa
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE ATIVAÇÃO DE DESTAQUE PATROCINADO (AUDITORIA REAL) */}
      {highlightTargetBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">⭐</span>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Ativar Destaque Patrocinado</h3>
                  <p className="text-xs text-slate-500">Confirmação manual com registro auditado</p>
                </div>
              </div>
              <button
                onClick={() => setHighlightTargetBiz(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-800">Empresa: <span className="font-normal text-slate-600">{highlightTargetBiz.name}</span></p>
              <p className="font-bold text-slate-800">Local: <span className="font-normal text-slate-600">{highlightTargetBiz.neighborhood}, {highlightTargetBiz.city} - {highlightTargetBiz.state}</span></p>
              <p className="font-bold text-slate-800">WhatsApp: <span className="font-normal text-slate-600">{highlightTargetBiz.whatsapp}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Duração do Destaque:</label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setHighlightDays(d)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      highlightDays === d
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d} Dias
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-600">Taxa diária: </span>
                <strong className="text-slate-900">R$ {Number(monetization.featuredDailyRate).toFixed(2)}/dia</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-600">Valor Total: </span>
                <strong className="text-emerald-700 text-sm font-extrabold">
                  R$ {(highlightDays * Number(monetization.featuredDailyRate)).toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Comprovante / Registro da Auditoria:</label>
              <input
                type="text"
                value={highlightNotes}
                onChange={(e) => setHighlightNotes(e.target.value)}
                placeholder="Ex.: Comprovante PIX Banco Inter - Transação #12345"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-500">
                Esta ação grava registros imutáveis em featured_listings, payments e featured_audit_log.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHighlightTargetBiz(null)}
                disabled={isSubmittingHighlight}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminHighlight}
                disabled={isSubmittingHighlight}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingHighlight ? 'Processando...' : 'Confirmar & Ativar Destaque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ATIVAÇÃO ADMINISTRATIVA DE PLANO (SUPORTE / HOMOLOGAÇÃO) */}
      {manualPlanBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">👑</span>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Ativação de Plano (Suporte)</h3>
                  <p className="text-xs text-slate-500">Operação auditada para suporte e testes</p>
                </div>
              </div>
              <button
                onClick={() => setManualPlanBiz(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-800">Empresa: <span className="font-normal text-slate-600">{manualPlanBiz.name}</span></p>
              <p className="font-bold text-slate-800">Plano Atual: <span className="font-semibold text-emerald-700 uppercase">{manualPlanBiz.plan || manualPlanBiz.planTier || 'gratis'}</span></p>
              <p className="font-bold text-slate-800">CNPJ/Local: <span className="font-normal text-slate-600">{manualPlanBiz.cnpj || '—'} • {manualPlanBiz.city || '—'}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Selecione o Plano:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManualPlanTier('pro')}
                  className={`p-3 rounded-xl border text-left transition ${
                    manualPlanTier === 'pro'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">Plano Pro</div>
                  <div className="text-[11px] text-slate-500">R$ 79,90 / mês</div>
                  <div className="text-[10px] text-emerald-700 mt-1 font-semibold">Propostas ilimitadas</div>
                </button>
                <button
                  type="button"
                  onClick={() => setManualPlanTier('premium')}
                  className={`p-3 rounded-xl border text-left transition ${
                    manualPlanTier === 'premium'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">Plano Premium</div>
                  <div className="text-[11px] text-slate-500">R$ 159,90 / mês</div>
                  <div className="text-[10px] text-emerald-700 mt-1 font-semibold">Propostas ilimitadas</div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Duração do Acesso:</label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 365].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setManualPlanDuration(days)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition ${
                      manualPlanDuration === days
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Justificativa Obrigatória (Auditoria):
              </label>
              <textarea
                rows={2}
                value={manualPlanReason}
                onChange={(e) => setManualPlanReason(e.target.value)}
                placeholder="Ex.: Teste de homologação Google Play / Ativação autorizada suporte"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-500">
                Esta ação grava log permanente com ID de administrador, data e justificativa.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setManualPlanBiz(null)}
                disabled={isSubmittingManualPlan}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmManualPlan}
                disabled={isSubmittingManualPlan || !manualPlanReason.trim()}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingManualPlan ? 'Ativando...' : 'Confirmar Ativação'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
