'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useAuth } from '@/components/auth-provider';

const input =
  'w-full rounded-xl border border-surface-2 bg-night px-3 py-2.5 outline-none focus:border-violet';

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const res =
        mode === 'login'
          ? await api.login({ email: String(f.get('email')), password: String(f.get('password')) })
          : await api.register({
              name: String(f.get('name')),
              email: String(f.get('email')),
              password: String(f.get('password')),
              ageConfirmed: true, // case obligatoire ; l'API vérifie aussi
            });
      setUser(res.user);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl border border-surface-2 bg-surface p-6 shadow-[0_0_60px_-20px] shadow-violet/50">
        <div className="mb-6 grid grid-cols-2 rounded-full bg-night p-1 text-sm font-semibold">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError('');
              }}
              className={`rounded-full py-2 ${mode === m ? 'bg-violet text-white' : 'text-muted'}`}
            >
              {m === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Nom</span>
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                className={input}
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Email</span>
            <input name="email" type="email" required autoComplete="email" className={input} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Mot de passe</span>
            <input
              name="password"
              type="password"
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={input}
            />
          </label>
          {mode === 'register' && (
            <label className="flex items-start gap-2 text-sm text-muted">
              <input name="age" type="checkbox" required className="mt-1 accent-violet" />
              Je confirme avoir 18 ans ou plus.
            </label>
          )}

          {error && (
            <p role="alert" className="text-sm text-pink-300">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-violet py-2.5 font-semibold text-white hover:bg-violet-glow disabled:opacity-60"
          >
            {busy ? 'Patiente…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        
      </div>
    </main>
  );
}
