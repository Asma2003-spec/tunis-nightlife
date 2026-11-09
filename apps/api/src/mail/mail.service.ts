import { Injectable, Logger } from '@nestjs/common';

export interface MailMessage {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

/**
 * Envoi d'emails via l'API HTTP de Brevo (offre gratuite : 300 emails / jour).
 * L'API HTTP est utilisée plutôt que SMTP : les ports SMTP sont bloqués sur l'offre
 * gratuite de Render.
 *
 * Variables : BREVO_API_KEY, MAIL_FROM (adresse validée dans Brevo), MAIL_FROM_NAME.
 * Sans BREVO_API_KEY (développement), l'email est écrit dans la console de l'API.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');

  get enabled(): boolean {
    return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM);
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.enabled) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('BREVO_API_KEY ou MAIL_FROM manquant : email non envoyé.');
        return;
      }
      this.logger.warn(
        `Envoi d'email désactivé (BREVO_API_KEY absent). Email pour ${message.to.email} :\n` +
          `  Sujet : ${message.subject}\n${message.text}`,
      );
      return;
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.MAIL_FROM,
          name: process.env.MAIL_FROM_NAME || 'Tunis Nightlife',
        },
        to: [message.to],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Le détail reste dans les logs du serveur, jamais renvoyé au visiteur
      throw new Error(`Brevo a refusé l'envoi (${res.status}) : ${await res.text()}`);
    }
  }
}
