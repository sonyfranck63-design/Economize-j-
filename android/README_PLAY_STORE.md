# Guia de Publicação na Google Play Store (AAB) — EconomizaJá

Este projeto foi estruturado com as melhores práticas para publicação direta na Google Play Store.

## 📦 1. Identificação do Aplicativo
- **Application ID / Package**: `com.economizaja.app`
- **Nome do App**: EconomizaJá
- **Versão Inicial**: 1.0.0 (versionCode 1)
- **Target SDK**: 36 (Android 16) — Em total conformidade com o requisito da Google Play para 2026
- **Min SDK**: 24 (Android 7.0+) — Compatível com mais de 98% dos dispositivos modernos com segurança aprimorada

## 🚀 2. Como Gerar o Android App Bundle (.AAB)

### Opção A: Via Capacitor CLI (Recomendado)
```bash
# 1. Gerar o build de produção da web
npm run build

# 2. Sincronizar com o projeto Android
npx cap sync android

# 3. Gerar o pacote .AAB assinado
cd android
./gradlew bundleRelease
```
O arquivo gerado estará em:
`android/app/build/outputs/bundle/release/app-release.aab`

### Opção B: Via Android Studio
1. Abra a pasta `/android` no **Android Studio**.
2. Clique no menu **Build > Generate Signed Bundle / APK**.
3. Escolha **Android App Bundle (.aab)**.
4. Selecione ou crie seu arquivo `.keystore` de assinatura.
5. Selecione a variante de build **release** e clique em **Create**.

---

## 🛡️ 3. Boas Práticas de Segurança e LGPD
- `cleartextTrafficPermitted="false"`: Todo tráfego HTTP sem SSL é bloqueado pelo Android Network Security Config.
- **Permissões Mínimas**:
  - `INTERNET`: Para carregar ofertas e orçamentos.
  - `ACCESS_COARSE_LOCATION` & `ACCESS_FINE_LOCATION`: Opcional, solicitado apenas quando o usuário clica em "Usar minha localização" para encontrar empresas no raio de atendimento.
- **LGPD & Play Console**:
  - Política de Privacidade completa e pública integrada no app.
  - Recurso de Exclusão de Conta e Dados implementado no perfil do usuário conforme as diretrizes da Google Play.
  - Sem rastreamento abusivo ou venda de dados a terceiros.

---

## 📋 4. Checklist do Google Play Console
1. **Ficha da Loja (Store Listing)**:
   - Título: EconomizaJá — Compare e Economize
   - Descrição Curta (até 80 caracteres): Antes de comprar ou contratar, compare ofertas e orçamentos perto de você.
   - Descrição Completa: Detalhes sobre economia local, orçamentos rápidos e conexão com empresas confiáveis.
   - Ícone de alta resolução: 512x512 PNG (`/public/icon.svg`).
   - Imagem de Recursos: 1024x500 JPG/PNG.
2. **Declaração de Conteúdo**:
   - Classificação indicativa: Livre (Geral / Compras).
   - Segurança de Dados (Data Safety): Declarar localização (funcionalidade do app) e dados de contato (quando usuário solicita orçamento).
   - Política de Privacidade URL: Apontar para a página `/politica-privacidade` do EconomizaJá.
3. **Produção**:
   - Fazer upload do arquivo `app-release.aab`.
   - Enviar para revisão da Google!
