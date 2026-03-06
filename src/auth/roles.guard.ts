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
    } catch (e) {
    }

    const hasRole = user?.roles?.some((r: string) => requiredRoles.includes(r));

    if (!hasRole) {
      throw new ForbiddenException('Sem permissão');
    }

    return true;
  }
}
