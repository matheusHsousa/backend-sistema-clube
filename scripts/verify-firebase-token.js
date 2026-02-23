// backend/scripts/verify-firebase-token.js
// Usage:
// 1) With base64 env:
//    $env:SERVICE_ACCOUNT_KEY_BASE64 = '<base64>'
//    node backend/scripts/verify-firebase-token.js <ID_TOKEN>
// 2) With local file backend/serviceAccountKey.json:
//    node backend/scripts/verify-firebase-token.js <ID_TOKEN>

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function initAdmin() {
  if (admin.apps.length) return;

  const base64 = process.env.SERVICE_ACCOUNT_KEY_BASE64;
  const jsonEnv = process.env.SERVICE_ACCOUNT_KEY_JSON;
  let serviceAccount = null;

  try {
    if (base64) {
      const raw = Buffer.from(base64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(raw);
      console.log('Inicializando Firebase Admin a partir de SERVICE_ACCOUNT_KEY_BASE64');
    } else if (jsonEnv) {
      serviceAccount = JSON.parse(jsonEnv);
      console.log('Inicializando Firebase Admin a partir de SERVICE_ACCOUNT_KEY_JSON');
    } else {
      const localPath = path.resolve(process.cwd(), 'backend', 'serviceAccountKey.json');
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf8');
        serviceAccount = JSON.parse(raw);
        console.log('Inicializando Firebase Admin a partir de backend/serviceAccountKey.json');
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin inicializado com sucesso.');
      return;
    }

    console.log('Nenhuma service account encontrada nas variáveis de ambiente nem em backend/serviceAccountKey.json');
    console.log('Tentando Application Default Credentials (ADC)...');
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('Firebase Admin inicializado via ADC');
  } catch (err) {
    console.error('Erro ao inicializar Firebase Admin:', err.message || err);
    process.exit(2);
  }
}

async function verify(token) {
  try {
    await initAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('Token válido. Payload decodificado:');
    console.log(JSON.stringify(decoded, null, 2));
  } catch (err) {
    console.error('Token inválido ou erro na verificação:');
    console.error(err.message || err);
    process.exitCode = 1;
  }
}

(async () => {
  const token = process.argv[2] || process.env.TOKEN;
  if (!token) {
    console.error('Usage: node backend/scripts/verify-firebase-token.js <ID_TOKEN>');
    process.exit(2);
  }
    // normalize token: remove leading 'Bearer ' if present and trim
    const normalized = token.replace(/^Bearer\s+/i, '').trim();
    if (normalized.length !== token.length) {
      console.log('Prefix "Bearer " detectado e removido.');
    }
    // basic diagnostics
    if (normalized.length < 100) {
      console.warn('Aviso: token parece curto (possivelmente incompleto).');
    }
    const previewStart = normalized.slice(0, 10);
    const previewEnd = normalized.slice(-10);
    console.log(`Token length=${normalized.length}, preview=${previewStart}...${previewEnd}`);

    await verify(normalized);
})();
