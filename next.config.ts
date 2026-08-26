import type { NextConfig } from 'next';

/**
 * Deployed to Vercel. Nothing in this product runs on a server at request time —
 * every route is statically generated and all image processing happens in the
 * browser — so there are no route handlers, no middleware and no server actions.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Canonical URLs, sitemap entries and internal links must all agree. Decided
  // once here so nothing hand-rolls a variant.
  trailingSlash: false,
  poweredByHeader: false,
  typedRoutes: true,
};

export default nextConfig;
