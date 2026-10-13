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
      /\{isNativeAndroid \? \(\s*<div className="border border-blue-200[\s\S]{0,600}onClick=\{handleBuyOnGooglePlay\}/.test(leadModal),
      'No Android, pacotes de leads devem ser comprados pelo Google Play'
    );
    assert.ok(
      /\) : \(\s*<div className="border border-emerald-200[\s\S]{0,400}Pagamento via PIX/.test(leadModal),
      'O pagamento via PIX dos pacotes de leads deve ficar restrito à Web'
    );

    const portal = read('src', 'components', 'BusinessPortalView.tsx');
    assert.ok(
      portal.includes("{isNativeAndroid ? 'com pagamento único pelo Google Play' : 'pagando via PIX'}"),
      'Card de leads avulsos não pode mencionar PIX no Android'
    );
    assert.ok(
      portal.includes('onClick={handleNativeFeaturedPurchase}') &&
        portal.includes('billingService.purchaseFeatured(days, currentBiz.id)'),
      'No Android, o destaque patrocinado deve ser vendido pelo Google Play'
    );
    assert.ok(
      /isNativeAndroid \? \(\s*<button[\s\S]{0,200}handleNativeFeaturedPurchase[\s\S]{0,1200}\) : \(\s*<button[\s\S]{0,200}handleHireHighlight/.test(portal),
      'O fluxo de destaque via PIX (handleHireHighlight) deve ficar restrito à Web'
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

  test('2b. Destaque: compra única validada e consumida no servidor', () => {
    const billing = read('src', 'services', 'billingService.ts');
    assert.ok(billing.includes("productType: PURCHASE_TYPE.INAPP"), 'Destaque deve ser compra única (INAPP)');
    assert.ok(
      /private async purchaseOneTime[\s\S]{0,900}autoAcknowledgePurchases: false/.test(billing),
      'A compra de destaque não pode ser confirmada no aparelho antes da validação no servidor'
    );
    assert.ok(!billing.includes('purchaseState === 4'), 'purchaseState do Android usa "1" (comprado) e "2" (pendente)');

    const fn = read('supabase', 'functions', 'verify-play-purchase', 'index.ts');
    assert.ok(fn.includes('/purchases/products/'), 'Edge Function deve consultar purchases.products');
    assert.ok(fn.includes(':consume'), 'Edge Function deve consumir a compra após ativar o destaque');
    assert.ok(fn.includes('apply_verified_featured_purchase'), 'Edge Function deve usar a RPC restrita de destaque');

    const migration = read('supabase', 'migrations', '00042_play_billing_featured_listing.sql');
    assert.ok(migration.includes('play_product_purchases'), 'Comprovantes devem ser registrados contra reuso');
    assert.ok(
      /GRANT EXECUTE ON FUNCTION public\.apply_verified_featured_purchase[^;]+TO service_role;/.test(migration),
      'RPC de destaque deve ser executável apenas pelo service_role'
    );
  });

  test('2c. Leads avulsos: compra pelo Google Play e saldo protegido contra autoconcessão', () => {
    const billing = read('src', 'services', 'billingService.ts');
    assert.ok(billing.includes("economizaja_leads_5"), 'Pacotes de leads devem existir como produtos da Play');
    assert.ok(billing.includes('purchaseLeads('), 'billingService deve comprar pacotes de leads');

    const fn = read('supabase', 'functions', 'verify-play-purchase', 'index.ts');
    assert.ok(fn.includes('apply_verified_leads_purchase'), 'Edge Function deve liberar leads pela RPC restrita');

    const migration = read('supabase', 'migrations', '00043_play_billing_lead_credits.sql');
    assert.ok(
      /FUNCTION public\.add_lead_credits[\s\S]{0,400}IF NOT public\.is_admin\(\) THEN/.test(migration),
      'add_lead_credits deve ser exclusiva de administradores'
    );
    assert.ok(
      migration.includes("current_user NOT IN ('anon', 'authenticated')") && migration.includes('trg_protect_lead_credits'),
      'Clientes não podem aumentar lead_credits por UPDATE direto'
    );
    assert.ok(
      /GRANT EXECUTE ON FUNCTION public\.apply_verified_leads_purchase[^;]+TO service_role;/.test(migration),
      'RPC de leads deve ser executável apenas pelo service_role'
    );
  });

  test('2d. Banco: funções do servidor, avaliações e créditos de leads (migrações 00045-00047)', () => {
    const triggers = read('supabase', 'migrations', '00045_business_triggers_allow_trusted_functions.sql');
    assert.ok(
      (triggers.match(/^SECURITY INVOKER$/gm) || []).length === 2 &&
        (triggers.match(/IF current_user NOT IN \('anon', 'authenticated'\) THEN/g) || []).length === 2,
      'Gatilhos de empresas devem liberar apenas funções confiáveis do servidor'
    );

    const reviews = read('supabase', 'migrations', '00046_fix_reviews_insert_and_rating.sql');
    assert.ok(reviews.includes('FOR INSERT') && reviews.includes('auth.uid() = user_id'), 'Clientes devem poder publicar avaliações próprias');
    assert.ok(reviews.includes('uq_reviews_business_user'), 'Uma avaliação por cliente por empresa');
    assert.ok(reviews.includes('refresh_business_rating'), 'Nota média deve ser recalculada');
    assert.ok(reviews.includes("qp.status = 'escolhida'"), 'Selo de cliente verificado só com orçamento aceito');

    const proposals = read('supabase', 'migrations', '00047_fix_proposal_limit_with_lead_credits.sql');
    assert.ok(!/v_monthly_count >= 3/.test(proposals), 'Gatilho não pode bloquear propostas pagas com créditos');
    assert.ok(proposals.includes('WITH CHECK (public.is_admin())'), 'INSERT direto de propostas deve ser exclusivo de admin');

    const dataService = read('src', 'services', 'dataService.ts');
    assert.ok(!/from\('reviews'\)\.insert\(\{[\s\S]{0,300}verified_service: true/.test(dataService), 'O app não pode se autodeclarar cliente verificado');
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
