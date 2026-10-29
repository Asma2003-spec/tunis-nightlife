'use client';

import Link from 'next/link';
import { STATUS_LABELS } from '@tn/contracts';

/** Petits composants partagés du back-office. */

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300',
  DRAFT: 'bg-surface-2 text-muted',
  DISMISSED: 'bg-surface-2 text-muted',
  PENDING: 'bg-amber-500/15 text-amber-300',
  OPEN: 'bg-amber-500/15 text-amber-300',
  SUSPENDED: 'bg-pink-500/15 text-pink-300',
  REJECTED: 'bg-pink-500/15 text-pink-300',
  CANCELLED: 'bg-pink-500/15 text-pink-300',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
        STATUS_STYLES[status] ?? 'bg-surface-2 text-muted'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Toolbar({
  q,
  onQ,
  status,
  onStatus,
  statuses,
  placeholder = 'Rechercher…',
}: {
  q?: string;
  onQ?: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  statuses: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {onQ && (
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={placeholder}
          className="min-w-56 flex-1 rounded-xl border border-surface-2 bg-surface px-3 py-2 text-sm outline-none focus:border-violet"
        />
      )}
      <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1 text-sm">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatus(s.value)}
            className={`rounded-lg px-3 py-1.5 ${
              status === s.value ? 'bg-violet text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm text-muted">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="disabled:opacity-40">
        ← Précédent
      </button>
      <span>
        Page {page} / {pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="disabled:opacity-40"
      >
        Suivant →
      </button>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-surface-2 bg-surface p-8 text-center text-muted">
      {children}
    </p>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-xl bg-pink-500/10 px-4 py-3 text-sm text-pink-300">
      {error}
    </p>
  );
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-violet px-4 py-2 text-sm font-semibold text-white hover:bg-violet-glow disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-surface-2 px-3 py-1.5 text-sm text-ink hover:border-violet disabled:opacity-50',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-pink-500/40 px-3 py-1.5 text-sm text-pink-300 hover:bg-pink-500/10 disabled:opacity-50',
};

export const field =
  'w-full rounded-xl border border-surface-2 bg-night px-3 py-2 text-sm text-ink outline-none focus:border-violet';

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted/80">{hint}</span>}
    </label>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-block text-sm text-muted hover:text-ink">
      ← {children}
    </Link>
  );
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
