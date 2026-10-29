'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';

const LINKS = [
  { href: '/', label: 'Explorer' },
  { href: '/carte', label: 'Carte' },
  { href: '/favoris', label: 'Favoris' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-[1000] border-b border-surface-2 bg-night/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold">
          Tunis<span className="text-violet-glow">Nightlife</span>
        </Link>

        <nav className="order-last flex w-full items-center gap-1 text-sm sm:order-none sm:w-auto">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  active ? 'bg-violet text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="text-sm">
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              {user.role !== 'USER' && (
                <Link
                  href="/admin"
                  className={`rounded-full px-3 py-1.5 ${
                    pathname.startsWith('/admin')
                      ? 'bg-violet text-white'
                      : 'border border-violet/60 text-violet-glow hover:bg-violet hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
              <span className="hidden text-muted md:inline">
                Bonjour, {user.name.split(' ')[0]}
              </span>
              <button onClick={logout} className="text-muted hover:text-ink">
                Déconnexion
              </button>
            </div>
          ) : (
            <Link
              href={`/connexion?next=${encodeURIComponent(pathname)}`}
              className="rounded-full border border-violet/60 px-3 py-1.5 text-violet-glow hover:bg-violet hover:text-white"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
