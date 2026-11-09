'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/client';

const input =
  'w-full rounded-xl border border-surface-2 bg-night px-3 py-2.5 outline-none focus:border-violet';

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    setBusy(true);
    setError('');
    try {
      await api.forgotPassword(email);
      setSentTo(email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <title>Mot de passe oublié — Tunis Nightlife</title>
      <div className="rounded-3xl border border-surface-2 bg-surface p-6 shadow-[0_0_60px_-20px] shadow-violet/50">
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>

        {sentTo ? (
          <div className="mt-4 space-y-4 text-sm">
            <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-emerald-300">
              Si un compte existe pour <strong>{sentTo}</strong>, un email vient d’être envoyé avec
              un lien pour choisir un nouveau mot de passe. Le lien est valable 30 minutes.
            </p>
            <p className="text-muted">
              Rien reçu après quelques minutes ? Regarde dans les courriers indésirables (spam), ou{' '}
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="font-semibold text-violet-glow hover:underline"
              >
                fais une nouvelle demande
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-muted">
              Indique l’email de ton compte : tu recevras un lien pour choisir un nouveau mot de
              passe.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Email</span>
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                autoFocus
                className={input}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-pink-300">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="w-full rounded-xl bg-violet py-2.5 font-semibold text-white hover:bg-violet-glow disabled:opacity-60"
            >
              {busy ? 'Envoi…' : 'Recevoir le lien'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/connexion" className="text-violet-glow hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
