import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@tn/contracts';
import type { AuthRequest } from './auth.types';

const ROLES_KEY = 'roles';

/** Rôles autorisés sur une route ou un contrôleur. Toujours combiné avec JwtAuthGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Vérifie le rôle côté serveur, à partir de l'utilisateur relu en base par JwtAuthGuard.
 * Masquer un bouton dans l'interface ne suffit jamais : c'est ce garde qui protège.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Accès réservé');
    }
    return true;
  }
}
