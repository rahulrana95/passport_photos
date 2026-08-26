import { describe, expect, it } from 'vitest';
import {
  BASELINE_EDGE_THRESHOLD,
  SYNTHETIC_HEAD_FIXTURES,
} from './synthetic-head.constants';
import { generateSyntheticHead } from './synthetic-head.generator';
import {
  clippedPixelRatio,
  findBottommostSubjectRow,
  findTopmostSubjectRow,
  luminanceAt,
  meanLuminance,
} from './measure-buffer.utils';
import type { SyntheticHeadSpec } from './synthetic-head.types';

const findFixture = (name: string): SyntheticHeadSpec => {
  const fixture = SYNTHETIC_HEAD_FIXTURES.find((candidate) => candidate.name === name);
  if (fixture === undefined) throw new Error(`Unknown fixture: ${name}`);
  return fixture.spec;
};

describe('generateSyntheticHead', () => {
  it('produces a buffer of the requested size', () => {
    const buffer = generateSyntheticHead(findFixture('nominal'));

    expect(buffer.width).toBe(600);
    expect(buffer.height).toBe(600);
    expect(buffer.data).toHaveLength(600 * 600 * 4);
  });

  it('renders fully opaque pixels', () => {
    const buffer = generateSyntheticHead(findFixture('nominal'));

    expect(buffer.data[3]).toBe(255);
  });

  it('is byte-identical for the same seed', () => {
    // A fixture that differs between machines makes a real regression and a
    // flaky test indistinguishable.
    const first = generateSyntheticHead(findFixture('nominal'));
    const second = generateSyntheticHead(findFixture('nominal'));

    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });

  it('differs for a different seed, so fixtures are not accidental duplicates', () => {
    const spec = findFixture('nominal');
    const first = generateSyntheticHead(spec);
    const second = generateSyntheticHead({ ...spec, seed: spec.seed + 1 });

    expect(Array.from(first.data)).not.toEqual(Array.from(second.data));
  });

  it('places the subject where the spec says, and the background elsewhere', () => {
    const spec = findFixture('nominal');
    const buffer = generateSyntheticHead(spec);

    const insideHead = luminanceAt(buffer, spec.centreX, spec.eyeY);
    const corner = luminanceAt(buffer, 2, 2);

    expect(Math.abs(insideHead - spec.headLuminance)).toBeLessThanOrEqual(spec.noiseAmplitude + 1);
    expect(Math.abs(corner - spec.backgroundLuminance)).toBeLessThanOrEqual(
      spec.noiseAmplitude + 1,
    );
  });
});

describe('the generator is verifiable against its own ground truth', () => {
  /**
   * The property that makes this corpus worth having: measure the rendered
   * pixels back, and the answer must be the parameters it was generated from.
   */
  it('places the crown within a pixel of the specified row', () => {
    const spec = findFixture('nominal');
    const buffer = generateSyntheticHead(spec);

    const measured = findTopmostSubjectRow(buffer, spec.backgroundLuminance, BASELINE_EDGE_THRESHOLD);

    expect(measured).toBeDefined();
    expect(Math.abs((measured ?? 0) - spec.crownY)).toBeLessThanOrEqual(1);
  });

  it('places the chin within a pixel of the specified row', () => {
    const spec = findFixture('nominal');
    const buffer = generateSyntheticHead(spec);

    const measured = findBottommostSubjectRow(
      buffer,
      spec.backgroundLuminance,
      BASELINE_EDGE_THRESHOLD,
    );

    expect(measured).toBeDefined();
    expect(Math.abs((measured ?? 0) - spec.chinY)).toBeLessThanOrEqual(1);
  });

  it('measures a covering as the topmost subject row, not the crown', () => {
    // This is the bug the fixture exists to expose: the topmost opaque pixel is
    // the hat, so anything measuring to it overstates head height.
    const spec = findFixture('head-covering');
    const buffer = generateSyntheticHead(spec);

    const measured = findTopmostSubjectRow(buffer, spec.backgroundLuminance, BASELINE_EDGE_THRESHOLD);

    expect(measured).toBeLessThan(spec.crownY);
    expect(Math.abs((measured ?? 0) - (spec.crownY - spec.headCoveringPx))).toBeLessThanOrEqual(1);
  });
});

