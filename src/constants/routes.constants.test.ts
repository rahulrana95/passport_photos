import { describe, expect, it } from 'vitest';
import { absoluteUrl, homeRoute, ROUTE_SEGMENTS } from './routes.constants';

const SITE = 'https://example.com';

describe('homeRoute', () => {
  it('returns the root segment', () => {
    expect(homeRoute()).toBe('/');
  });
});

describe('absoluteUrl', () => {
  it('returns the bare origin for the home route, never a trailing slash', () => {
    expect(absoluteUrl(SITE, ROUTE_SEGMENTS.home)).toBe(SITE);
  });

  it('joins a nested route onto the origin exactly once', () => {
    expect(absoluteUrl(SITE, '/us/passport-photo')).toBe('https://example.com/us/passport-photo');
  });
});
