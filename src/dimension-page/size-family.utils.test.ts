import { describe, expect, it } from 'vitest';
import { listServableSpecs } from '@/photo-spec/photo-spec.registry';
import { SIZE_FAMILIES } from './size-family.constants';
import {
  familiesForSpec,
  familyMatches,
  findSizeFamily,
  servedSizeFamilies,
} from './size-family.utils';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';
import type { SizeFamily } from './size-family.types';

const template = (): PhotoSpec => {
  const [spec] = listServableSpecs();
  if (spec === undefined) throw new Error('The registry serves nothing.');
  return spec;
};

const withPrint = (widthMm: number, heightMm: number): PhotoSpec => ({
  ...template(),
  print: { widthMm, heightMm, dpi: 300 },
  alternativePrintSizes: undefined,
});

const withDigital = (digital: PhotoSpec['digital']): PhotoSpec => ({ ...template(), digital });

const PRINT_2X2: SizeFamily = {
  kind: 'print',
  slug: '2x2-inch-photo',
  widthMm: 50.8,
  heightMm: 50.8,
  unit: 'inch',
};
const PIXELS_600: SizeFamily = { kind: 'pixels', slug: '600x600-photo', edgePx: 600 };
const BYTES_240K: SizeFamily = {
  kind: 'file-size',
  slug: 'resize-photo-to-240kb',
  maxBytes: 240_000,
};

describe('matching a specification to a size', () => {
  it('matches a printed size within a tenth of a millimetre', () => {
    // 2x2 inches is 50.8mm exactly, and an authority publishing 50.8 means the
    // same square as one publishing 50.75.
    expect(familyMatches(PRINT_2X2, withPrint(50.8, 50.8))).toBe(true);
    expect(familyMatches(PRINT_2X2, withPrint(50.75, 50.85))).toBe(true);
  });

  it('does not collapse two sizes a millimetre apart', () => {
    // 50mm and 51mm are genuinely different requirements, and a photo cut for
    // one is rejected by the other.
    expect(familyMatches(PRINT_2X2, withPrint(50, 50))).toBe(false);
  });

  it('matches an alternative size the authority also accepts', () => {
    // A country accepting both a square and 35x45mm belongs on both pages;
    // showing it on one would send somebody to reprint an acceptable photo.
    const spec: PhotoSpec = {
      ...withPrint(35, 45),
      alternativePrintSizes: [{ widthMm: 50.8, heightMm: 50.8, dpi: 300 }],
    };

    expect(familyMatches(PRINT_2X2, spec)).toBe(true);
  });

  it('treats a pixel size as accepted when it falls inside the range', () => {
    // Somebody told to upload 600x600 wants to know whose forms that satisfies.
    expect(
      familyMatches(PIXELS_600, withDigital({ minEdgePx: 600, maxEdgePx: 1200, format: 'jpeg' })),
    ).toBe(true);
    expect(familyMatches(PIXELS_600, withDigital({ minEdgePx: 600, format: 'jpeg' }))).toBe(true);
  });

  it('refuses a pixel size the specification would reject', () => {
    expect(familyMatches(PIXELS_600, withDigital({ minEdgePx: 900, format: 'jpeg' }))).toBe(false);
    expect(
      familyMatches(PIXELS_600, withDigital({ minEdgePx: 200, maxEdgePx: 400, format: 'jpeg' })),
    ).toBe(false);
  });

  it('matches a file-size ceiling exactly, not approximately', () => {
    // "Resize to 240KB" is an instruction from a specific form. Listing a
    // country with a 10MB limit under it answers a question nobody asked.
    expect(
      familyMatches(BYTES_240K, withDigital({ minEdgePx: 600, maxBytes: 240_000, format: 'jpeg' })),
    ).toBe(true);
    expect(
      familyMatches(
        BYTES_240K,
        withDigital({ minEdgePx: 600, maxBytes: 10_000_000, format: 'jpeg' }),
      ),
    ).toBe(false);
    expect(familyMatches(BYTES_240K, withDigital({ minEdgePx: 600, format: 'jpeg' }))).toBe(false);
  });
});

describe('which size pages exist', () => {
  it('publishes nothing about a size no served specification requires', () => {
    // The same rule the country pages follow. A page about a requirement
    // nobody has is a page with nothing true to say — and one built from an
    // unverified specification is worse than no page at all.
    const slugs = servedSizeFamilies().map((served) => served.family.slug);

    expect(slugs).not.toContain('50x70mm-photo');
    expect(SIZE_FAMILIES.some((family) => family.slug === '50x70mm-photo')).toBe(true);
  });

  it('gives every published page real countries to list', () => {
    // What keeps these off the thin-content pile: the page only exists if
    // there is something to put on it.
    const served = servedSizeFamilies();

    expect(served.length).toBeGreaterThan(0);
    for (const entry of served) expect(entry.specs.length).toBeGreaterThan(0);
  });

  it('finds a family by the slug its URL uses', () => {
    expect(findSizeFamily('2x2-inch-photo')?.family.kind).toBe('print');
  });

  it('finds nothing for a size with no page', () => {
    expect(findSizeFamily('50x70mm-photo')).toBeUndefined();
    expect(findSizeFamily('nonsense')).toBeUndefined();
  });
});

describe('the size pages a country belongs on', () => {
  it('points back at every page that lists it', () => {
    // The other half of the cross-link. Without it the two families compete
    // for the same reader while each tells them less.
    const us = listServableSpecs().find(
      (spec) => spec.country === 'us' && spec.document === 'passport',
    );
    if (us === undefined) throw new Error('The registry serves no US passport specification.');

    const slugs = familiesForSpec(us).map((family) => family.slug);

    expect(slugs).toContain('2x2-inch-photo');
    expect(slugs).toContain('600x600-photo');
    expect(slugs).not.toContain('35x45mm-photo');
  });

  it('points only at pages that exist', () => {
    const published = new Set(servedSizeFamilies().map((served) => served.family.slug));

    for (const spec of listServableSpecs()) {
      for (const family of familiesForSpec(spec)) {
        expect(published.has(family.slug)).toBe(true);
      }
    }
  });
});
