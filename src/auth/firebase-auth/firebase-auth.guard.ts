import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private authService: AuthService) { }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) throw new UnauthorizedException('Token não enviado');

    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const firebaseUser = await this.authService.validateUser(token);

      if (!firebaseUser) {
        this.logger.warn('validateUser retornou null/undefined');
        throw new UnauthorizedException('Token Firebase inválido');
      }

      // Log minimal info (uid/email/roles) to avoid leaking full token
      const info: any = {
        firebaseUid: firebaseUser.firebaseUid,
        email: firebaseUser.email,
        roles: firebaseUser.roles,
      };
      this.logger.debug(`Usuário validado pelo AuthService: ${JSON.stringify(info)}`);

      request.user = firebaseUser;
    } catch (err) {
      this.logger.error('Erro ao validar token', err as any);
      // Normaliza o erro para 401 Unauthorized para evitar 500 Internal Server Error
      throw new UnauthorizedException('Token inválido');
    }


    return true;
  }
}
