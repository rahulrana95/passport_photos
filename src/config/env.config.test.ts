import { describe, expect, it } from 'vitest';
import { parseEnvironment, resolveIsIndexable, resolveSiteUrl } from './env.config';

describe('resolveSiteUrl', () => {
  it('prefers an explicit custom domain', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://checker.example',
        VERCEL_PROJECT_PRODUCTION_URL: 'project.vercel.app',
      }),
    ).toBe('https://checker.example');
  });

  it('strips a trailing slash rather than rejecting it', () => {
    // A trailing slash is a papercut, not a config error worth failing a build
    // over. Normalising keeps the join with a route unambiguous either way.
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://checker.example/' })).toBe(
      'https://checker.example',
    );
  });

  it('ignores an empty explicit value and falls through', () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: '  ', VERCEL_PROJECT_PRODUCTION_URL: 'p.vercel.app' }),
    ).toBe('https://p.vercel.app');
  });

  it('derives the origin from Vercel with no configuration at all', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'p.vercel.app' })).toBe(
      'https://p.vercel.app',
    );
  });

  it('uses the production URL even on a preview build', () => {
    // Deliberate: a preview that canonicalises to itself can be indexed and
    // then competes with the page it was branched from.
    expect(
      resolveSiteUrl({ VERCEL_ENV: 'preview', VERCEL_PROJECT_PRODUCTION_URL: 'p.vercel.app' }),
    ).toBe('https://p.vercel.app');
  });

  it('prefers the client-exposed Vercel variable when both are present', () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'public.vercel.app',
        VERCEL_PROJECT_PRODUCTION_URL: 'server.vercel.app',
      }),
    ).toBe('https://public.vercel.app');
  });

  it('falls back to localhost outside production', () => {
    expect(resolveSiteUrl({ NODE_ENV: 'development' })).toBe('http://localhost:3000');
  });

  it('resolves nothing in production with no origin available', () => {
    // Emitting relative canonicals would silently de-index the site, so this
    // must fail the build rather than guess.
    expect(resolveSiteUrl({ NODE_ENV: 'production' })).toBeUndefined();
  });
});

describe('resolveIsIndexable', () => {
  it('indexes a Vercel production deployment', () => {
    expect(resolveIsIndexable({ VERCEL_ENV: 'production' })).toBe(true);
  });

  it.each(['preview', 'development'])('does not index a Vercel %s deployment', (vercelEnv) => {
    expect(resolveIsIndexable({ VERCEL_ENV: vercelEnv })).toBe(false);
  });

  it('reads the client-exposed variable when present', () => {
    expect(resolveIsIndexable({ NEXT_PUBLIC_VERCEL_ENV: 'production' })).toBe(true);
  });

  it('falls back to NODE_ENV off Vercel', () => {
    expect(resolveIsIndexable({ NODE_ENV: 'production' })).toBe(true);
    expect(resolveIsIndexable({ NODE_ENV: 'development' })).toBe(false);
  });
});

describe('parseEnvironment', () => {
  it('produces a validated environment from a Vercel deployment', () => {
    expect(
      parseEnvironment({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'p.vercel.app' }),
    ).toEqual({ NEXT_PUBLIC_SITE_URL: 'https://p.vercel.app', IS_INDEXABLE: true });
  });

  it('throws with an actionable message when no origin can be resolved', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production' })).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it('rejects an origin that is not a URL', () => {
    expect(() => parseEnvironment({ NEXT_PUBLIC_SITE_URL: 'not-a-url' })).toThrow();
  });
});
