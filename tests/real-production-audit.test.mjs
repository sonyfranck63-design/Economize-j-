import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Auditoria Técnica Independente e Produção Real - EconomizaJá', () => {
  const rootDir = process.cwd();

  test('1. Segurança e Autenticação: Remoção estrita de usuários demo e bypass offline de admin', () => {
    const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');
    const content = fs.readFileSync(authServicePath, 'utf-8');

    // Não deve conter a constante DEFAULT_LOCAL_USERS
    assert.ok(
      !content.includes('DEFAULT_LOCAL_USERS ='),
      'authService não deve conter lista mock de usuários locais com senhas predefinidas'
    );

    // Não deve conceder role: "admin" para qualquer usuário que fizer login offline
    assert.ok(
      !content.includes('role: "admin", // Fallback offline para testes'),
      'authService não deve promover login offline a administrador'
    );

    // Deve possuir verificação explícita de erro de rede ou falha de autenticação
    assert.ok(
      content.includes('Não foi possível conectar ao servidor de autenticação') ||
      content.includes('Serviço de autenticação indisponível'),
      'authService deve retornar erro explícito quando o backend estiver inacessível'
    );
  });

  test('2. Exclusão de Conta: Sem falso positivo e com propagação de erros reais', () => {
    const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');
    const deleteViewPath = path.join(rootDir, 'src', 'components', 'DeleteAccountView.tsx');

    const authContent = fs.readFileSync(authServicePath, 'utf-8');
    const deleteContent = fs.readFileSync(deleteViewPath, 'utf-8');

    // authService.deleteAccount não deve engolir exceções
    assert.ok(
      authContent.includes('throw new Error(error.message'),
      'authService.deleteAccount deve lançar exceção se a RPC falhar'
    );

    // DeleteAccountView só deve confirmar sucesso se não houver erro lançado
    assert.ok(
      deleteContent.includes('await authService.deleteAccount'),
      'DeleteAccountView deve aguardar a confirmação do backend antes de confirmar sucesso'
    );
    assert.ok(
      deleteContent.includes('setErrorMessage('),
      'DeleteAccountView deve exibir mensagem de erro se a exclusão falhar'
    );
  });

  test('3. Google Play & LGPD: Páginas standalone completas em public/', () => {
    const publicFiles = ['delete-account.html', 'privacy.html', 'terms.html'];
    
    for (const fileName of publicFiles) {
      const filePath = path.join(rootDir, 'public', fileName);
      assert.ok(fs.existsSync(filePath), `Arquivo obrigatório public/${fileName} deve existir`);

      const html = fs.readFileSync(filePath, 'utf-8');
      assert.ok(html.includes('<!DOCTYPE html>'), `${fileName} deve ser um documento HTML5 válido`);
      assert.ok(html.includes('<title>'), `${fileName} deve possuir tag de título`);
      assert.ok(html.includes('EconomizaJá'), `${fileName} deve citar o nome da plataforma EconomizaJá`);
    }

    const deleteHtml = fs.readFileSync(path.join(rootDir, 'public', 'delete-account.html'), 'utf-8');
    assert.ok(deleteHtml.includes('Exclusão de Conta'), 'delete-account.html deve especificar processo de exclusão de dados');
    assert.ok(deleteHtml.includes('LGPD'), 'delete-account.html deve citar conformidade com a LGPD');
  });

  test('4. Google Play Billing: RPC server-side anti-replay e controle de permissões', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '00038_google_play_billing_and_ugc_moderation.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migração 00038 deve existir');

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Verifica função process_google_play_purchase
    assert.ok(
      sql.includes('process_google_play_purchase'),
      'Deve criar a RPC segura process_google_play_purchase'
    );
    // Anti-replay: checagem de purchase_token único
    assert.ok(
      sql.includes('purchase_token'),
      'RPC deve validar e persistir purchase_token para impedir replay attacks'
    );
    // Validação de proprietário da empresa
    assert.ok(
      sql.includes('v_biz.owner_id != auth.uid() AND NOT public.is_admin()'),
      'RPC deve validar que o solicitante é o dono legítimo da empresa'
    );
  });

  test('5. Ativação Administrativa: Permite suporte e testes com auditoria obrigatória', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '00038_google_play_billing_and_ugc_moderation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // RPC admin_activate_business_plan
    assert.ok(
      sql.includes('admin_activate_business_plan'),
      'Deve criar a RPC admin_activate_business_plan'
    );
    // Verificação de admin
    assert.ok(
      sql.includes('NOT public.is_admin()'),
      'Apenas administradores podem acionar admin_activate_business_plan'
    );
    // Gravação de auditoria
    assert.ok(
      sql.includes('admin_action_logs'),
      'Ativação administrativa deve gerar registro em admin_action_logs'
    );
    // Identificador claro do provedor
    assert.ok(
      sql.includes("'admin_manual'"),
      'Ativação manual deve registrar billing_provider como admin_manual'
    );
  });

  test('6. UGC e Moderação: Conformidade com políticas de segurança de conteúdo', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '00038_google_play_billing_and_ugc_moderation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    assert.ok(sql.includes('content_reports'), 'Deve criar tabela content_reports');
    assert.ok(sql.includes('user_blocks'), 'Deve criar tabela user_blocks');
    assert.ok(sql.includes('submit_content_report'), 'Deve criar RPC submit_content_report');
    assert.ok(sql.includes('admin_moderate_content'), 'Deve criar RPC admin_moderate_content');
    assert.ok(sql.includes('block_user'), 'Deve criar RPC block_user');
  });

  test('7. Alinhamento de Preços: Pro R$ 79,90 e Premium R$ 159,90', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '00038_google_play_billing_and_ugc_moderation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    assert.ok(sql.includes('79.90'), 'SQL deve conter o valor 79.90 para o plano Pro');
    assert.ok(sql.includes('159.90'), 'SQL deve conter o valor 159.90 para o plano Premium');
  });

  test('8. Portal Administrativo: Controles de moderação de UGC e ativação de plano expostos na UI', () => {
    const adminPath = path.join(rootDir, 'src', 'components', 'AdminPortalView.tsx');
    const content = fs.readFileSync(adminPath, 'utf-8');

    assert.ok(content.includes("adminTab === 'moderacao'"), 'AdminPortalView deve conter a aba de moderação');
    assert.ok(content.includes('handleModerateReport'), 'AdminPortalView deve possuir handler de moderação');
    assert.ok(content.includes('handleConfirmManualPlan'), 'AdminPortalView deve possuir handler de ativação manual');
    assert.ok(content.includes('manualPlanBiz'), 'AdminPortalView deve possuir modal para seleção de empresa e justificativa');
  });
});
