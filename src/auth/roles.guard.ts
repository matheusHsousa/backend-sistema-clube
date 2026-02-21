import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    // Log required roles and minimal user info for diagnosis
    try {
      const uInfo = user
        ? { firebaseUid: user.firebaseUid, email: user.email, roles: user.roles }
        : null;
      this.logger.debug(`RolesGuard requiredRoles=${JSON.stringify(requiredRoles)} user=${JSON.stringify(uInfo)}`);
    } catch (e) {
      this.logger.debug('RolesGuard - não foi possível serializar user para logging');
    }

    const hasRole = user?.roles?.some((r: string) => requiredRoles.includes(r));

    if (!hasRole) {
      this.logger.warn('Acesso negado no RolesGuard - user.roles não contém requiredRoles');
      throw new ForbiddenException('Sem permissão');
    }

    return true;
  }
}
