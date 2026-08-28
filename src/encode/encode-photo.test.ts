import { describe, expect, it, vi } from 'vitest';
import {
  ALPHA_OPAQUE,
  CHANNELS_PER_PIXEL,
} from '@/testing/fixtures/pixel-format.constants';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { DEFAULT_JPEG_QUALITY, MIN_JPEG_QUALITY } from './encode.constants';
import { createFakeJpegEncoder } from './fake-jpeg-encoder';
import { encodePhoto } from './encode-photo';
import { readJfifDensity } from './jfif-density.utils';
import { hasExifSegment } from './strip-metadata.utils';
import { JFIF_UNITS_PER_INCH } from './jpeg-marker.constants';
import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import { GERMANY_PASSPORT } from '@/photo-spec/specs/germany.spec';

const NOW = new Date('2026-08-27T00:00:00Z');
const SPEC = resolveSpec(US_PASSPORT, NOW);

const specWith = (overrides: Partial<PhotoSpec>): ReturnType<typeof resolveSpec> =>
  resolveSpec({ ...US_PASSPORT, ...overrides }, NOW);

const flat = (width: number, height: number, value: number): PixelBuffer => {
  const data = new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * CHANNELS_PER_PIXEL;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = ALPHA_OPAQUE;
  }
  return { width, height, data };
};

const SOURCE = flat(700, 700, 180);
const CROP = { x: 20, y: 20, widthPx: 650, heightPx: 650 };

/**
 * A byte ceiling this file states for itself.
 *
 * Not read from a real specification, deliberately. These tests are about the
 * encoder's behaviour against a budget, not about any authority's current
 * limit — and when the United States' passport ceiling turned out to be 10MB
 * rather than the 240KB this file had been borrowing, three tests failed that
 * had nothing wrong with them.
 */
const TIGHT_BUDGET_BYTES = 240_000;
const US_DIGITAL = US_PASSPORT.digital ?? { minEdgePx: 600, format: 'jpeg' as const };
const BUDGETED = specWith({
  digital: { ...US_DIGITAL, maxBytes: TIGHT_BUDGET_BYTES },
});

describe('the file the reader submits', () => {
  it('is the size the specification prints at', async () => {
    // 50.8mm at 300 dots per inch is 600 pixels. The pixel count and the
    // physical size are the same statement made twice.
    const result = await encodePhoto(createFakeJpegEncoder(), SOURCE, CROP, SPEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.widthPx).toBe(600);
    expect(result.photo.heightPx).toBe(600);
  });

  it('declares its print resolution, in dots per inch', async () => {
    // The commonest reason a digitally submitted photograph comes back
    // rejected. Without this the file is 600 by 600 of nothing.
    const result = await encodePhoto(createFakeJpegEncoder(), SOURCE, CROP, SPEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.dpi).toBe(300);
    expect(readJfifDensity(result.photo.bytes)).toEqual({
      units: JFIF_UNITS_PER_INCH,
      x: 300,
      y: 300,
    });
  });

  it('carries no metadata', async () => {
    const result = await encodePhoto(createFakeJpegEncoder(), SOURCE, CROP, SPEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(hasExifSegment(result.photo.bytes)).toBe(false);
  });

  it('fits under the authority’s byte ceiling', async () => {
    const result = await encodePhoto(createFakeJpegEncoder(), SOURCE, CROP, BUDGETED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.bytes.length).toBeLessThanOrEqual(TIGHT_BUDGET_BYTES);
    expect(result.photo.overBudget).toBeUndefined();
  });
});

describe('when the ceiling cannot be met', () => {
  const stubborn = createFakeJpegEncoder({
    bytesAtMinQuality: 400_000,
    bytesAtMaxQuality: 900_000,
  });

  it('still produces a photograph', async () => {
    // Explain, do not fail. A reader whose file cannot be squeezed under the
    // limit needs to know that and needs the photograph.
    const result = await encodePhoto(stubborn, SOURCE, CROP, BUDGETED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.bytes.length).toBeGreaterThan(0);
    expect(result.photo.quality).toBe(MIN_JPEG_QUALITY);
  });

  it('says by how much it overshot, and against what', async () => {
    const result = await encodePhoto(stubborn, SOURCE, CROP, BUDGETED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.overBudget?.maxBytes).toBe(TIGHT_BUDGET_BYTES);
    expect(result.photo.overBudget?.bytes).toBe(result.photo.bytes.length);
  });

  it('measures the finished file rather than the search’s verdict', async () => {
    // Writing the density adds bytes to a file without one. A photograph that
    // fitted by a hair before the header went in does not fit after it, and
    // the reader is told about the file they actually have.
    const encoder = createFakeJpegEncoder({
      bytesAtMinQuality: 1_000,
      bytesAtMaxQuality: 2_000,
      withJfifSegment: false,
    });
    const tight = specWith({ digital: { ...US_DIGITAL, maxBytes: 1_000 } });

    const result = await encodePhoto(encoder, SOURCE, CROP, tight);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.bytes.length).toBeGreaterThan(1_000);
    expect(result.photo.overBudget).toBeDefined();
  });
});

