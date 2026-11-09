import { randomBytes } from 'node:crypto';
import { Global, Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MailService } from '../mail/mail.service';
import { PasswordResetService } from './password-reset.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        let secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET manquant ou trop court (32 caractères minimum)');
          }
          // Développement uniquement : secret aléatoire, les sessions expirent au redémarrage
          secret = randomBytes(48).toString('hex');
          new Logger('Auth').warn(
            'JWT_SECRET absent de .env : secret temporaire utilisé (sessions perdues au redémarrage).',
          );
        }
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, MailService, PasswordResetService],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
