import type { Request } from 'express';
import type { UserRole } from '@tn/contracts';

/** Utilisateur authentifié attaché à la requête par le garde JWT. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  /** Date d'émission (secondes), ajoutée automatiquement par @nestjs/jwt. */
  iat?: number;
}

/** Nom du cookie de session utilisé par le Web. */
export const SESSION_COOKIE = 'tn_session';
