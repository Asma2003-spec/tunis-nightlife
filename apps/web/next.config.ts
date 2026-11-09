import type { NextConfig } from 'next';

/** Origine de l'API (sans /api/v1), ex. https://tunis-nightlife-api.onrender.com */
const API_ORIGIN = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000/api/v1'
).replace(/\/api\/v\d+\/?$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Le paquet partagé est compilé par Next avec le reste de l'application
  transpilePackages: ['@tn/contracts'],
  experimental: {
    // Hébergement gratuit : l'API endormie met environ une minute à répondre.
    // Le relais l'attend au lieu d'abandonner après 30 secondes.
    proxyTimeout: 90_000,
  },
  // Relais vers l'API : le navigateur ne parle qu'au domaine du site
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${API_ORIGIN}/api/v1/:path*` },
      { source: '/media/:path*', destination: `${API_ORIGIN}/media/:path*` },
    ];
  },
};

export default nextConfig;
