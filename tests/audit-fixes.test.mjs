import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Auditoria e Correções Funcionais - EconomizaJá', () => {
  const rootDir = process.cwd();

  test('1. BusinessPortalView: Respeita regras dos Hooks do React (sem hooks após retornos condicionais)', () => {
    const filePath = path.join(rootDir, 'src', 'components', 'BusinessPortalView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Verifica que quotesScope foi declarado antes dos retornos condicionais
    const quotesScopeIndex = content.indexOf("const [quotesScope, setQuotesScope]");
    const earlyReturnAuthGuard = content.indexOf("if (userRole === 'customer'");
    const earlyReturnCurrentBiz = content.indexOf("if (!currentBiz)");

    assert.ok(quotesScopeIndex > -1, 'quotesScope deve existir');
    assert.ok(quotesScopeIndex < earlyReturnAuthGuard, 'quotesScope deve ser declarado ANTES do guard de autenticação');
    assert.ok(quotesScopeIndex < earlyReturnCurrentBiz, 'quotesScope deve ser declarado ANTES da verificação de currentBiz');
    
    // Verifica que refreshBusinesses é importado e chamado
    assert.ok(content.includes('refreshBusinesses'), 'BusinessPortalView deve importar refreshBusinesses');
  });

  test('2. Categorias Populares: Reseta rolagem da janela para o topo', () => {
    const homePath = path.join(rootDir, 'src', 'components', 'HomeView.tsx');
    const searchPath = path.join(rootDir, 'src', 'components', 'SearchView.tsx');
    const appPath = path.join(rootDir, 'src', 'App.tsx');

    const homeContent = fs.readFileSync(homePath, 'utf-8');
    const searchContent = fs.readFileSync(searchPath, 'utf-8');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    assert.ok(homeContent.includes("window.scrollTo({ top: 0"), 'HomeView deve resetar o scroll ao clicar em categoria');
    assert.ok(searchContent.includes("window.scrollTo({ top: 0"), 'SearchView deve resetar o scroll ao alterar categoria ou pesquisa');
    assert.ok(appContent.includes("window.scrollTo({ top: 0"), 'App.tsx deve resetar o scroll ao trocar de aba');
  });

  test('3. Pedidos de Orçamento: Admin não herda empresas de terceiros e aceite é exclusivo do consumidor', () => {
    const modalPath = path.join(rootDir, 'src', 'components', 'CompareQuotesModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    // Admin não deve ser considerado proprietário de todas as empresas no modal
    assert.ok(
      !content.includes("b.ownerId === currentUser?.id || currentUser?.role === 'admin'"),
      'Admin não deve herdar a propriedade de todas as empresas em userBusinesses'
    );

    // Botão de escolha da proposta deve ser restrito ao solicitante
    assert.ok(
      content.includes("currentUser?.id === quote.userId"),
      'Apenas o solicitante pode escolher/aceitar a proposta'
    );

    // Deve exibir tag de Supervisão Administrativa para o Admin
    assert.ok(
      content.includes("Supervisão Administrativa"),
      'Deve exibir tag de Supervisão Administrativa para o Admin'
    );
  });

  test('4. Plano do Parceiro: Sincronização imediata via refreshBusinesses no Admin e Portal', () => {
    const adminPath = path.join(rootDir, 'src', 'components', 'AdminPortalView.tsx');
    const appCtxPath = path.join(rootDir, 'src', 'context', 'AppContext.tsx');

    const adminContent = fs.readFileSync(adminPath, 'utf-8');
    const appCtxContent = fs.readFileSync(appCtxPath, 'utf-8');

    assert.ok(appCtxContent.includes("refreshBusinesses"), 'AppContext deve exportar refreshBusinesses');
    assert.ok(adminContent.includes("await refreshBusinesses?.()"), 'AdminPortalView deve chamar refreshBusinesses ao aprovar assinatura');
  });

  test('5. ErrorBoundary global integrado para prevenir tela branca', () => {
    const errorBoundaryPath = path.join(rootDir, 'src', 'components', 'ErrorBoundary.tsx');
    const appPath = path.join(rootDir, 'src', 'App.tsx');

    assert.ok(fs.existsSync(errorBoundaryPath), 'ErrorBoundary.tsx deve existir');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    assert.ok(appContent.includes("<ErrorBoundary>"), 'App.tsx deve conter ErrorBoundary');
  });

  test('6. BusinessPortalView: Isolamento rigoroso de empresas (Admin não herda empresas de parceiros)', () => {
    const portalPath = path.join(rootDir, 'src', 'components', 'BusinessPortalView.tsx');
    const content = fs.readFileSync(portalPath, 'utf-8');

    // Não deve herdar todas as empresas para o admin
    assert.ok(
      !content.includes("currentUser.role === 'admin' ? businesses"),
      'BusinessPortalView não deve associar todas as empresas da plataforma ao usuário Admin'
    );
    assert.ok(
      content.includes("b.ownerId") && content.includes("currentUser.id"),
      'BusinessPortalView deve filtrar estritamente pelo ownerId do usuário logado'
    );

    // Botão de WhatsApp direto com buildWhatsAppLink para propostas aceitas
    assert.ok(
      content.includes("buildWhatsAppLink"),
      'BusinessPortalView deve conter buildWhatsAppLink para contato direto'
    );
    assert.ok(
      content.includes("Conversar no WhatsApp"),
      'BusinessPortalView deve fornecer botão explícito Conversar no WhatsApp'
    );
  });

  test('7. QuotesView: Minhas Solicitações de Orçamento restritas ao solicitante', () => {
    const quotesPath = path.join(rootDir, 'src', 'components', 'QuotesView.tsx');
    const content = fs.readFileSync(quotesPath, 'utf-8');

    // Admin não deve ver cotações de terceiros como se fossem suas no portal do consumidor
    assert.ok(
      !content.includes("currentUser?.role === 'admin' || qr.userId === currentUser?.id"),
      'QuotesView não deve exibir solicitações de terceiros como Minhas Solicitações para o Admin'
    );
    assert.ok(
      content.includes("qr.userId === currentUser.id"),
      'QuotesView deve filtrar estritamente as solicitações do próprio usuário logado'
    );
  });

  test('8. AdminPortalView: Auditoria completa e centralizada de cotações e propostas', () => {
    const adminPath = path.join(rootDir, 'src', 'components', 'AdminPortalView.tsx');
    const content = fs.readFileSync(adminPath, 'utf-8');

    assert.ok(
      content.includes("adminTab === 'leads'"),
      'AdminPortalView deve possuir aba ativa de orçamentos e leads'
    );
    assert.ok(
      content.includes("Cotações & Propostas") && content.includes("totalProposalsCount"),
      'AdminPortalView deve monitorar contadores de orçamentos e propostas'
    );
  });

  test('9. Notificações Persistentes: dataService e AppContext implementam sincronização com Supabase', () => {
    const dataServicePath = path.join(rootDir, 'src', 'services', 'dataService.ts');
    const appCtxPath = path.join(rootDir, 'src', 'context', 'AppContext.tsx');

    const dsContent = fs.readFileSync(dataServicePath, 'utf-8');
    const appCtxContent = fs.readFileSync(appCtxPath, 'utf-8');

    assert.ok(dsContent.includes("async getNotifications("), 'dataService deve implementar getNotifications');
    assert.ok(dsContent.includes("async markNotificationRead("), 'dataService deve implementar markNotificationRead');
    assert.ok(dsContent.includes("async markAllNotificationsRead("), 'dataService deve implementar markAllNotificationsRead');

    assert.ok(appCtxContent.includes("markNotificationRead"), 'AppContext deve exportar markNotificationRead');
    assert.ok(appCtxContent.includes("table: 'notifications'"), 'AppContext deve assinar alterações da tabela notifications em tempo real');
  });

  test('10. Migração SQL 00035: Contém triggers e liberação segura de WhatsApp no aceite da proposta', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '00035_fix_notifications_triggers_and_persistence.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 00035 deve existir');

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sqlContent.includes("secure_leads_view"), 'Migration deve reescrever secure_leads_view');
    assert.ok(sqlContent.includes("status = 'escolhida'"), 'Migration deve liberar telefone quando proposta for escolhida');
    assert.ok(sqlContent.includes("tr_notify_quote_request"), 'Migration deve conter trigger de notificação de pedido');
    assert.ok(sqlContent.includes("tr_notify_proposal_submitted"), 'Migration deve conter trigger de envio de proposta');
    assert.ok(sqlContent.includes("tr_notify_proposal_accepted"), 'Migration deve conter trigger de aceite de proposta');
  });
});

