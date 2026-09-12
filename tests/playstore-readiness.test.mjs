import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

describe('Auditoria de Prontidão para a Google Play Store e Políticas do Google', () => {

  test('1. Android targetSdkVersion deve atender ao requisito mínimo do Google Play (>= 34)', () => {
    const variablesGradlePath = path.join(ROOT_DIR, 'android', 'variables.gradle');
    assert.ok(fs.existsSync(variablesGradlePath), 'O arquivo android/variables.gradle deve existir');

    const content = fs.readFileSync(variablesGradlePath, 'utf-8');
    const targetSdkMatch = content.match(/targetSdkVersion\s*=\s*(\d+)/);
    assert.ok(targetSdkMatch, 'targetSdkVersion deve estar definido em variables.gradle');

    const targetSdkVersion = parseInt(targetSdkMatch[1], 10);
    assert.ok(
      targetSdkVersion >= 34,
      `targetSdkVersion deve ser no mínimo 34 para a Play Store. Atual: ${targetSdkVersion}`
    );

    const minSdkMatch = content.match(/minSdkVersion\s*=\s*(\d+)/);
    assert.ok(minSdkMatch, 'minSdkVersion deve estar definido');
    const minSdkVersion = parseInt(minSdkMatch[1], 10);
    assert.ok(minSdkVersion >= 24, `minSdkVersion deve suportar Android 7.0+ (>=24). Atual: ${minSdkVersion}`);
  });

  test('2. AndroidManifest.xml deve conter apenas permissões estritamente necessárias e seguras', () => {
    const manifestPath = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    assert.ok(fs.existsSync(manifestPath), 'AndroidManifest.xml deve existir');

    const content = fs.readFileSync(manifestPath, 'utf-8');

    // Permissões permitidas
    const allowedPermissions = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_COARSE_LOCATION',
    ];

    // Permissões perigosas que causam rejeição automática ou exigem declaração especial se desnecessárias
    const forbiddenPermissions = [
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_CALL_LOG',
      'android.permission.PROCESS_OUTGOING_CALLS',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
    ];

    forbiddenPermissions.forEach((perm) => {
      assert.ok(
        !content.includes(perm),
        `AndroidManifest.xml NÃO deve solicitar a permissão invasiva ${perm}`
      );
    });

    allowedPermissions.forEach((perm) => {
      assert.ok(
        content.includes(perm),
        `AndroidManifest.xml deve conter a permissão esperada ${perm}`
      );
    });

    // Validar deep linking scheme
    assert.ok(
      content.includes('<data android:scheme="https" android:host="economizaja.app" />'),
      'AndroidManifest.xml deve conter deep link configurado para economizaja.app'
    );
  });

  test('3. Conformidade LGPD e Google Play: Devem existir telas obrigatórias de Privacidade, Termos e Exclusão de Conta', () => {
    const privacyPath = path.join(ROOT_DIR, 'src', 'components', 'PrivacyPolicyView.tsx');
    const termsPath = path.join(ROOT_DIR, 'src', 'components', 'TermsOfServiceView.tsx');
    const deletePath = path.join(ROOT_DIR, 'src', 'components', 'DeleteAccountView.tsx');

    assert.ok(fs.existsSync(privacyPath), 'PrivacyPolicyView.tsx deve existir para cumprir a política do Google');
    assert.ok(fs.existsSync(termsPath), 'TermsOfServiceView.tsx deve existir para cumprir os termos legais');
    assert.ok(fs.existsSync(deletePath), 'DeleteAccountView.tsx deve existir para cumprir a política obrigatória de exclusão de conta');

    // Validar conteúdo de exclusão de conta
    const deleteContent = fs.readFileSync(deletePath, 'utf-8');
    assert.ok(deleteContent.includes('deleteAccount'), 'DeleteAccountView deve conter método de exclusão de conta');
    assert.ok(deleteContent.includes('LGPD'), 'DeleteAccountView deve mencionar conformidade com LGPD');
  });

  test('4. Roteamento de conformidade em AppContext.tsx deve suportar rotas de URL públicas', () => {
    const appContextPath = path.join(ROOT_DIR, 'src', 'context', 'AppContext.tsx');
    const content = fs.readFileSync(appContextPath, 'utf-8');

    assert.ok(content.includes('privacy') || content.includes('privacidade'), 'AppContext deve tratar rota de privacidade');
    assert.ok(content.includes('terms') || content.includes('termos'), 'AppContext deve tratar rota de termos');
    assert.ok(content.includes('delete-account') || content.includes('excluir-conta'), 'AppContext deve tratar rota de exclusão de conta');
  });

  test('5. Configuração do Capacitor deve possuir appId e androidScheme https', () => {
    const capacitorJsonPath = path.join(ROOT_DIR, 'capacitor.config.json');
    assert.ok(fs.existsSync(capacitorJsonPath), 'capacitor.config.json deve existir');

    const config = JSON.parse(fs.readFileSync(capacitorJsonPath, 'utf-8'));
    assert.strictEqual(config.appId, 'com.economizaja.app', 'appId deve ser com.economizaja.app');
    assert.strictEqual(config.appName, 'EconomizaJá', 'appName deve ser EconomizaJá');
    assert.strictEqual(config.webDir, 'dist', 'webDir deve ser dist');
    assert.strictEqual(config.server?.androidScheme, 'https', 'androidScheme deve ser https');
  });

  test('6. Validação dos Assets Nativos sincronizados com o Android', () => {
    const androidAssetsPath = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'assets', 'public');
    assert.ok(fs.existsSync(androidAssetsPath), 'Diretório de assets Android deve existir');

    const indexHtmlPath = path.join(androidAssetsPath, 'index.html');
    assert.ok(fs.existsSync(indexHtmlPath), 'android/app/src/main/assets/public/index.html deve estar presente');

    const content = fs.readFileSync(indexHtmlPath, 'utf-8');
    assert.ok(content.includes('<!doctype html>') || content.includes('<!DOCTYPE html>'), 'O arquivo sincronizado deve ser HTML válido');
  });

  test('7. Validação do Manifesto PWA e Metadados do App (public/manifest.json ou manifest.webmanifest e index.html)', () => {
    const manifestPath = fs.existsSync(path.join(ROOT_DIR, 'public', 'manifest.json'))
      ? path.join(ROOT_DIR, 'public', 'manifest.json')
      : path.join(ROOT_DIR, 'public', 'manifest.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'Arquivo de manifesto PWA deve existir');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.ok(manifest.name.includes('EconomizaJá'), 'Nome do app deve conter EconomizaJá');
    assert.strictEqual(manifest.display, 'standalone', 'Display do PWA deve ser standalone');
    assert.ok(manifest.icons && manifest.icons.length > 0, 'Manifest deve conter ícones definidos');

    const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
    assert.ok(indexHtml.includes('<meta name="viewport"'), 'index.html deve conter meta tag viewport');
    assert.ok(indexHtml.includes('<title>'), 'index.html deve conter título definido');
  });

  test('8. Sistema de Persistência Local e Autenticação Resiliente', () => {
    const localDataPath = path.join(ROOT_DIR, 'src', 'utils', 'localDataStorage.ts');
    assert.ok(fs.existsSync(localDataPath), 'localDataStorage.ts deve existir');

    const authServicePath = path.join(ROOT_DIR, 'src', 'services', 'authService.ts');
    const authContent = fs.readFileSync(authServicePath, 'utf-8');
    assert.ok(authContent.includes('matheusfranck2013@gmail.com'), 'authService deve contemplar admin master');
    assert.ok(authContent.includes('getInitialUser'), 'authService deve possuir getInitialUser');
    assert.ok(authContent.includes('persistCurrentUser'), 'authService deve persistir usuário');
  });
});
