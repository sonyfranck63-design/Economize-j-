# Script para geração de Keystore de Produção (Upload Key) para Google Play Store
param (
    [string]$KeystoreFolder = "C:\Users\mathe\EconomizaJa-Keystore",
    [string]$KeyAlias = "economizaja-upload-key",
    [string]$Password = "EconomizaJa@2026"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $KeystoreFolder)) {
    New-Item -ItemType Directory -Path $KeystoreFolder -Force | Out-Null
}

$KeystorePath = Join-Path $KeystoreFolder "economizaja-release-key.jks"

Write-Host "Criando Keystore em: $KeystorePath" -ForegroundColor Cyan

$dname = "CN=EconomizaJa, OU=Mobile, O=EconomizaJa, L=Porto Alegre, ST=RS, C=BR"

keytool -genkeypair `
    -v `
    -keystore $KeystorePath `
    -alias $KeyAlias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $Password `
    -keypass $Password `
    -dname $dname

Write-Host "`n[SUCESSO] Chave gerada com sucesso!" -ForegroundColor Green
Write-Host "Caminho da Keystore: $KeystorePath" -ForegroundColor Yellow
Write-Host "Alias: $KeyAlias" -ForegroundColor Yellow

# Copiar cópia de segurança para a pasta Downloads para facilitar acesso
Copy-Item $KeystorePath -Destination "C:\Users\mathe\Downloads\economizaja-release-key.jks" -Force
Write-Host "Cópia salva em Downloads: C:\Users\mathe\Downloads\economizaja-release-key.jks" -ForegroundColor Green

Write-Host "`nImpressões digitais do certificado (SHA-256):" -ForegroundColor Cyan
keytool -list -v -keystore $KeystorePath -alias $KeyAlias -storepass $Password | Select-String "SHA256:", "SHA1:"
