import { describe, expect, it } from 'vitest';
import { MAX_SOURCE_DIMENSION_PX, MAX_UPLOAD_BYTES } from '@/constants/limits.constants';
import { buildJpegWithExif } from '@/testing/fixtures/jpeg-exif.builder';
import { createFakeDecoder } from './fake-decoder';
import { ingestImage } from './ingest-image';

const pad = (bytes: Uint8Array, toLength: number): Uint8Array => {
  const padded = new Uint8Array(toLength);
  padded.set(bytes.slice(0, toLength));
  return padded;
};

const jpeg = (options: Parameters<typeof buildJpegWithExif>[0] = {}): Uint8Array =>
  pad(buildJpegWithExif(options), 200_000);

const heic = (): Uint8Array => {
  const bytes = new Uint8Array(200_000);
  bytes.set([0, 0, 0, 0x20], 0);
  bytes.set([...'ftypheic'].map((character) => character.charCodeAt(0)), 4);
  return bytes;
};

describe('a photograph that works', () => {
  it('returns a working copy, the source size and the format', async () => {
    const result = await ingestImage(jpeg({ orientation: 1 }), createFakeDecoder());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.format).toBe('jpeg');
    expect(result.image.source).toEqual({ widthPx: 4032, heightPx: 3024 });
    expect(Math.max(result.image.working.width, result.image.working.height)).toBe(1600);
  });

  it('reports the corrected source size for a rotated photo, not the stored one', async () => {
    // A portrait phone photo is stored 4032x3024 with orientation 6. Reporting
    // the stored size measures the wrong axis for every check downstream.
    const result = await ingestImage(jpeg({ orientation: 6 }), createFakeDecoder());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.source).toEqual({ widthPx: 3024, heightPx: 4032 });
    expect(result.image.orientation).toBe(6);
  });

  it('carries the capture time through when the file has one', async () => {
    const result = await ingestImage(
      jpeg({ orientation: 1, dateTimeOriginal: '2026:03:14 09:26:53' }),
      createFakeDecoder(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.capturedAt?.getFullYear()).toBe(2026);
  });

  it('omits the capture time rather than inventing one', async () => {
    // Screenshots have no EXIF. The recency hint must stay silent rather than
    // claim the photo was taken today.
    const result = await ingestImage(jpeg({ orientation: 1 }), createFakeDecoder());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.capturedAt).toBeUndefined();
  });

  it('gives a scale factor that maps the working copy back onto the source', async () => {
    const result = await ingestImage(jpeg(), createFakeDecoder());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.workingSize.scaleToSource * result.image.workingSize.widthPx).toBeCloseTo(
      result.image.source.widthPx,
      6,
    );
  });

  it('does not downscale a photo already small enough', async () => {
    const result = await ingestImage(
      jpeg(),
      createFakeDecoder({ storedSize: { widthPx: 1200, heightPx: 900 } }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.workingSize.isDownscaled).toBe(false);
    expect(result.image.workingSize.scaleToSource).toBe(1);
  });
});

describe('every refusal names a next step', () => {
  it('refuses an empty file', async () => {
    const result = await ingestImage(new Uint8Array(0), createFakeDecoder());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('empty-file');
  });

  it('refuses an oversized file', async () => {
    const result = await ingestImage(pad(jpeg(), MAX_UPLOAD_BYTES + 1), createFakeDecoder());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('too-large');
  });

  it('refuses something that is not an image', async () => {
    const result = await ingestImage(pad(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), 1000), createFakeDecoder());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('unrecognised-format');
  });

  it('gives iPhone-specific steps when HEIC cannot be decoded here', async () => {
    // The generic message loses this user. They have the photo open in front
    // of them and need the taps that convert it, not a category name.
    const result = await ingestImage(heic(), createFakeDecoder());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.detectedFormat).toBe('heic');
    expect(result.failure.remedy).toMatch(/iPhone/i);
    expect(result.failure.remedy).toMatch(/Photos/);
  });

  it('accepts HEIC on a browser that can decode it', async () => {
    // Safari on iOS can, and iOS is where these files come from.
    const result = await ingestImage(
      heic(),
      createFakeDecoder({ supportedFormats: ['heic', 'jpeg'] }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.format).toBe('heic');
  });

  it('refuses a format no browser decodes, without the iPhone wording', async () => {
    const avif = new Uint8Array(200_000);
    avif.set([0, 0, 0, 0x20], 0);
    avif.set([...'ftypavif'].map((character) => character.charCodeAt(0)), 4);

    const result = await ingestImage(avif, createFakeDecoder());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('format-not-supported');
    expect(result.failure.detectedFormat).toBe('avif');
    expect(result.failure.remedy).not.toMatch(/iPhone/i);
  });

  it('refuses a file the decoder cannot read', async () => {
    const result = await ingestImage(jpeg(), createFakeDecoder({ failToDecode: true }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('decode-failed');
    expect(result.failure.remedy).not.toBe('');
  });

  it('refuses an animated image rather than silently using frame one', async () => {
    const result = await ingestImage(jpeg(), createFakeDecoder({ isAnimated: true }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('animated-source');
  });

  it('refuses an image beyond the browser canvas limit', async () => {
    const result = await ingestImage(
      jpeg(),
      createFakeDecoder({
        storedSize: { widthPx: MAX_SOURCE_DIMENSION_PX + 1, heightPx: 1000 },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('too-large-dimensions');
  });

  it('refuses an image too small to print, judged after orientation', async () => {
    const result = await ingestImage(
      jpeg({ orientation: 6 }),
      createFakeDecoder({ storedSize: { widthPx: 200, heightPx: 4000 } }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('too-small');
  });

  it('never returns a failure without a remedy', async () => {
    const inputs = [
      new Uint8Array(0),
      pad(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), 1000),
      heic(),
    ];

    for (const input of inputs) {
      const result = await ingestImage(input, createFakeDecoder());
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.failure.remedy.length, result.failure.code).toBeGreaterThan(20);
      expect(result.failure.message.length, result.failure.code).toBeGreaterThan(10);
    }
  });
});
