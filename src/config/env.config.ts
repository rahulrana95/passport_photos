import { z } from 'zod';

/**
 * Environment is validated once, at import time, so a missing or malformed
 * variable fails the build rather than surfacing as a broken canonical URL in
 * production. Every consumer imports `env` from here — never `process.env`.
 */
const environmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .url({ error: 'NEXT_PUBLIC_SITE_URL must be an absolute URL, e.g. https://example.com' })
    .refine((value) => !value.endsWith('/'), {
      error: 'NEXT_PUBLIC_SITE_URL must not end in a slash — trailing slashes are applied by the route builders',
    }),
});

export type Environment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (source: Record<string, string | undefined>): Environment =>
  environmentSchema.parse({
    NEXT_PUBLIC_SITE_URL: source['NEXT_PUBLIC_SITE_URL'],
  });

export const env: Environment = parseEnvironment(process.env);
