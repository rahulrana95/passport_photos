import { describe, expect, it } from 'vitest';
import {
  ALPHA_OPAQUE,
  CHANNEL_OFFSET_ALPHA,
  CHANNELS_PER_PIXEL,
} from '@/testing/fixtures/pixel-format.constants';
import { createFakeJpegEncoder } from '@/encode/fake-jpeg-encoder';
import { readJfifDensity } from '@/encode/jfif-density.utils';
import { JFIF_UNITS_PER_INCH } from '@/encode/jpeg-marker.constants';
import { buildPrintSheet } from './build-sheet';
import { SHEET_SIZES } from './sheet-size.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/** Low enough that an A4 sheet is a few hundred pixels rather than millions. */
const TEST_DPI = 48;

const EU_PHOTO = { widthMm: 35, heightMm: 45 };

const photo = (): PixelBuffer => {
  const width = 140;
  const height = 180;
  const data = new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * CHANNELS_PER_PIXEL;
    data[offset] = 90;
    data[offset + 1] = 120;
    data[offset + 2] = 150;
    data[offset + CHANNEL_OFFSET_ALPHA] = ALPHA_OPAQUE;
  }
  return { width, height, data };
};

const contains = (haystack: Uint8Array, needle: Uint8Array): boolean => {
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((byte, index) => haystack[start + index] === byte)) return true;
  }
  return false;
};

describe('a sheet ready to print', () => {
  it('fits as many copies as the sheet holds', async () => {
    const result = await buildPrintSheet(
      createFakeJpegEncoder(),
      photo(),
      EU_PHOTO,
      SHEET_SIZES['4x6in'],
      TEST_DPI,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet.plan.count).toBe(6);
  });

  it('declares its print resolution, so a kiosk prints it at the right size', async () => {
    // A JPEG without a declared density prints at whatever size the kiosk
    // software decides, and the reader finds out with a ruler.
    const result = await buildPrintSheet(
      createFakeJpegEncoder(),
      photo(),
      EU_PHOTO,
      SHEET_SIZES['4x6in'],
      TEST_DPI,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(readJfifDensity(result.sheet.jpeg)).toEqual({
      units: JFIF_UNITS_PER_INCH,
      x: TEST_DPI,
      y: TEST_DPI,
    });
  });

  it('carries the same sheet in both formats', async () => {
    // Two counters, one physical object. A PDF built from a different render
    // than the JPEG would be two subtly different products.
    const result = await buildPrintSheet(
      createFakeJpegEncoder(),
      photo(),
      EU_PHOTO,
      SHEET_SIZES['4x6in'],
      TEST_DPI,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(contains(result.sheet.pdf, result.sheet.jpeg)).toBe(true);
  });

  it('reports the raster it produced', async () => {
    const result = await buildPrintSheet(
      createFakeJpegEncoder(),
      photo(),
      EU_PHOTO,
      SHEET_SIZES['4x6in'],
      TEST_DPI,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet.widthPx).toBeGreaterThan(0);
    expect(result.sheet.dpi).toBe(TEST_DPI);
  });

  it('uses each sheet’s own margin', async () => {
    // Photo paper is printed borderless and can take three millimetres; a home
    // printer feeding A4 physically cannot reach the edge and needs five.
    const a4 = await buildPrintSheet(
      createFakeJpegEncoder(),
      photo(),
      EU_PHOTO,
      SHEET_SIZES.a4,
      TEST_DPI,
    );

    expect(a4.ok && a4.sheet.plan.count).toBe(30);
  });

  it('gets the same six copies onto the metric sheet', async () => {
    const metric = await buildPrintSheet(
      createFakeJpegEncoder(),
      photo(),
      EU_PHOTO,
      SHEET_SIZES['10x15cm'],
      TEST_DPI,
    );

    expect(metric.ok && metric.sheet.plan.count).toBe(6);
  });
});

describe('a photograph too large for the sheet', () => {
  it('says so rather than producing an empty sheet', async () => {
    const result = await buildPrintSheet(
      createFakeJpegEncoder(),
      photo(),
      { widthMm: 200, heightMm: 200 },
      SHEET_SIZES['4x6in'],
      TEST_DPI,
    );

    expect(result).toEqual({ ok: false, reason: 'photo-larger-than-sheet' });
  });
});
