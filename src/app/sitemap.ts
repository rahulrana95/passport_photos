import type { MetadataRoute } from 'next';
import { homeRoute, ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { buildSitemap } from '@/seo/sitemap.utils';
import { PRIORITY_HOME, PRIORITY_PRIMARY } from '@/seo/sitemap.constants';

/**
 * Country and dimension routes join this list as the registry lands. Each will
 * carry its specification's lastVerified date as lastModified.
 */
const sitemap = (): MetadataRoute.Sitemap =>
  buildSitemap([
    { route: homeRoute(), changeFrequency: 'weekly', priority: PRIORITY_HOME },
    { route: ROUTE_SEGMENTS.checker, changeFrequency: 'weekly', priority: PRIORITY_PRIMARY },
    { route: ROUTE_SEGMENTS.rejected, changeFrequency: 'monthly', priority: PRIORITY_PRIMARY },
  ]);

export default sitemap;
