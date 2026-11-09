import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
} from '@tn/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard, OptionalAuth } from './jwt-auth.guard';
import { SESSION_COOKIE, type AuthUser } from './auth.types';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours, comme le JWT

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Créer un compte (18 ans et plus)' })
  @ApiBody({
    schema: {
      example: {
        name: 'Asma',
        email: 'asma@example.com',
        password: '********',
        ageConfirmed: true,
      },
    },
  })
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput & { email: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.register(body);
    this.setCookie(res, result.accessToken);
    return result;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // limite les attaques par force brute
  @ApiOperation({ summary: 'Se connecter' })
  @ApiBody({ schema: { example: { email: 'admin@demo.local', password: 'Demo-Password-2026!' } } })
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput & { email: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.auth.login(body);
    this.setCookie(res, result.accessToken);
    return result;
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Se déconnecter (Web)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Post('forgot-password')
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // évite d'inonder une boîte mail
  @ApiOperation({
    summary: 'Mot de passe oublié : envoie un lien par email',
    description: 'Répond toujours 204, que l’email soit inscrit ou non.',
  })
  @ApiBody({ schema: { example: { email: 'asma@example.com' } } })
  async forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema)) body: { email: string },
  ): Promise<void> {
    await this.passwordReset.request(body.email);
  }

  @Post('reset-password')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Choisir un nouveau mot de passe avec le lien reçu par email' })
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) body: { token: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.passwordReset.reset(body.token, body.password);
    // Toutes les sessions sont fermées : on efface aussi le cookie de ce navigateur
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @OptionalAuth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Utilisateur connecté (null si non connecté)' })
  me(@CurrentUser() user?: AuthUser): AuthUser | null {
    return user ?? null;
  }

  /** Cookie HttpOnly : inaccessible au JavaScript de la page (protège contre le vol par XSS). */
  private setCookie(res: Response, token: string) {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });
  }
}
