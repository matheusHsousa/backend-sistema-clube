import * as admin from 'firebase-admin';
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  constructor() {
    if (!admin.apps.length) {
      // Permite fornecer o caminho do service account via variável de ambiente (útil em dev/CI)
      const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_KEY_PATH;
      // Inicializa explicitamente com o arquivo de service account
      // tenta em ordem: variável de ambiente, relativo ao __dirname (quando rodando ts-node) e ao cwd (quando em production)
      const candidates = envPath
        ? [path.resolve(envPath), path.resolve(__dirname, '../../serviceAccountKey.json'), path.resolve(process.cwd(), 'serviceAccountKey.json')]
        : [path.resolve(__dirname, '../../serviceAccountKey.json'), path.resolve(process.cwd(), 'serviceAccountKey.json')];

      let initialized = false;
      for (const keyPath of candidates) {
        try {
          if (!fs.existsSync(keyPath)) {
            this.logger.debug(`serviceAccount não encontrado em: ${keyPath}`);
            continue;
          }

          const raw = fs.readFileSync(keyPath, 'utf8');
          const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;

          // alguns JSONs usam project_id (google-style) — compatibiliza
          const hasProjectId = (serviceAccount as any).project_id || (serviceAccount as any).projectId;
          if (!hasProjectId) {
            this.logger.warn(`serviceAccount em ${keyPath} não contém project_id/projectId`);
          }

          this.app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });

          this.logger.log(`Firebase Admin inicializado a partir de: ${keyPath}`);
          initialized = true;
          break;
        } catch (err) {
          this.logger.error(`Erro ao inicializar Firebase Admin com ${keyPath}: ${err?.message || err}`);
        }
      }

      if (!initialized) {
        this.logger.warn('Nenhum serviceAccountKey.json encontrado/válido — tentando Application Default Credentials (ADC)');
        try {
          this.app = admin.initializeApp({ credential: admin.credential.applicationDefault() });
          this.logger.log('Firebase Admin inicializado via Application Default Credentials');
        } catch (err) {
          this.logger.error('Falha ao inicializar Firebase Admin via ADC:', err as any);
          throw err;
        }
      }
    }
  }

  async verifyToken(token: string) {
    // usa a instância do app inicializada
    return this.app.auth().verifyIdToken(token);
  }
}
