import type { MetadataRoute } from 'next';
import {
  countryDocumentRoute,
  dimensionFamilyRoute,
  homeRoute,
  ROUTE_SEGMENTS,
} from '@/constants/routes.constants';
import { buildSitemap } from '@/seo/sitemap.utils';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { servedSizeFamilies } from '@/dimension-page/size-family.utils';
import { PRIORITY_HOME, PRIORITY_PRIMARY, PRIORITY_SECONDARY } from '@/seo/sitemap.constants';

/**
 * ONLY ROUTES THAT EXIST.
 *
 * This list carried /why-was-my-passport-photo-rejected, and for a while it
 * carried the checker too, while neither had a page behind it. A sitemap that
 * advertises a 404 is not merely useless: Search Console reports every one as
 * an error against the domain, and the 404 page's own advice pointed readers
 * at the checker, which was itself one of them.
 *
 * The country pages come from the SERVABLE registry — the same list
 * generateStaticParams builds pages from — so the sitemap and the router cannot
 * disagree about which URLs exist. Each carries its specification's
 * lastVerified date rather than the build date: telling crawlers that all forty
 * pages changed every time anything is deployed makes the signal worthless.
 *
 * The dimension pages come from the same place their routes do — the families
 * a served specification actually requires — so a size with no page cannot
 * appear here. They carry the newest verification date among the
 * specifications behind them: that is the last day anything on the page could
 * have changed.
 */
const sitemap = (): MetadataRoute.Sitemap =>
  buildSitemap([
    { route: homeRoute(), changeFrequency: 'weekly', priority: PRIORITY_HOME },
    { route: ROUTE_SEGMENTS.checker, changeFrequency: 'weekly', priority: PRIORITY_PRIMARY },
    { route: ROUTE_SEGMENTS.rejected, changeFrequency: 'monthly', priority: PRIORITY_PRIMARY },
    { route: ROUTE_SEGMENTS.headSize, changeFrequency: 'monthly', priority: PRIORITY_SECONDARY },
    {
      route: ROUTE_SEGMENTS.backgroundCheck,
      changeFrequency: 'monthly',
      priority: PRIORITY_SECONDARY,
    },
    ...listServableSpecs().map((spec) => ({
      route: countryDocumentRoute(spec.country, spec.document),
      lastModified: spec.lastVerified,
      changeFrequency: 'monthly' as const,
      priority: PRIORITY_PRIMARY,
    })),
    ...servedSizeFamilies().map((served) => ({
      route: dimensionFamilyRoute(served.family.slug),
      lastModified: newestVerification(served.specs),
      changeFrequency: 'monthly' as const,
      priority: PRIORITY_SECONDARY,
    })),
  ]);

/**
 * The last day anything on a size page could have changed.
 *
 * A size page restates several specifications, so it is as fresh as the
 * freshest of them. Taking the oldest would tell crawlers the page is stale
 * while it is showing a requirement verified this morning.
 */
const newestVerification = (specs: readonly { readonly lastVerified: string }[]): string =>
  specs.map((spec) => spec.lastVerified).sort().at(-1) ?? '';

export default sitemap;