describe('a specification with no byte ceiling', () => {
  const unbounded = specWith({
    digital: { minEdgePx: 600, maxEdgePx: 1200, format: 'jpeg' },
  });

  it('encodes once, at the default quality', async () => {
    // Nothing to search for. Running a bisection anyway would be seven
    // needless compressions of a full-resolution photograph on a phone.
    const encode = vi.fn(createFakeJpegEncoder().encode);
    const result = await encodePhoto({ encode }, SOURCE, CROP, unbounded);

    expect(encode).toHaveBeenCalledOnce();
    expect(result.ok && result.photo.quality).toBe(DEFAULT_JPEG_QUALITY);
  });

  it('reports nothing as over budget', async () => {
    const result = await encodePhoto(createFakeJpegEncoder(), SOURCE, CROP, unbounded);

    expect(result.ok && result.photo.overBudget).toBeUndefined();
  });
});

describe('never enlarging', () => {
  it('refuses a crop with fewer pixels than the output needs', async () => {
    // Enlarging invents detail, a printer renders the invention as softness,
    // and softness is itself a rejection reason. The reader is better served
    // by being told their original is too small.
    const result = await encodePhoto(
      createFakeJpegEncoder(),
      flat(400, 400, 180),
      { x: 0, y: 0, widthPx: 400, heightPx: 400 },
      SPEC,
    );

    expect(result).toEqual({ ok: false, reason: 'source-resolution-too-low' });
  });

  it('refuses when only one axis is short', async () => {
    const result = await encodePhoto(
      createFakeJpegEncoder(),
      flat(700, 700, 180),
      { x: 0, y: 0, widthPx: 650, heightPx: 400 },
      SPEC,
    );

    expect(result.ok).toBe(false);
  });
});

describe('print and digital sizes that disagree', () => {
  it('grows to meet a digital minimum larger than the print size', async () => {
    // Several authorities publish a print size, a resolution and a pixel
    // minimum, and only some of those are consistent with each other.
    const demanding = specWith({
      digital: { minEdgePx: 900, maxEdgePx: 2000, format: 'jpeg' },
    });
    const result = await encodePhoto(
      createFakeJpegEncoder(),
      flat(1000, 1000, 180),
      { x: 0, y: 0, widthPx: 950, heightPx: 950 },
      demanding,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.widthPx).toBe(900);
  });

  it('raises the declared resolution to match, so the print size is unchanged', async () => {
    // The physical size is the requirement. More pixels across the same
    // millimetres is a higher resolution, and saying otherwise would print
    // the photograph at the wrong size.
    const demanding = specWith({
      digital: { minEdgePx: 900, maxEdgePx: 2000, format: 'jpeg' },
    });
    const result = await encodePhoto(
      createFakeJpegEncoder(),
      flat(1000, 1000, 180),
      { x: 0, y: 0, widthPx: 950, heightPx: 950 },
      demanding,
    );

    expect(result.ok && result.photo.dpi).toBe(450);
  });

  it('shrinks to meet a digital maximum smaller than the print size', async () => {
    const capped = specWith({
      digital: { minEdgePx: 200, maxEdgePx: 400, format: 'jpeg' },
    });
    const result = await encodePhoto(createFakeJpegEncoder(), SOURCE, CROP, capped);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.widthPx).toBe(400);
    expect(result.photo.dpi).toBe(200);
  });

  it('keeps a non-square photograph the shape it prints at', async () => {
    // Fitting a 35 by 45 print into a square pixel bound by stretching would
    // satisfy the numbers and produce a photograph of a differently shaped
    // person.
    const european = specWith({
      print: { widthMm: 35, heightMm: 45, dpi: 600 },
      digital: { minEdgePx: 400, format: 'jpeg' },
    });
    const result = await encodePhoto(
      createFakeJpegEncoder(),
      flat(1200, 1400, 180),
      { x: 0, y: 0, widthPx: 900, heightPx: 1200 },
      european,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.heightPx / result.photo.widthPx).toBeCloseTo(45 / 35, 2);
  });
});

describe('an authority that published no digital requirement', () => {
  it('exports the printed size and nothing larger', async () => {
    // Germany states 35 x 45 millimetres and no pixel count, because there is
    // no upload to constrain. With nothing to grow towards, the printed size at
    // our export resolution is the whole answer: 35mm at 300dpi is 413px.
    const spec = resolveSpec(GERMANY_PASSPORT, NOW);
    expect(spec.digital).toBeUndefined();

    const result = await encodePhoto(createFakeJpegEncoder(), SOURCE, CROP, spec);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.widthPx).toBe(413);
    expect(result.photo.heightPx).toBe(531);
  });

  it('encodes at the default quality, having no budget to search against', async () => {
    const result = await encodePhoto(
      createFakeJpegEncoder(),
      SOURCE,
      CROP,
      resolveSpec(GERMANY_PASSPORT, NOW),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.quality).toBe(DEFAULT_JPEG_QUALITY);
  });
});
