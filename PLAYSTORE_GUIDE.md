# 🚀 Guia Definitivo de Publicação na Google Play Store — EconomizaJá

Este documento contém o passo a passo técnico para gerar o pacote oficial **Android App Bundle (.aab)** e realizar a publicação do EconomizaJá na **Google Play Console**.

---

## 1. Pré-Requisitos
- [Android Studio](https://developer.android.com/studio) instalado no computador.
- JDK 17 ou 21 configurado no ambiente.
- Conta de Desenvolvedor ativa no [Google Play Console](https://play.google.com/console).

---

## 2. Passo 1: Gerar a Chave de Assinatura (Keystore)

> **O EconomizaJá JÁ POSSUI keystore de produção:** `C:\Users\mathe\EconomizaJa-Keystore\economizaja-release-key.jks`.
> **Não gere outra.** Para assinar, defina `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` e `KEY_PASSWORD` antes do `bundleRelease` (veja `android/app/build.gradle`).

Somente para um app novo, sem keystore, gere uma executando o comando abaixo no terminal:

```powershell
keytool -genkey -v -keystore economizaja-release-key.keystore -alias economizaja -keyalg RSA -keysize 2048 -validity 10000
```

> **IMPORTANTE:** Guarde o arquivo `economizaja-release-key.keystore` e as senhas em local seguro. Sem eles, não é possível enviar atualizações do aplicativo para a Play Store.

---

## 3. Passo 2: Compilar o App e Sincronizar com o Capacitor

No diretório do projeto, execute:

```bash
npm run build:android
```

Esse comando executa o build otimizado do Vite (`dist/`) e copia todos os assets atualizados para dentro da pasta `android/app/src/main/assets/public/`.

---

## 4. Passo 3: Gerar o Pacote de Produção (.aab)

### Opção A: Pelo Terminal com Gradle
```powershell
cd android
./gradlew bundleRelease
```
O arquivo `.aab` gerado estará em:
`android/app/build/outputs/bundle/release/app-release.aab`

### Opção B: Pelo Android Studio
1. Abra o projeto no Android Studio com o comando:
   ```bash
   npm run open:android
   ```
2. No menu superior, clique em: **Build** > **Generate Signed Bundle / APK...**
3. Selecione **Android App Bundle** e clique em **Next**.
4. Aponte para sua chave `economizaja-release-key.keystore`, digite as senhas e selecione a variante `release`.
5. Clique em **Finish**. O Android Studio compilará o arquivo `.aab` assinado e otimizado.

---

## 5. Passo 4: Ficha do App e Declarações na Google Play Console

### 5.1 URLs Obrigatórias de Conformidade
A Google Play exige links públicos para aprovação do app (servidos pelo site `https://economizaja.ai.studio`, a partir da pasta `public/`):
- **Política de Privacidade (LGPD)**: `https://economizaja.ai.studio/privacy.html`
- **Termos de Serviço**: `https://economizaja.ai.studio/terms.html`
- **Exclusão de Conta e Dados**: `https://economizaja.ai.studio/delete-account.html`
- **Redefinição de Senha** (link enviado por e-mail): `https://economizaja.ai.studio/reset-password.html`

> Sempre que alterar arquivos em `public/`, republique o site no Google AI Studio.
> No Supabase, adicione `https://economizaja.ai.studio/reset-password.html` em **Authentication > URL Configuration > Redirect URLs**.

### 5.2 Seção de Segurança dos Dados (Data Safety)
Ao preencher o formulário na Play Console:
- **O app coleta dados?** Sim.
  - Informações pessoais: nome, e-mail, telefone (funcionalidade do app, gerenciamento de conta).
  - Localização aproximada (funcionalidade do app). Coletada só quando o usuário pede.
  - Conteúdo gerado pelo usuário: avaliações, pedidos de orçamento, ofertas (funcionalidade do app).
  - Histórico de compras: assinaturas do Google Play (funcionalidade do app).
- **Os dados são compartilhados?** Sim: a localização aproximada é enviada ao OpenStreetMap Nominatim para obter cidade/bairro; os dados de pedido de orçamento vão para as empresas escolhidas pelo usuário.
- **Os dados são criptografados em trânsito?** Sim (HTTPS / TLS obrigatório).
- **Os usuários podem solicitar a exclusão de seus dados?** Sim (no aplicativo e na URL de exclusão de conta).

### 5.3 Acesso ao App (App access)
Funções de empresa e orçamentos exigem login. Em **Política do app > Acesso ao app**, informe uma conta de teste (e-mail e senha) de consumidor e uma de empresa para o revisor.

### 5.4 Backend obrigatório antes de publicar
Aplique no **SQL Editor** do Supabase, nesta ordem:
1. `supabase/migrations/00039_restrict_profiles_pii.sql`: perfis deixam de ser públicos.
2. `supabase/migrations/00040_fix_ugc_moderation.sql`: denúncia e moderação de conteúdo.
3. `supabase/migrations/00041_server_verified_play_billing.sql`: assinaturas validadas no servidor.

Validação de assinaturas (Edge Function `verify-play-purchase`):
1. No Google Cloud, crie uma **conta de serviço** e gere uma chave JSON.
2. Na Play Console, em **Usuários e permissões**, convide o e-mail da conta de serviço com permissão para **ver dados financeiros e gerenciar pedidos e assinaturas**.
3. Configure o secret e publique a função:
   ```bash
   npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$(cat chave-conta-servico.json)" --project-ref hycixtbsczawkzrjswbx
   npx supabase functions deploy verify-play-purchase --project-ref hycixtbsczawkzrjswbx
   ```
4. (Recomendado) Habilite a extensão `pg_cron` e reaplique o bloco final da migração 00041 para expirar assinaturas vencidas diariamente.

> **Atenção:** o Supabase gratuito pausa o projeto após 7 dias sem atividade. Com o app publicado, um projeto pausado derruba login e dados para todos os usuários; considere o plano pago.

---

## 6. Comandos Úteis

| Comando | Descrição |
|---|---|
| `npm test` | Executa a suíte de testes automatizados de conformidade Play Store |
| `npm run build:android` | Compila o front-end e sincroniza os assets com o Android |
| `npm run open:android` | Abre o projeto diretamente no Android Studio |
| `npm run lint` | Validação estrita de tipos TypeScript |

---

## 7. Configuração das Assinaturas no Google Play Console

Para que as cobranças com cartão funcionem no app, cadastre as assinaturas na Play Console:

1. Acesse o [Google Play Console](https://play.google.com/console) e selecione o **EconomizaJá**.
2. No menu lateral, acesse: **Monetizar com o Google Play** > **Produtos** > **Assinaturas**.
3. Clique em **Criar assinatura** e preencha:

### Produto 1: Plano Pró
- **ID do Produto:** `economizaja_pro_monthly`
- **Nome:** Plano Pró Mensal
- **Descrição:** Propostas ilimitadas para orçamentos e selo de empresa verificada.
- Clique em **Salvar** e depois em **Adicionar plano base**:
  - **ID do plano base:** `pro-monthly`
  - **Tipo de renovação:** Renovação automática mensal
  - **Preço:** R$ 79,90 BRL
  - **Ativar plano base**.

### Produto 2: Plano Premium
- **ID do Produto:** `economizaja_premium_monthly`
- **Nome:** Plano Premium Mensal
- **Descrição:** Propostas e ofertas ilimitadas, selo corporativo e suporte VIP.
- Clique em **Salvar** e depois em **Adicionar plano base**:
  - **ID do plano base:** `premium-monthly`
  - **Tipo de renovação:** Renovação automática mensal
  - **Preço:** R$ 159,90 BRL
  - **Ativar plano base**.

> 💡 **Dica de Teste:** Em **Configurar** > **Testadores de licença**, adicione seu endereço de e-mail do Gmail para poder assinar os planos gratuitamente no app sem ser debitado do cartão durante os testes!
