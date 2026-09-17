import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Validação dos 5 Ajustes Prioritários para a Google Play Store', async (t) => {
  await t.test('1. Helper isThisMonth: validação precisa do mês e ano correntes', async () => {
    // Importa o dateUtils
    const { isThisMonth } = await import('../src/utils/dateUtils.ts');

    const now = new Date();
    const thisMonthIso = now.toISOString();
    assert.equal(isThisMonth(thisMonthIso), true, 'Data de hoje deve ser do mês atual');

    const pastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();
    assert.equal(isThisMonth(pastMonthDate), false, 'Data do mês anterior não deve ser do mês atual');

    const pastYearDate = new Date(now.getFullYear() - 1, now.getMonth(), 15).toISOString();
    assert.equal(isThisMonth(pastYearDate), false, 'Data do mesmo mês no ano passado não deve ser do mês atual');

    assert.equal(isThisMonth(null), false, 'Valores nulos retornam false');
    assert.equal(isThisMonth('data-invalida'), false, 'Data inválida retorna false');
  });

  await t.test('2. Problema 1: BusinessPortalView oculta botões Pro/Premium no Android nativo e exibe card web', async () => {
    const portalPath = path.join(rootDir, 'src', 'components', 'BusinessPortalView.tsx');
    const content = fs.readFileSync(portalPath, 'utf8');

    assert.match(content, /Capacitor\.isNativePlatform\(\)/, 'Deve verificar plataforma nativa com Capacitor.isNativePlatform()');
    assert.match(content, /isNativeAndroid/, 'Deve conter a constante ou flag isNativeAndroid');
    assert.match(content, /Gerencie seu plano em economizaja\.com\.br/, 'Deve exibir o card explicativo para gestão na web');
    assert.match(content, /Disponível em economizaja\.com\.br/, 'Deve ocultar o botão de compra direta e orientar para a web');
    assert.match(content, /checkoutPlan && !isNativeAndroid/, 'Modal de checkout de plano não deve ser aberto no Android nativo');
    assert.match(content, /Destaque Patrocinado da Empresa/, 'Destaque patrocinado B2B deve permanecer visível');
  });

  await t.test('3. Problema 2: AppContext persiste localização por até 24 horas no localStorage', async () => {
    const appContextPath = path.join(rootDir, 'src', 'context', 'AppContext.tsx');
    const content = fs.readFileSync(appContextPath, 'utf8');

    assert.match(content, /STORAGE_KEY_LOCATION/, 'Deve definir chave de armazenamento para localização');
    assert.match(content, /24 \* 60 \* 60 \* 1000/, 'Deve definir TTL de 24 horas em milissegundos');
    assert.match(content, /getInitialUserLocation/, 'Deve usar função inicializadora que recupera do cache');
    assert.match(content, /localStorage\.setItem\(STORAGE_KEY_LOCATION/, 'Deve gravar localização com timestamp');
  });

  await t.test('4. Problema 3 e 4: Limite de 3 propostas para plano gratuito e trava de duplo clique', async () => {
    const portalPath = path.join(rootDir, 'src', 'components', 'BusinessPortalView.tsx');
    const content = fs.readFileSync(portalPath, 'utf8');

    assert.match(content, /monthlyProposalsCount/, 'Deve contar propostas do mês');
    assert.match(content, /hasReachedProposalLimit\s*=\s*isGratis\s*&&\s*monthlyProposalsCount\s*>=\s*3/, 'Deve travar quando gratuito e >= 3 propostas');
    assert.match(content, /showProposalLimitModal/, 'Deve conter modal de limite de propostas');
    assert.match(content, /isSendingProposal/, 'Deve conter estado isSendingProposal para bloquear duplo clique');
    assert.match(content, /disabled=\{isSendingProposal\}/, 'Botão deve ser desabilitado durante o envio');
  });

  await t.test('5. Problema 5: Prevenção de avaliações duplicadas e Migration SQL', async () => {
    const detailModalPath = path.join(rootDir, 'src', 'components', 'BusinessDetailModal.tsx');
    const detailContent = fs.readFileSync(detailModalPath, 'utf8');

    assert.match(detailContent, /alreadyReviewed/, 'BusinessDetailModal deve verificar se o usuário já avaliou a empresa');
    assert.match(detailContent, /Você já avaliou esta empresa/, 'Deve exibir mensagem informando que já avaliou');

    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '00036_unique_review_per_business_user.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 00036 deve existir');

    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    assert.match(migrationContent, /UNIQUE\s*\(business_id,\s*user_id\)/i, 'Migration deve adicionar constraint UNIQUE(business_id, user_id)');
    assert.match(migrationContent, /DELETE FROM public\.reviews/i, 'Migration deve limpar registros duplicados prévios');
  });
});
