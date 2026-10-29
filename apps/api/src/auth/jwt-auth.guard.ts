import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE, type AuthRequest, type JwtPayload } from './auth.types';

const OPTIONAL_AUTH = 'optionalAuth';
/** La route fonctionne sans connexion, mais reconnaît l'utilisateur s'il est connecté. */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH, true);

/**
 * Vérifie le jeton JWT envoyé :
 *  - par le Web dans le cookie HttpOnly `tn_session`
 *  - par le mobile dans l'en-tête `Authorization: Bearer <jeton>`
 * L'utilisateur est rechargé depuis la base : un compte supprimé ou un rôle modifié
 * est pris en compte immédiatement (on ne fait jamais confiance au rôle envoyé par le client).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractToken(req);
    if (!token) {
      if (optional) return true;
      throw new UnauthorizedException('Connexion requise');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!user) throw new Error('Utilisateur introuvable');
      req.user = user;
      return true;
    } catch {
      if (optional) return true;
      throw new UnauthorizedException('Session invalide ou expirée');
    }
  }

  private extractToken(req: AuthRequest): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookie = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    return cookie ?? null;
  }
}
