import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El estado en vivo depende de Mongo en request-time: nada de prerender estatico.
  experimental: { optimizePackageImports: ['socket.io-client'] },
};

export default nextConfig;
