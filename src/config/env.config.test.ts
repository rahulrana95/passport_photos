import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './env.config';

describe('parseEnvironment', () => {
  it('accepts an absolute URL with no trailing slash', () => {
    expect(parseEnvironment({ NEXT_PUBLIC_SITE_URL: 'https://example.com' })).toEqual({
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    });
  });

  it('rejects a URL with a trailing slash so canonical joins stay unambiguous', () => {
    expect(() => parseEnvironment({ NEXT_PUBLIC_SITE_URL: 'https://example.com/' })).toThrow();
  });

  it('rejects a relative URL', () => {
    expect(() => parseEnvironment({ NEXT_PUBLIC_SITE_URL: '/photos' })).toThrow();
  });

  it('rejects a missing value', () => {
    expect(() => parseEnvironment({})).toThrow();
  });
});
