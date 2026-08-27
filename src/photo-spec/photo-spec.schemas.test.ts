import { describe, expect, it } from 'vitest';
import { photoSpecSchema } from './photo-spec.schemas';
import { US_PASSPORT } from './specs/us.spec';

const valid = structuredClone(US_PASSPORT);

describe('photoSpecSchema', () => {
  it('accepts an authored specification', () => {
    expect(() => photoSpecSchema.parse(valid)).not.toThrow();
  });

  it('rejects a specification with no source', () => {
    // Provenance is required, not optional. A spec without a source is a spec
    // nobody checked, and this registry's only real asset is being trustworthy
    // about exactly that.
    const withoutSource: Record<string, unknown> = { ...valid };
    delete withoutSource['source'];

    expect(() => photoSpecSchema.parse(withoutSource)).toThrow();
  });

  it('rejects a source that is not a URL', () => {
    expect(() => photoSpecSchema.parse({ ...valid, source: 'the government website' })).toThrow();
  });

  it('rejects a malformed verification date', () => {
    expect(() => photoSpecSchema.parse({ ...valid, lastVerified: '26/08/2026' })).toThrow();
  });

  it('rejects an unknown verification status', () => {
    expect(() => photoSpecSchema.parse({ ...valid, verification: 'probably-fine' })).toThrow();
  });

  it('rejects a head-height band where max is below min', () => {
    expect(() =>
      photoSpecSchema.parse({ ...valid, headHeight: { unit: 'mm', minMm: 35, maxMm: 25 } }),
    ).toThrow();
  });

  it('rejects an inverted eye-line band', () => {
    expect(() =>
      photoSpecSchema.parse({
        ...valid,
        eyeLine: { minFromBottomMm: 35, maxFromBottomMm: 28 },
      }),
    ).toThrow();
  });

  it('rejects a ratio above one, which cannot describe a proportion of a photo', () => {
    expect(() =>
      photoSpecSchema.parse({ ...valid, headHeight: { unit: 'ratio', minRatio: 0.7, maxRatio: 1.4 } }),
    ).toThrow();
  });

  it('rejects a digital maximum edge smaller than the minimum', () => {
    expect(() =>
      photoSpecSchema.parse({
        ...valid,
        digital: { ...valid.digital, minEdgePx: 1200, maxEdgePx: 600 },
      }),
    ).toThrow();
  });

  it('rejects a negative print dimension', () => {
    expect(() =>
      photoSpecSchema.parse({ ...valid, print: { ...valid.print, widthMm: -50 } }),
    ).toThrow();
  });

  it('rejects an uppercase hex background colour, so comparison never depends on case', () => {
    expect(() =>
      photoSpecSchema.parse({
        ...valid,
        background: { ...valid.background, hexRanges: [['#F2F2F2', '#FFFFFF']] },
      }),
    ).toThrow();
  });

  it('rejects a country outside the addressable set', () => {
    expect(() => photoSpecSchema.parse({ ...valid, country: 'atlantis' })).toThrow();
  });

  it('accepts an optional eye line being absent, since not every authority states one', () => {
    const withoutEyeLine: Record<string, unknown> = { ...valid };
    delete withoutEyeLine['eyeLine'];

    expect(() => photoSpecSchema.parse(withoutEyeLine)).not.toThrow();
  });

  it('accepts alternative print sizes for authorities that permit more than one', () => {
    expect(() =>
      photoSpecSchema.parse({
        ...valid,
        alternativePrintSizes: [{ widthMm: 35, heightMm: 45, dpi: 300 }],
      }),
    ).not.toThrow();
  });
});
