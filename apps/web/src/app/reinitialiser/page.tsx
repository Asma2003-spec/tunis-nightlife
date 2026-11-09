import { ResetForm } from './reset-form';

export const metadata = {
  title: 'Nouveau mot de passe — Tunis Nightlife',
  // Le lien contient un jeton secret : la page ne doit être ni indexée ni transmise à d'autres sites
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetForm token={typeof token === 'string' ? token : ''} />;
}
