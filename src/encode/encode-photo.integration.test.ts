import { describe, expect, it } from 'vitest';
import { buildTonedFace } from '@/testing/fixtures/toned-face.builder';
import { createRealMozjpegEncoder } from '@/testing/mozjpeg.harness';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { encodePhoto } from './encode-photo';
import { readJfifDensity } from './jfif-density.utils';
import { hasExifSegment } from './strip-metadata.utils';
import { JFIF_UNITS_PER_INCH } from './jpeg-marker.constants';
import { SOI_MARKER, MARKER_PREFIX } from './jpeg-marker.constants';

/**
 * The one test that runs the real compressor.
 *
 * Everything else in this module is tested against a deterministic fake, and
 * that is the right trade: the search, the metadata rewriting and the ordering
 * are logic around the encoder rather than inside it.
 *
 * Two claims cannot be made that way, and they are the two the reader is most
 * exposed to. That the file is under the authority's byte ceiling is a fact
 * about mozjpeg's output, and a fake can be made to agree with any belief we
 * hold about it. That the file declares the right print resolution is a fact
 * about bytes we wrote into a file mozjpeg produced — and mozjpeg's own header
 * is the thing being patched, so patching a header we invented proves nothing.
 */
const SPEC = resolveSpec(US_PASSPORT, new Date('2026-08-27T00:00:00Z'));

/**
 * A face with real tonal detail and sensor noise, large enough to crop from.
 *
 * Noise matters here in a way it does not elsewhere: a smooth synthetic image
 * compresses to almost nothing, and a byte-ceiling test that passes because
 * the file is 4KB has not tested the ceiling.
 */
const SOURCE = buildTonedFace({
  widthPx: 900,
  heightPx: 900,
  centreX: 450,
  centreY: 420,
  faceRadiusX: 240,
  faceRadiusY: 320,
  noiseAmplitude: 14,
});

const CROP = { x: 100, y: 80, widthPx: 700, heightPx: 700 };

describe('a real mozjpeg file', () => {
  it('is a JPEG', async () => {
    const encoder = await createRealMozjpegEncoder();
    const result = await encodePhoto(encoder, SOURCE, CROP, SPEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.bytes[0]).toBe(MARKER_PREFIX);
    expect(result.photo.bytes[1]).toBe(SOI_MARKER);
  });

  it('carries the print resolution the crop was computed at', async () => {
    // The assertion this whole file exists for. mozjpeg writes a JFIF header
    // declaring units 0 — no physical size at all — and a photograph that
    // reaches an authority that way prints at whatever size their software
    // guesses.
    const encoder = await createRealMozjpegEncoder();
    const result = await encodePhoto(encoder, SOURCE, CROP, SPEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(readJfifDensity(result.photo.bytes)).toEqual({
      units: JFIF_UNITS_PER_INCH,
      x: 300,
      y: 300,
    });
  });

  it('fits under the authority’s stated byte ceiling', async () => {
    const encoder = await createRealMozjpegEncoder();
    const result = await encodePhoto(encoder, SOURCE, CROP, SPEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.bytes.length).toBeLessThanOrEqual(240_000);
    expect(result.photo.overBudget).toBeUndefined();
  });

  it('is a real photograph rather than a nearly empty file', async () => {
    // Guards the assertion above from passing for the wrong reason. A ceiling
    // met by encoding nothing is not a ceiling met.
    const encoder = await createRealMozjpegEncoder();
    const result = await encodePhoto(encoder, SOURCE, CROP, SPEC);

    expect(result.ok && result.photo.bytes.length).toBeGreaterThan(10_000);
  });

  it('is the pixel size the specification prints at', async () => {
    const encoder = await createRealMozjpegEncoder();
    const result = await encodePhoto(encoder, SOURCE, CROP, SPEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.photo.widthPx).toBe(600);
    expect(result.photo.heightPx).toBe(600);
  });

  it('carries no metadata of any kind', async () => {
    const encoder = await createRealMozjpegEncoder();
    const result = await encodePhoto(encoder, SOURCE, CROP, SPEC);

    expect(result.ok && hasExifSegment(result.photo.bytes)).toBe(false);
  });
});
