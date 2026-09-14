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
});
