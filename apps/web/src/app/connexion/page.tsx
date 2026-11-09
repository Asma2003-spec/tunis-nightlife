import { AuthForm } from './auth-form';

export const metadata = { title: 'Connexion — Tunis Nightlife' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reinitialise?: string }>;
}) {
  const { next, reinitialise } = await searchParams;
  // Redirection limitée aux chemins internes (évite les redirections ouvertes)
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return (
    <AuthForm
      next={safeNext}
      notice={
        reinitialise === '1'
          ? 'Mot de passe modifié. Connecte-toi avec ton nouveau mot de passe.'
          : undefined
      }
    />
  );
}
