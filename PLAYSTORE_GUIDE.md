# 🚀 Guia Definitivo de Publicação na Google Play Store — EconomizaJá

Este documento contém o passo a passo técnico para gerar o pacote oficial **Android App Bundle (.aab)** e realizar a publicação do EconomizaJá na **Google Play Console**.

---

## 1. Pré-Requisitos
- [Android Studio](https://developer.android.com/studio) instalado no computador.
- JDK 17 ou 21 configurado no ambiente.
- Conta de Desenvolvedor ativa no [Google Play Console](https://play.google.com/console).

---

## 2. Passo 1: Gerar a Chave de Assinatura (Keystore)
Se você ainda não possui um arquivo `.keystore` de produção, gere um executando o comando abaixo no terminal:

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
A Google Play exige links públicos para aprovação do app:
- **Política de Privacidade (LGPD)**: `https://economizaja.app/#/privacy`
- **Termos de Serviço**: `https://economizaja.app/#/terms`
- **Exclusão de Conta e Dados**: `https://economizaja.app/#/delete-account`

### 5.2 Seção de Segurança dos Dados (Data Safety)
Ao preencher o formulário na Play Console:
- **O app coleta dados?** Sim (Nome, E-mail, Telefone, Localização aproximada).
- **Finalidade:** Funcionalidade do app (autenticação, direcionamento de orçamentos e cotações por região).
- **Os dados são criptografados em trânsito?** Sim (HTTPS / SSL obrigatório).
- **Os usuários podem solicitar a exclusão de seus dados?** Sim (disponível diretamente no aplicativo e na URL de exclusão de conta).

---

## 6. Comandos Úteis

| Comando | Descrição |
|---|---|
| `npm test` | Executa a suíte de testes automatizados de conformidade Play Store |
| `npm run build:android` | Compila o front-end e sincroniza os assets com o Android |
| `npm run open:android` | Abre o projeto diretamente no Android Studio |
| `npm run lint` | Validação estrita de tipos TypeScript |
