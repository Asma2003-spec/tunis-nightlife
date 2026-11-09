'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminUserRow } from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import { ErrorNote, btn, field } from './ui';

// Sans caractères faciles à confondre (0/O, 1/l/I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!';

/** Mot de passe aléatoire de 14 caractères, tiré avec le générateur cryptographique du navigateur. */
function generatePassword(length = 14): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join('');
}

/**
 * Fenêtre de réinitialisation du mot de passe d'un utilisateur.
 * L'administrateur choisit (ou génère) le nouveau mot de passe et le transmet à la personne.
 * L'API ne stocke que son hash : il n'est plus jamais affiché après fermeture.
 */
export function PasswordResetDialog({
  user,
  isMe,
  onClose,
  onDone,
}: {
  user: AdminUserRow;
  isMe: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Au moins 8 caractères');
    setBusy(true);
    try {
      await adminApi.resetPassword(user.id, password);
      if (isMe) {
        // Les sessions ouvertes avant le changement sont refusées : il faut se reconnecter
        window.location.href = '/connexion?next=/admin/utilisateurs';
        return;
      }
      setSaved(true);
      onDone(`Nouveau mot de passe enregistré pour ${user.name}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copie impossible : sélectionne le mot de passe et copie-le à la main');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        className="w-full max-w-md rounded-2xl border border-surface-2 bg-surface p-6 shadow-2xl"
      >
        <h2 id="reset-title" className="text-lg font-semibold">
          Nouveau mot de passe
        </h2>
        <p className="mt-1 text-sm text-muted">
          {user.name} · {user.email}
        </p>

        {saved ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              ✓ Enregistré. Transmets ce mot de passe à la personne : il ne sera plus affiché
              ensuite.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 rounded-xl border border-surface-2 bg-night px-3 py-2 text-sm break-all">
                {password}
              </code>
              <button type="button" onClick={copy} className={btn.ghost}>
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className={btn.primary}>
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Mot de passe (8 caractères minimum)</span>
              <div className="flex gap-2">
                <input
                  ref={input}
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  spellCheck={false}
                  className={`${field} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className={btn.ghost}
                  aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {visible ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </label>
            <button
              type="button"
              onClick={() => {
                setPassword(generatePassword());
                setVisible(true);
              }}
              className="text-sm text-violet-glow hover:underline"
            >
              Générer un mot de passe sûr
            </button>
            <ul className="space-y-1 text-xs text-muted">
              <li>• L’ancien mot de passe ne fonctionnera plus.</li>
              <li>
                •{' '}
                {isMe
                  ? 'C’est ton compte : tu devras te reconnecter avec le nouveau mot de passe.'
                  : 'La personne est déconnectée de tous ses appareils.'}
              </li>
            </ul>
            <ErrorNote error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} className={btn.ghost}>
                Annuler
              </button>
              <button type="submit" disabled={busy} className={btn.primary}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
