import type { Metadata } from 'next';
import { ApiWakeBanner } from '@/components/api-wake';
import { AuthProvider } from '@/components/auth-provider';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tunis Nightlife — Les meilleures sorties du Grand Tunis',
  description:
    'Découvrez les boîtes de nuit, lounges et rooftops du Grand Tunis : notes vérifiées, carte, horaires et événements.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body className="min-h-dvh antialiased">
        <AuthProvider>
          <SiteHeader />
          {children}
        </AuthProvider>
        <ApiWakeBanner />
      </body>
    </html>
  );
}
