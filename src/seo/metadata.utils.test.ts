import { describe, expect, it } from 'vitest';
import { ROUTE_SEGMENTS } from '@/constants/routes.constants';
import { SITE_NAME } from '@/constants/site.constants';
import { buildMetadata, lengthWarnings } from './metadata.utils';
import { DEFAULT_OG_IMAGE_PATH, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './metadata.constants';

const SITE = 'https://example.test';

const input = {
  title: 'US passport photo requirements',
  description:
    'Check a United States passport photo against the official published requirements, entirely in your browser.',
  route: '/us/passport-photo',
};

describe('buildMetadata', () => {
  it('sets an absolute canonical URL', () => {
    expect(buildMetadata(input).alternates?.canonical).toBe(`${SITE}/us/passport-photo`);
  });

  it('returns the bare origin as canonical for the home route', () => {
    // A trailing slash here would disagree with trailingSlash:false and produce
    // two URLs for one page, splitting its ranking between them.
    expect(buildMetadata({ ...input, route: ROUTE_SEGMENTS.home }).alternates?.canonical).toBe(SITE);
  });

  it('indexes by default on a production deployment', () => {
    expect(buildMetadata(input).robots).toEqual({ index: true, follow: true });
  });

  it('honours noIndex while still allowing links to be followed', () => {
    // follow stays true so a noindex page still passes authority onward
    // through its links rather than becoming a dead end.
    expect(buildMetadata({ ...input, noIndex: true }).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it('names the site in Open Graph rather than repeating it in the title', () => {
    expect(buildMetadata(input).openGraph?.siteName).toBe(SITE_NAME);
    expect(buildMetadata(input).title).toBe(input.title);
  });

  it('uses an absolute social image at the dimensions the platforms expect', () => {
    const images = buildMetadata(input).openGraph?.images;
    expect(images).toEqual([
      {
        url: `${SITE}${DEFAULT_OG_IMAGE_PATH}`,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: input.title,
      },
    ]);
  });

  it('accepts a per-page social image', () => {
    const meta = buildMetadata({ ...input, imagePath: '/og/us.png' });
    expect(meta.twitter?.images).toEqual([`${SITE}/og/us.png`]);
  });

  it('uses a large summary card, since the image carries the requirement', () => {
    // Next's Twitter metadata type is a union; `card` only exists on some
    // members, so narrow rather than cast.
    const twitter = buildMetadata(input).twitter;
    expect(twitter !== null && twitter !== undefined && 'card' in twitter ? twitter.card : undefined).toBe(
      'summary_large_image',
    );
  });

  it('omits modifiedTime entirely when no date is known', () => {
    expect(buildMetadata(input).openGraph).not.toHaveProperty('modifiedTime');
  });

  it('carries a known modification date through', () => {
    const meta = buildMetadata({ ...input, lastModified: '2026-08-20' });
    expect(meta.openGraph).toHaveProperty('modifiedTime', '2026-08-20');
  });
});

describe('lengthWarnings', () => {
  it('passes a well-sized title and description', () => {
    expect(lengthWarnings({ ...input, title: 'US passport photo' })).toEqual([]);
  });

  it('warns when the title plus site name exceeds the truncation point', () => {
    const warnings = lengthWarnings({ ...input, title: 'A'.repeat(80) });
    expect(warnings.map((w) => w.field)).toContain('title');
  });

  it('warns on an over-long description', () => {
    const warnings = lengthWarnings({ ...input, description: 'A'.repeat(200) });
    expect(warnings.map((w) => w.field)).toContain('description');
  });

  it('warns on a description too short to survive being rewritten', () => {
    const warnings = lengthWarnings({ ...input, description: 'Too short.' });
    expect(warnings.map((w) => w.field)).toContain('description');
  });

  it('reports the measured length, so the fix is obvious', () => {
    const [warning] = lengthWarnings({ ...input, description: 'A'.repeat(200) });
    expect(warning?.message).toContain('200');
  });
});
