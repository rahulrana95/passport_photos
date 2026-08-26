import { describe, expect, it } from 'vitest';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { SYNTHETIC_HEAD_FIXTURES } from '@/testing/fixtures/synthetic-head.constants';
import { CHANNEL_MAX, CHANNEL_MIN } from '@/testing/fixtures/pixel-format.constants';
import { createFakeDetector } from './fake-detector';
import type { SyntheticHeadSpec } from '@/testing/fixtures/synthetic-head.types';

const specFor = (name: string): SyntheticHeadSpec => {
  const found = SYNTHETIC_HEAD_FIXTURES.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`Unknown fixture: ${name}`);
  return found.spec;
};

const bufferFor = (name: string): ReturnType<typeof generateSyntheticHead> =>
  generateSyntheticHead(specFor(name));

describe('the fake detector derives from the spec, not from pixels', () => {
  it('places the chin landmark exactly where the fixture was generated', async () => {
    // The point of the fake: ground truth is exact by construction, so a
    // downstream failure means the code under test is wrong — never that the
    // fake mis-measured. A fake that guessed would give every test a second
    // thing that could be at fault.
    const spec = specFor('nominal');
    const result = await createFakeDetector().detectLandmarks(bufferFor('nominal'));

    expect(result?.points[0]?.y).toBeCloseTo(spec.chinY / spec.heightPx, 6);
  });

  it('places the eye landmarks on the specified eye line', async () => {
    const spec = specFor('nominal');
    const result = await createFakeDetector().detectLandmarks(bufferFor('nominal'));

    expect(result?.points[1]?.y).toBeCloseTo(spec.eyeY / spec.heightPx, 6);
    expect(result?.points[2]?.y).toBeCloseTo(spec.eyeY / spec.heightPx, 6);
  });

  it('reports normalised coordinates, as every real landmark model does', async () => {
    const result = await createFakeDetector().detectLandmarks(bufferFor('nominal'));

    for (const point of result?.points ?? []) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  it('accepts overridden pose and blendshapes, for the expression checks', async () => {
    const result = await createFakeDetector({
      rollDegrees: 12,
      blendshapes: { jawOpen: 0.8 },
    }).detectLandmarks(bufferFor('nominal'));

    expect(result?.rollDegrees).toBe(12);
    expect(result?.blendshapes['jawOpen']).toBe(0.8);
  });
});

describe('the fake detector fails where a real one would', () => {
  it('finds nothing when told to fail', async () => {
    expect(await createFakeDetector({ failLandmarks: true }).detectLandmarks(bufferFor('nominal')))
      .toBeUndefined();
  });

  it('tells apart two fixtures that share dimensions and background', async () => {
    // Eight fixtures sit on background 245 at 600x600. Identifying by a corner
    // pixel matched the first of them for all of them, so a cropped-chin frame
    // came back with a confident chin landmark. This is that regression.
    const nominal = await createFakeDetector().detectLandmarks(bufferFor('nominal'));
    const cropped = await createFakeDetector().detectLandmarks(bufferFor('chin-below-frame'));

    expect(nominal).toBeDefined();
    expect(cropped).toBeUndefined();
  });

  it('finds nothing in a buffer that matches no fixture', async () => {
    const stranger = { width: 7, height: 7, data: new Uint8ClampedArray(7 * 7 * 4) };

    expect(await createFakeDetector().detectLandmarks(stranger)).toBeUndefined();
  });

  it('refuses to invent a chin that is outside the frame', async () => {
    // The fixture exists precisely because this is unmeasurable. A fake that
    // returned a plausible landmark here would hide the case it was built for.
    expect(await createFakeDetector().detectLandmarks(bufferFor('chin-below-frame')))
      .toBeUndefined();
  });

  it('finds nothing where hair and background are indistinguishable', async () => {
    expect(await createFakeDetector().detectLandmarks(bufferFor('dark-hair-on-dark-background')))
      .toBeUndefined();
  });

  it('still segments a frame whose chin is cropped away', async () => {
    // Landmarks and segmentation fail independently. A cropped chin defeats the
    // landmark measurement but leaves the silhouette perfectly separable, and
    // the crop rule downstream needs that mask to explain what went wrong.
    const result = await createFakeDetector().segment(bufferFor('chin-below-frame'));

    expect(result?.mask).toHaveLength(specFor('chin-below-frame').widthPx * specFor('chin-below-frame').heightPx);
  });
});

describe('segmentation', () => {
  it('returns a mask matching the buffer dimensions', async () => {
    const spec = specFor('nominal');
    const mask = await createFakeDetector().segment(bufferFor('nominal'));

    expect(mask?.width).toBe(spec.widthPx);
    expect(mask?.mask).toHaveLength(spec.widthPx * spec.heightPx);
  });

  it('marks subject and background with the extreme values only', async () => {
    // Asserted over the distinct set rather than per pixel: 360,000 individual
    // expectations take longer than the test timeout, and the set is the
    // stronger claim anyway — it also proves both values actually occur.
    const mask = await createFakeDetector().segment(bufferFor('nominal'));
    const distinct = [...new Set(mask?.mask ?? [])].sort((a, b) => a - b);

    expect(distinct).toEqual([CHANNEL_MIN, CHANNEL_MAX]);
  });

  it('marks the head as subject and the corner as background', async () => {
    const spec = specFor('nominal');
    const result = await createFakeDetector().segment(bufferFor('nominal'));

    const atFace = result?.mask[spec.eyeY * spec.widthPx + spec.centreX];
    const atCorner = result?.mask[0];

    expect(atFace).toBe(CHANNEL_MAX);
    expect(atCorner).toBe(CHANNEL_MIN);
  });

  it('returns nothing when told to fail', async () => {
    expect(await createFakeDetector({ failSegmentation: true }).segment(bufferFor('nominal')))
      .toBeUndefined();
  });

  it('returns nothing for a buffer matching no fixture', async () => {
    const stranger = { width: 5, height: 5, data: new Uint8ClampedArray(5 * 5 * 4) };

    expect(await createFakeDetector().segment(stranger)).toBeUndefined();
  });
});
