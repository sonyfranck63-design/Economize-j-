import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(rootDir, ...parts), 'utf-8');

describe('Aprovação Google Play (auditoria 2026-10) - EconomizaJá', () => {
  test('1. Pagamentos: no Android não há venda de bens digitais fora do Google Play', () => {
    const leadModal = read('src', 'components', 'LeadCreditsModal.tsx');
    assert.ok(
      !leadModal.includes('acesse sua conta pelo portal web'),
      'LeadCreditsModal não pode direcionar o usuário Android para pagar fora do app'
    );
    assert.ok(
      /\{!isNativeAndroid && \(\s*<div className="space-y-2.5">/.test(leadModal),
      'A vitrine de pacotes de leads (PIX) deve ser exibida apenas na Web'
    );

    const portal = read('src', 'components', 'BusinessPortalView.tsx');
    assert.ok(
      portal.includes('{/* CARD DE COMPRA AVULSA DE LEADS NA ABA DE PLANOS (APENAS WEB) */}\r\n          {!isNativeAndroid && (') ||
        portal.includes('{/* CARD DE COMPRA AVULSA DE LEADS NA ABA DE PLANOS (APENAS WEB) */}\n          {!isNativeAndroid && ('),
      'Card de leads avulsos deve ficar oculto no Android'
    );
    assert.ok(
      /DESTAQUE PATROCINADO[^\n]*APENAS WEB/.test(portal),
      'Destaque patrocinado deve ficar oculto no Android'
    );
    assert.ok(
      !portal.includes('devem ser realizadas através do portal web'),
      'Não pode haver instrução para quitar serviços digitais pelo portal web no Android'
    );
    assert.ok(
      portal.includes('renovação automática'),
      'A aba de planos deve informar a renovação automática e como cancelar'
    );
    assert.ok(
      portal.includes("billingService.getProductInfo('pro')?.priceString"),
      'Preço exibido no Android deve vir da Google Play'
    );
  });

  test('2. Billing: compras são validadas no servidor pela Google Play Developer API', () => {
    const dataService = read('src', 'services', 'dataService.ts');
    assert.ok(
      dataService.includes("functions.invoke('verify-play-purchase'"),
      'O app deve validar compras pela Edge Function verify-play-purchase'
    );
    assert.ok(
      !dataService.includes("rpc('process_google_play_purchase'"),
      'O app não pode chamar process_google_play_purchase diretamente'
    );
    assert.ok(
      !dataService.includes('`token-${Date.now()}`'),
      'O app não pode inventar purchase tokens'
    );

    const fn = read('supabase', 'functions', 'verify-play-purchase', 'index.ts');
    assert.ok(fn.includes('purchases/subscriptionsv2/tokens/'), 'Edge Function deve consultar subscriptionsv2');
    assert.ok(fn.includes('apply_verified_google_play_purchase'), 'Edge Function deve usar a RPC restrita');

    const migration = read('supabase', 'migrations', '00041_server_verified_play_billing.sql');
    assert.ok(
      migration.includes('REVOKE EXECUTE ON FUNCTION public.process_google_play_purchase'),
      'Migração deve revogar a RPC antiga dos clientes'
    );
    assert.ok(
      /GRANT EXECUTE ON FUNCTION public\.apply_verified_google_play_purchase[^;]+TO service_role;/.test(migration),
      'RPC verificada deve ser executável apenas pelo service_role'
    );
  });

  test('3. UGC: usuários podem denunciar conteúdo e bloquear autores no app', () => {
    const reportModal = read('src', 'components', 'ReportContentModal.tsx');
    assert.ok(reportModal.includes('submitContentReport'), 'Modal deve enviar denúncia');
    assert.ok(reportModal.includes('blockUser'), 'Modal deve permitir bloquear o autor');

    const detail = read('src', 'components', 'BusinessDetailModal.tsx');
    assert.ok(detail.includes("contentType: 'review'"), 'Avaliações devem ter botão de denúncia');
    assert.ok(detail.includes("contentType: 'business'"), 'Empresas devem ter botão de denúncia');
    assert.ok(detail.includes('loadReviewsForBusiness'), 'Avaliações reais devem ser carregadas do banco');

    const offers = read('src', 'components', 'OffersView.tsx');
    assert.ok(offers.includes("contentType: 'offer'"), 'Ofertas devem ter botão de denúncia');

    const context = read('src', 'context', 'AppContext.tsx');
    assert.ok(context.includes('blockedUserIds.includes(b.ownerId)'), 'Empresas de usuários bloqueados devem ser ocultadas');
    assert.ok(context.includes('blockedUserIds.includes(r.userId)'), 'Avaliações de usuários bloqueados devem ser ocultadas');

    const migration = read('supabase', 'migrations', '00040_fix_ugc_moderation.sql');
    assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS active'), 'reviews.active deve existir para a moderação');
    assert.ok(migration.includes('try_cast_uuid'), 'Comparações uuid/text devem usar conversão segura');
  });

  test('4. Privacidade: perfis não ficam públicos e a política descreve os terceiros', () => {
    const migration = read('supabase', 'migrations', '00039_restrict_profiles_pii.sql');
    assert.ok(
      migration.includes('USING (auth.uid() = id OR public.is_admin())'),
      'profiles deve ser legível apenas pelo dono e por administradores'
    );

    for (const content of [read('public', 'privacy.html'), read('src', 'components', 'PrivacyPolicyView.tsx')]) {
      assert.ok(content.includes('OpenStreetMap Nominatim'), 'Política deve declarar o envio de localização ao Nominatim');
      assert.ok(content.includes('Google Play'), 'Política deve citar o processamento de assinaturas pelo Google Play');
      assert.ok(!content.includes('ponta a ponta'), 'Política não deve alegar criptografia ponta a ponta');
    }
  });

  test('5. Conta: redefinição de senha abre o site público, não o localhost do WebView', () => {
    const auth = read('src', 'services', 'authService.ts');
    assert.ok(auth.includes('redirectTo: PUBLIC_PAGES.resetPassword'), 'redirectTo deve usar o site público');
    assert.ok(!auth.includes('window.location.origin}/#/reset-password'), 'redirectTo não pode usar a origem do WebView');

    const page = read('public', 'reset-password.html');
    assert.ok(page.includes('auth.updateUser({ password })'), 'Página de redefinição deve atualizar a senha');
    assert.ok(!page.includes('__SUPABASE_'), 'Página de redefinição deve estar configurada');
  });

  test('6. Android: sem plugin de push não utilizado e sem deep link para domínio inexistente', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(
      !pkg.dependencies['@capacitor/push-notifications'],
      'Plugin de push não utilizado adiciona permissões e Firebase desnecessários'
    );
    const manifest = read('android', 'app', 'src', 'main', 'AndroidManifest.xml');
    assert.ok(!manifest.includes('android:host="economizaja.app"'), 'Manifest não deve apontar para economizaja.app');
  });
});
