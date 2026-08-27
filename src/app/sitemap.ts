import type { MetadataRoute } from 'next';
import { homeRoute, ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { buildSitemap } from '@/seo/sitemap.utils';
import { PRIORITY_HOME, PRIORITY_PRIMARY } from '@/seo/sitemap.constants';

/**
 * ONLY ROUTES THAT EXIST.
 *
 * This list carried /why-was-my-passport-photo-rejected, and for a while it
 * carried the checker too, while neither had a page behind it. A sitemap that
 * advertises a 404 is not merely useless: Search Console reports every one as
 * an error against the domain, and the 404 page's own advice pointed readers
 * at the checker, which was itself one of them.
 *
 * Country and dimension routes join this list as their pages land, each
 * carrying its specification's lastVerified date as lastModified. A route
 * belongs here the day it renders and not before.
 */
const sitemap = (): MetadataRoute.Sitemap =>
  buildSitemap([
    { route: homeRoute(), changeFrequency: 'weekly', priority: PRIORITY_HOME },
    { route: ROUTE_SEGMENTS.checker, changeFrequency: 'weekly', priority: PRIORITY_PRIMARY },
  ]);

export default sitemap;
