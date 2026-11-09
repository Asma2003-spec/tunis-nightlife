import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const TOKEN_TTL_MINUTES = 30;

/** Empreinte stockée en base : le jeton lui-même n'existe que dans l'email. */
const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger('PasswordReset');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Crée un lien valable 30 minutes et l'envoie par email.
   * La réponse est la même que l'email existe ou non (on ne révèle pas qui est inscrit),
   * et l'envoi se fait en arrière-plan pour que le temps de réponse ne le trahisse pas non plus.
   */
  async request(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    if (!user) return;

    const token = randomBytes(32).toString('base64url'); // 43 caractères, 256 bits
    await this.prisma.$transaction([
      // Un seul lien actif à la fois : les anciens liens ne marchent plus
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000),
        },
      }),
    ]);

    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const link = `${appUrl}/reinitialiser?token=${token}`;
    void this.mail
      .send({
        to: { email: user.email, name: user.name },
        subject: 'Réinitialise ton mot de passe — Tunis Nightlife',
        text:
          `Bonjour ${user.name},\n\n` +
          `Tu as demandé à changer ton mot de passe Tunis Nightlife.\n` +
          `Ouvre ce lien pour en choisir un nouveau (valable ${TOKEN_TTL_MINUTES} minutes) :\n${link}\n\n` +
          `Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe ne change pas.`,
        html: this.html(user.name, link),
      })
      .catch((e: Error) =>
        this.logger.error(`Email de réinitialisation non envoyé : ${e.message}`),
      );
  }

  /** Vérifie le lien, enregistre le nouveau mot de passe (haché) et ferme les sessions ouvertes. */
  async reset(token: string, password: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { deletedAt: true } },
      },
    });
    if (!record || record.usedAt || record.expiresAt < new Date() || record.user.deletedAt) {
      throw new BadRequestException('Ce lien est invalide ou a expiré. Fais une nouvelle demande.');
    }

    const passwordHash = await hash(password); // Argon2id
    await this.prisma.$transaction(async (tx) => {
      // Marquage conditionnel : un même lien ne peut servir qu'une fois, même en cas de double clic
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (count === 0) {
        throw new BadRequestException('Ce lien a déjà été utilisé. Fais une nouvelle demande.');
      }
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      });
    });
  }

  private html(name: string, link: string): string {
    const safeName = escapeHtml(name);
    return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#0B0B10;font-family:Arial,sans-serif;color:#E8E8F0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#15151F;border-radius:16px;padding:32px">
        <tr><td style="font-size:22px;font-weight:bold;color:#FFFFFF">Tunis<span style="color:#A78BFA">Nightlife</span></td></tr>
        <tr><td style="padding-top:24px;font-size:16px;line-height:1.5">
          Bonjour ${safeName},<br><br>
          Tu as demandé à changer ton mot de passe. Clique sur le bouton pour en choisir un nouveau.
          Ce lien est valable <strong>${TOKEN_TTL_MINUTES} minutes</strong> et ne fonctionne qu'une fois.
        </td></tr>
        <tr><td style="padding:28px 0">
          <a href="${link}" style="display:inline-block;background:#8B5CF6;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:12px">Choisir un nouveau mot de passe</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.5;color:#9A9AB0">
          Si le bouton ne marche pas, copie ce lien dans ton navigateur :<br>
          <span style="word-break:break-all;color:#A78BFA">${link}</span><br><br>
          Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe ne change pas.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }
}
