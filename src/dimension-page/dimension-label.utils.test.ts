import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { getContent } from '@/content/content.registry';
import { SIZE_FAMILIES } from './size-family.constants';
import { familyHeading, familyLabel } from './dimension-label.utils';
import type { SizeFamily } from './size-family.types';

const content = getContent();

const label = (family: SizeFamily): string => familyLabel(family, content, DEFAULT_LOCALE);

const familyBySlug = (slug: string): SizeFamily => {
  const family = SIZE_FAMILIES.find((candidate) => candidate.slug === slug);
  if (family === undefined) throw new Error(`No size family for ${slug}.`);
  return family;
};

describe('what a size is called', () => {
  it('writes a US square in inches, which is the unit it is asked for in', () => {
    // The registry stores 50.8mm. Nobody has ever searched for that.
    expect(label(familyBySlug('2x2-inch-photo'))).toContain('2');
    expect(label(familyBySlug('2x2-inch-photo'))).toContain('in');
    expect(label(familyBySlug('2x2-inch-photo'))).not.toContain('50.8');
  });

  it('puts the unit on the second number only', () => {
    // "2 in × 2 in" is how a machine writes a size.
    expect(label(familyBySlug('2x2-inch-photo'))).toBe('2 × 2 in');
    expect(label(familyBySlug('35x45mm-photo'))).toBe('35 × 45 mm');
  });

  it('writes a pixel size as pixels', () => {
    expect(label(familyBySlug('600x600-photo'))).toContain('600');
    expect(label(familyBySlug('600x600-photo'))).toContain('pixel');
  });

  it('writes a file-size ceiling the way the form publishes it', () => {
    // 240,000 bytes is "240 kB" on the DS-160's own page.
    expect(label(familyBySlug('resize-photo-to-240kb'))).toBe('240 kB');
  });

  it('asks a different question for each kind of number', () => {
    // A printed square, an upload that keeps being rejected, and an
    // instruction somebody cannot follow are three different searches.
    const headings = ['2x2-inch-photo', '600x600-photo', 'resize-photo-to-240kb'].map((slug) =>
      familyHeading(familyBySlug(slug), content, DEFAULT_LOCALE),
    );

    expect(new Set(headings).size).toBe(headings.length);
    expect(headings[2]).toContain('under');
  });

  it('leaves no placeholder unfilled for any family', () => {
    for (const family of SIZE_FAMILIES) {
      expect(familyLabel(family, content, DEFAULT_LOCALE)).not.toMatch(/\{\w+\}/);
      expect(familyHeading(family, content, DEFAULT_LOCALE)).not.toMatch(/\{\w+\}/);
    }
  });
});
