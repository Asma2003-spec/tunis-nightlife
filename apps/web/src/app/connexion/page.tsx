import { AuthForm } from './auth-form';

export const metadata = { title: 'Connexion — Tunis Nightlife' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Redirection limitée aux chemins internes (évite les redirections ouvertes)
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return <AuthForm next={safeNext} />;
}
