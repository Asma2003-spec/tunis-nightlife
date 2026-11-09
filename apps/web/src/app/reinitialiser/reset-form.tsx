'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useAuth } from '@/components/auth-provider';

const input =
  'w-full rounded-xl border border-surface-2 bg-night px-3 py-2.5 outline-none focus:border-violet';

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const validLink = /^[A-Za-z0-9_-]{43}$/.test(token);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    if (password !== String(f.get('confirm'))) {
      setError('Les deux mots de passe ne sont pas identiques');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.resetPassword(token, password);
      setUser(null); // l'API ferme toutes les sessions
      router.replace('/connexion?reinitialise=1');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl border border-surface-2 bg-surface p-6 shadow-[0_0_60px_-20px] shadow-violet/50">
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>

        {!validLink ? (
          <div className="mt-4 space-y-4 text-sm">
            <p className="rounded-xl bg-pink-500/10 px-4 py-3 text-pink-300">
              Ce lien est incomplet ou invalide. Ouvre le lien exact reçu par email, ou fais une
              nouvelle demande.
            </p>
            <Link
              href="/mot-de-passe-oublie"
              className="font-semibold text-violet-glow hover:underline"
            >
              Faire une nouvelle demande →
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">
                Nouveau mot de passe (8 caractères minimum)
              </span>
              <input
                name="password"
                type={visible ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                autoFocus
                className={input}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Confirme le mot de passe</span>
              <input
                name="confirm"
                type={visible ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className={input}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                className="accent-violet"
              />
              Afficher les mots de passe
            </label>
            {error && (
              <div role="alert" className="space-y-1 text-sm text-pink-300">
                <p>{error}</p>
                {/expiré|utilisé|invalide/i.test(error) && (
                  <Link href="/mot-de-passe-oublie" className="font-semibold text-violet-glow">
                    Faire une nouvelle demande →
                  </Link>
                )}
              </div>
            )}
            <button
              disabled={busy}
              className="w-full rounded-xl bg-violet py-2.5 font-semibold text-white hover:bg-violet-glow disabled:opacity-60"
            >
              {busy ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
