import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Le paquet partagé est compilé par Next avec le reste de l'application
  transpilePackages: ['@tn/contracts'],
};

export default nextConfig;
