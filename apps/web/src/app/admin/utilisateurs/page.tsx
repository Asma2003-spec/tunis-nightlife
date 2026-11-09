'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ROLE_LABELS,
  USER_ROLES,
  type AdminUserRow,
  type Paginated,
  type UserRole,
} from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import { useAuth } from '@/components/auth-provider';
import { PasswordResetDialog } from '@/components/admin/password-reset-dialog';
import {
  Empty,
  ErrorNote,
  PageHeader,
  Pagination,
  Toolbar,
  btn,
  field,
} from '@/components/admin/ui';

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'MODERATOR', label: 'Modérateurs' },
  { value: 'USER', label: 'Utilisateurs' },
];

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState<Paginated<AdminUserRow> | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState<AdminUserRow | null>(null);

  const load = useCallback(() => {
    adminApi
      .users({ q, status: role, page })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [q, role, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function changeRole(u: AdminUserRow, next: UserRole) {
    if (!confirm(`Donner le rôle « ${ROLE_LABELS[next]} » à ${u.name} ?`)) return;
    setError(null);
    try {
      await adminApi.setRole(u.id, next);
      setNotice(`${u.name} est maintenant ${ROLE_LABELS[next].toLowerCase()}.`);
    } catch (e) {
      setError((e as Error).message);
    }
    load();
  }

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle={data ? `${data.total} membre(s)` : undefined} />
      <ErrorNote error={error} />
      {notice && (
        <p className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}
      <Toolbar
        q={q}
        onQ={(v) => {
          setQ(v);
          setPage(1);
        }}
        status={role}
        onStatus={(v) => {
          setRole(v);
          setPage(1);
        }}
        statuses={STATUSES}
        placeholder="Nom ou email…"
      />
      {data && data.items.length === 0 ? (
        <Empty>Aucun utilisateur.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Inscrit le</th>
                <th className="px-4 py-3 font-medium">Avis</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Mot de passe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-2">
              {data?.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {u.id === me?.id && (
                      <span className="ml-2 text-xs text-violet-glow">(toi)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                      timeZone: 'Africa/Tunis',
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted">{u.reviewCount}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === me?.id}
                      title={
                        u.id === me?.id ? 'Tu ne peux pas modifier ton propre rôle' : undefined
                      }
                      onChange={(e) => changeRole(u, e.target.value as UserRole)}
                      className={`${field} w-40 disabled:opacity-50`}
                    >
                      {USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setResetting(u);
                      }}
                      className={`${btn.ghost} whitespace-nowrap`}
                    >
                      Réinitialiser
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
      )}
      {resetting && (
        <PasswordResetDialog
          user={resetting}
          isMe={resetting.id === me?.id}
          onClose={() => setResetting(null)}
          onDone={setNotice}
        />
      )}
    </>
  );
}
