<#
Exemplo de script PowerShell para rodar o backend localmente e instruções rápidas
Uso:
  - Abra um terminal PowerShell na pasta do repositório
  - Ajuste as variáveis abaixo (DATABASE_URL, etc.) ou exporte via $env:...
  - Rode este script para instruções passo-a-passo
#>

Write-Host "=== Start local backend helper ==="

# Ajuste abaixo conforme necessário
$env:DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
# Se tiver serviceAccountKey.json local, copie-o para a pasta backend antes
Write-Host "1) Instale dependências (uma vez): npm ci (na pasta backend)"
Write-Host "2) Inicie o backend: cd backend; npm run start:dev"
Write-Host "3) Em outro terminal, execute: ngrok http 3000"

Write-Host "Dica: para setar FIREBASE_SERVICE_ACCOUNT via variável de ambiente temporária (PowerShell):"
Write-Host "  $env:FIREBASE_SERVICE_ACCOUNT = Get-Content .\backend\serviceAccountKey.json -Raw"

Write-Host "Script finalizado. Abra dois terminais: um para o backend e outro para o ngrok."
