# Rodando localmente e expondo com ngrok (Windows)

Se você quer que outras pessoas acessem seu backend sem fazer deploy em um servidor externo, use o ngrok para criar um túnel HTTP para a sua máquina local.

Passos mínimos (PowerShell):

1. Instale dependências e rode o backend:

```powershell
cd backend
npm ci
# em desenvolvimento (watch) na porta 3000
npm run start:dev
```

2. Coloque seu `serviceAccountKey.json` (se usar Firebase Admin) na pasta `backend`:

```powershell
Copy-Item C:\caminho\para\serviceAccountKey.json .\backend\serviceAccountKey.json
```

3. Instale e autentique no ngrok (https://ngrok.com/download). No PowerShell:

```powershell
ngrok authtoken SEU_AUTHTOKEN
ngrok http 3000
```

4. Compartilhe a URL pública (ex.: `https://abc123.ngrok.io`) gerada pelo ngrok com quem precisa acessar.

Observações de rede e segurança:
- Não é necessário que os outros estejam na sua mesma rede local — ngrok cria um túnel via Internet.
- ngrok é recomendado só para desenvolvimento/testes; para produção use um provedor (Fly, Vercel, etc.).
- Se seu backend depende de um banco de dados local, quem acessar via ngrok também precisará que o banco seja acessível publicamente (não recomendado). Prefira usar um DB em nuvem.
