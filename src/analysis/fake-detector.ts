import {
  BASELINE_EDGE_THRESHOLD,
  SYNTHETIC_HEAD_FIXTURES,
} from '@/testing/fixtures/synthetic-head.constants';
import { buffersAreIdentical, luminanceAt } from '@/testing/fixtures/measure-buffer.utils';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { CHANNEL_MAX, CHANNEL_MIN } from '@/testing/fixtures/pixel-format.constants';
import type { PixelBuffer, SyntheticHeadSpec } from '@/testing/fixtures/synthetic-head.types';
import type {
  Detector,
  LandmarkResult,
  SegmentationResult,
} from './analysis-protocol.types';

export interface FakeDetectorOptions {
  /** Simulates a detector that finds nothing, for the no-face path. */
  readonly failLandmarks?: boolean;
  /** Simulates segmentation failing while landmarks succeed. */
  readonly failSegmentation?: boolean;
  readonly confidence?: number;
  readonly rollDegrees?: number;
  readonly yawDegrees?: number;
  readonly pitchDegrees?: number;
  readonly blendshapes?: Readonly<Record<string, number>>;
}

const DEFAULT_CONFIDENCE = 0.95;

/**
 * Eyes sit roughly a quarter of the head's width either side of the midline.
 * Approximate by design — the fake produces plausible landmark geometry, and
 * anything depending on a precise inter-ocular distance must use the real
 * detector.
 */
const EYE_OFFSET_FRACTION_OF_HEAD_WIDTH = 0.25;
const NEUTRAL_BLENDSHAPES = {
  eyeBlinkLeft: 0.02,
  eyeBlinkRight: 0.02,
  jawOpen: 0.03,
  mouthSmile: 0.05,
} as const;

/**
 * Derives landmarks from the parameters a fixture was generated from, rather
 * than by looking at pixels.
 *
 * That is the point: the ground truth is exact by construction, so a downstream
 * failure means the code under test is wrong — never that the fake detector
 * mis-measured. A fake that guessed would give every test a second thing that
 * could be at fault.
 */
const landmarksFromSpec = (
  spec: SyntheticHeadSpec,
  options: FakeDetectorOptions,
): LandmarkResult => ({
  points: [
    // Chin, then the two iris centres — the minimum the geometry engine needs.
    { x: spec.centreX / spec.widthPx, y: spec.chinY / spec.heightPx },
    {
      x: (spec.centreX - spec.headWidthPx * EYE_OFFSET_FRACTION_OF_HEAD_WIDTH) / spec.widthPx,
      y: spec.eyeY / spec.heightPx,
    },
    {
      x: (spec.centreX + spec.headWidthPx * EYE_OFFSET_FRACTION_OF_HEAD_WIDTH) / spec.widthPx,
      y: spec.eyeY / spec.heightPx,
    },
  ],
  confidence: options.confidence ?? DEFAULT_CONFIDENCE,
  rollDegrees: options.rollDegrees ?? 0,
  yawDegrees: options.yawDegrees ?? 0,
  pitchDegrees: options.pitchDegrees ?? 0,
  blendshapes: options.blendshapes ?? NEUTRAL_BLENDSHAPES,
});

const maskFromBuffer = (buffer: PixelBuffer, backgroundLuminance: number): SegmentationResult => {
  const mask = new Uint8ClampedArray(buffer.width * buffer.height);

  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      const differs =
        Math.abs(luminanceAt(buffer, x, y) - backgroundLuminance) > BASELINE_EDGE_THRESHOLD;
      mask[y * buffer.width + x] = differs ? CHANNEL_MAX : CHANNEL_MIN;
    }
  }

  return { width: buffer.width, height: buffer.height, mask, confidence: DEFAULT_CONFIDENCE };
};

interface RenderedFixture {
  readonly spec: SyntheticHeadSpec;
  readonly buffer: PixelBuffer;
}

let renderedCorpus: readonly RenderedFixture[] | undefined;

/** Renders the corpus once per process; generation is deterministic. */
const getRenderedCorpus = (): readonly RenderedFixture[] => {
  renderedCorpus ??= SYNTHETIC_HEAD_FIXTURES.map(({ spec }) => ({
    spec,
    buffer: generateSyntheticHead(spec),
  }));
  return renderedCorpus;
};

/**
 * Matches a buffer back to the fixture it was generated from.
 *
 * Matched on the full pixel data, not on a summary. Most of the corpus shares
 * dimensions and background level — eight fixtures sit on background 245 — so
 * a corner-pixel heuristic identifies the first of them for all of them, and
 * the fake then reports a chin for a frame whose chin was cropped away. Each
 * fixture carries a distinct noise seed, so exact comparison is exact identity
 * and mismatches exit within the first row.
 */
const findMatchingSpec = (buffer: PixelBuffer): SyntheticHeadSpec | undefined =>
  getRenderedCorpus().find((candidate) => buffersAreIdentical(candidate.buffer, buffer))?.spec;

/**
 * Whether a fixture is one a landmark model could plausibly read at all.
 *
 * Two spec conditions make it unreadable, and both are decided from the spec
 * rather than probed from pixels so the answer cannot drift with the noise
 * seed:
 *
 * - the chin falls below the bottom edge, so the chin landmark does not exist
 *   in the image and any value returned for it would be invented;
 * - head and background are closer together than the edge threshold, so there
 *   is no silhouette to work from at all.
 *
 * A chin above the top edge is not checked because it is not a state the
 * corpus can represent: every fixture places the chin below the crown, and a
 * buffer built from an ad-hoc spec matches no fixture and is rejected earlier.
 */
const isLandmarkReadable = (spec: SyntheticHeadSpec): boolean => {
  const chinInsideFrame = spec.chinY < spec.heightPx;
  const separable =
    Math.abs(spec.headLuminance - spec.backgroundLuminance) > BASELINE_EDGE_THRESHOLD;

  return chinInsideFrame && separable;
};

export const createFakeDetector = (options: FakeDetectorOptions = {}): Detector => ({
  detectLandmarks: (buffer: PixelBuffer): Promise<LandmarkResult | undefined> => {
    if (options.failLandmarks === true) return Promise.resolve(undefined);

    const spec = findMatchingSpec(buffer);
    if (spec === undefined) return Promise.resolve(undefined);
    if (!isLandmarkReadable(spec)) return Promise.resolve(undefined);

    return Promise.resolve(landmarksFromSpec(spec, options));
  },

  segment: (buffer: PixelBuffer): Promise<SegmentationResult | undefined> => {
    if (options.failSegmentation === true) return Promise.resolve(undefined);

    const spec = findMatchingSpec(buffer);
    if (spec === undefined) return Promise.resolve(undefined);

    return Promise.resolve(maskFromBuffer(buffer, spec.backgroundLuminance));
  },
});
