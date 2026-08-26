import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/constants/routes.constants';
import { env } from '@/config/env.config';

/**
 * Nothing is disallowed.
 *
 * There is no admin area, no user content and no search-result pages to keep out
 * of the index. Blocking a path here would also block the rendering crawler from
 * fetching the analysis models, which would make the tool appear broken to
 * Google's renderer while working perfectly for every human.
 */
const robots = (): MetadataRoute.Robots => ({
  rules: [{ userAgent: '*', allow: '/' }],
  sitemap: absoluteUrl(env.NEXT_PUBLIC_SITE_URL, '/sitemap.xml'),
  host: env.NEXT_PUBLIC_SITE_URL,
});

export default robots;