describe('hard cases behave as documented', () => {
  it('defeats naive thresholding when hair and background are close in tone', () => {
    // The baseline detector must FAIL here. If it ever starts passing, the
    // fixture has stopped reproducing the case it was built for.
    const spec = findFixture('dark-hair-on-dark-background');
    const buffer = generateSyntheticHead(spec);

    const measured = findTopmostSubjectRow(buffer, spec.backgroundLuminance, BASELINE_EDGE_THRESHOLD);

    expect(measured).toBeUndefined();
  });

  it('clips no pixels on a nominal exposure', () => {
    const buffer = generateSyntheticHead(findFixture('nominal'));

    expect(clippedPixelRatio(buffer)).toBe(0);
  });

  it('clips a large share of pixels when overexposed', () => {
    const buffer = generateSyntheticHead(findFixture('overexposed'));

    expect(clippedPixelRatio(buffer)).toBeGreaterThan(0.5);
  });

  it('renders a dark mean when underexposed', () => {
    const buffer = generateSyntheticHead(findFixture('underexposed'));

    expect(meanLuminance(buffer)).toBeLessThan(30);
  });

  it('renders no subject rows when the crown is above the frame', () => {
    const spec = findFixture('crown-above-frame');
    const buffer = generateSyntheticHead(spec);

    const measured = findTopmostSubjectRow(buffer, spec.backgroundLuminance, BASELINE_EDGE_THRESHOLD);

    // The subject reaches the very first row: it is cropped, not absent.
    expect(measured).toBe(0);
  });

  it('extends the subject to the final row when the chin is below the frame', () => {
    const spec = findFixture('chin-below-frame');
    const buffer = generateSyntheticHead(spec);

    const measured = findBottommostSubjectRow(
      buffer,
      spec.backgroundLuminance,
      BASELINE_EDGE_THRESHOLD,
    );

    expect(measured).toBe(buffer.height - 1);
  });

  it('keeps an off-centre subject away from the midline', () => {
    const spec = findFixture('off-centre');

    expect(spec.centreX).toBeLessThan(spec.widthPx / 2);
  });
});

describe('the fixture corpus', () => {
  it('covers every documented failure mode', () => {
    const names = SYNTHETIC_HEAD_FIXTURES.map((fixture) => fixture.name);

    for (const required of [
      'dark-hair-on-dark-background',
      'bald-on-light-background',
      'head-covering',
      'crown-above-frame',
      'chin-below-frame',
      'overexposed',
      'underexposed',
    ]) {
      expect(names).toContain(required);
    }
  });

  it('gives every fixture a unique name and a stated reason for existing', () => {
    const names = SYNTHETIC_HEAD_FIXTURES.map((fixture) => fixture.name);
    expect(new Set(names).size).toBe(names.length);

    for (const fixture of SYNTHETIC_HEAD_FIXTURES) {
      expect(fixture.description.length).toBeGreaterThan(30);
    }
  });

  it('gives every fixture a distinct seed, so none are accidental copies', () => {
    const seeds = SYNTHETIC_HEAD_FIXTURES.map((fixture) => fixture.spec.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it.each(SYNTHETIC_HEAD_FIXTURES)('renders $name without throwing', ({ spec }) => {
    expect(() => generateSyntheticHead(spec)).not.toThrow();
  });
});

describe('degenerate specifications', () => {
  it('renders pure background when the head has no height', () => {
    // Guards against a divide-by-zero producing NaN pixels rather than an
    // honest empty frame.
    const buffer = generateSyntheticHead({
      ...findFixture('nominal'),
      crownY: 300,
      chinY: 300,
      noiseAmplitude: 0,
    });

    expect(findTopmostSubjectRow(buffer, 245, 24)).toBeUndefined();
  });

  it('renders pure background when the head has no width', () => {
    const buffer = generateSyntheticHead({
      ...findFixture('nominal'),
      headWidthPx: 0,
      noiseAmplitude: 0,
    });

    expect(findTopmostSubjectRow(buffer, 245, 24)).toBeUndefined();
  });
});
