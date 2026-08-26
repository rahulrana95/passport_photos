import { z } from 'zod';

/**
 * Resolves the site's absolute origin, which every canonical URL, Open Graph
 * tag and sitemap entry is built from.
 *
 * Precedence, and why:
 *   1. NEXT_PUBLIC_SITE_URL — an explicit custom domain always wins.
 *   2. Vercel's own production URL. Vercel injects this at build time, so a
 *      deployment works with no configuration at all. Note this is the
 *      PRODUCTION url even on a preview build, which is deliberate: a preview
 *      must never canonicalise to itself, or Vercel preview URLs end up
 *      indexed and competing with production for the same terms.
 *   3. localhost, outside production only.
 *
 * Failing with no value is still correct — a production build with no origin
 * would emit relative canonicals and silently de-index the site — but it should
 * almost never happen now.
 */
const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const resolveSiteUrl = (source: Record<string, string | undefined>): string | undefined => {
  const explicit = source['NEXT_PUBLIC_SITE_URL'];
  if (explicit !== undefined && explicit.trim() !== '') return stripTrailingSlash(explicit.trim());

  const vercelProduction =
    source['NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL'] ?? source['VERCEL_PROJECT_PRODUCTION_URL'];
  if (vercelProduction !== undefined && vercelProduction.trim() !== '') {
    return `https://${stripTrailingSlash(vercelProduction.trim())}`;
  }

  if (source['NODE_ENV'] !== 'production') return 'http://localhost:3000';

  return undefined;
};

/**
 * True only for a Vercel production deployment.
 *
 * Preview and development deployments are marked noindex, so a branch build
 * cannot be indexed and outrank the page it was branched from.
 */
export const resolveIsIndexable = (source: Record<string, string | undefined>): boolean => {
  const vercelEnv = source['NEXT_PUBLIC_VERCEL_ENV'] ?? source['VERCEL_ENV'];
  if (vercelEnv !== undefined) return vercelEnv === 'production';
  return source['NODE_ENV'] === 'production';
};

const environmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({
    error:
      'No site origin could be resolved. Set NEXT_PUBLIC_SITE_URL to an absolute URL, or deploy on Vercel where the production URL is provided automatically.',
  }),
  IS_INDEXABLE: z.boolean(),
});

export type Environment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (source: Record<string, string | undefined>): Environment =>
  environmentSchema.parse({
    NEXT_PUBLIC_SITE_URL: resolveSiteUrl(source),
    IS_INDEXABLE: resolveIsIndexable(source),
  });

export const env: Environment = parseEnvironment(process.env);
