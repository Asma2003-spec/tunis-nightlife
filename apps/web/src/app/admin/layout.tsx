'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROLE_LABELS, type UserRole } from '@tn/contracts';
import { useAuth } from '@/components/auth-provider';

const NAV: { href: string; label: string; icon: string; roles: UserRole[] }[] = [
  { href: '/admin', label: 'Tableau de bord', icon: '📊', roles: ['MODERATOR', 'ADMIN'] },
  { href: '/admin/etablissements', label: 'Établissements', icon: '🏙️', roles: ['ADMIN'] },
  { href: '/admin/evenements', label: 'Événements', icon: '🎉', roles: ['ADMIN'] },
  { href: '/admin/avis', label: 'Avis', icon: '⭐', roles: ['MODERATOR', 'ADMIN'] },
  { href: '/admin/signalements', label: 'Signalements', icon: '🚩', roles: ['MODERATOR', 'ADMIN'] },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥', roles: ['ADMIN'] },
];

/**
 * Le menu s'adapte au rôle, mais la vraie protection est côté API (JwtAuthGuard + RolesGuard) :
 * même en contournant cette page, un utilisateur sans droits reçoit 401 ou 403.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return <main className="p-10 text-center text-muted">Chargement…</main>;

  if (!user || user.role === 'USER') {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="mt-4 text-2xl font-bold">Espace réservé</h1>
        <p className="mt-2 text-muted">
          Le back-office est réservé aux modérateurs et aux administrateurs.
        </p>
        {!user && (
          <Link
            href="/connexion?next=/admin"
            className="mt-6 inline-block rounded-xl bg-violet px-5 py-2.5 font-semibold text-white"
          >
            Se connecter
          </Link>
        )}
      </main>
    );
  }

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const allowed = items.some((n) =>
    n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href),
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <aside className="shrink-0 lg:w-56">
        <div className="mb-4 rounded-2xl border border-surface-2 bg-surface p-4">
          <p className="text-xs tracking-widest text-violet-glow uppercase">Back-office</p>
          <p className="mt-1 font-semibold">{user.name}</p>
          <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {items.map((n) => {
            const active =
              n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap ${
                  active ? 'bg-violet text-white' : 'text-muted hover:bg-surface hover:text-ink'
                }`}
              >
                <span aria-hidden>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 pb-16">
        {allowed ? (
          children
        ) : (
          <p className="rounded-2xl bg-surface p-8 text-center text-muted">
            Cette section est réservée aux administrateurs.
          </p>
        )}
      </main>
    </div>
  );
}
