import { describe, expect, it } from 'vitest';
import {
  CHIN_POINT_INDEX,
  LEFT_EYE_POINT_INDEX,
  REQUIRED_LANDMARK_POINTS,
  RIGHT_EYE_POINT_INDEX,
} from '@/analysis/landmark-points.constants';
import { CHANNELS_PER_PIXEL } from '@/testing/fixtures/pixel-format.constants';
import { observeFrame } from './observe-frame';
import type { AnalysisResult, LandmarkResult } from '@/analysis/analysis-protocol.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const MID_GREY = 128;

const spec = (): ResolvedPhotoSpec =>
  ({
    print: { widthMm: 51, heightMm: 51, dpi: 300 },
    headHeight: { minMm: 25, maxMm: 35, minRatio: 0.49, maxRatio: 0.69, authoredUnit: 'mm' },
    background: {
      colour: 'white',
      hexRanges: [['#e0e0e0', '#ffffff']],
      uniformityTolerance: 12,
    },
    crownDefinition: 'visible-top',
  }) as unknown as ResolvedPhotoSpec;

/** A flat frame at a chosen luminance. */
const frameAt = (level: number): PixelBuffer => {
  const data = new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT * CHANNELS_PER_PIXEL);
  data.fill(level);
  return {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    data: data as Uint8ClampedArray<ArrayBuffer>,
  };
};

const landmarks = (overrides: Partial<LandmarkResult> = {}): LandmarkResult => ({
  // Normalised, as every landmark model reports them.
  points: [
    { x: 0.5, y: 0.8 },
    { x: 0.4, y: 0.4 },
    { x: 0.6, y: 0.4 },
  ],
  confidence: 0.9,
  rollDegrees: 0,
  yawDegrees: 0,
  pitchDegrees: 0,
  blendshapes: {},
  ...overrides,
});

const observe = (result: AnalysisResult, level = MID_GREY) =>
  observeFrame({ result, frame: frameAt(level), spec: spec() });

describe('landmark point order', () => {
  it('is the order the fake detector produces', () => {
    // The convention used to live in a comment inside the fake, which is to
    // say it was something a reader and a producer could disagree about while
    // both compiled. Chin, left eye, right eye.
    expect([CHIN_POINT_INDEX, LEFT_EYE_POINT_INDEX, RIGHT_EYE_POINT_INDEX]).toEqual([0, 1, 2]);
    expect(REQUIRED_LANDMARK_POINTS).toBe(3);
  });
});

describe('observeFrame', () => {
  it('converts normalised landmarks into frame pixels', () => {
    const observation = observe({ landmarks: landmarks(), segmentation: undefined });

    expect(observation.subject).toMatchObject({
      chin: { x: 0.5 * FRAME_WIDTH, y: 0.8 * FRAME_HEIGHT },
      leftEye: { x: 0.4 * FRAME_WIDTH, y: 0.4 * FRAME_HEIGHT },
      rightEye: { x: 0.6 * FRAME_WIDTH, y: 0.4 * FRAME_HEIGHT },
    });
  });

  it('reports the frame it measured, so guidance knows what it is inside', () => {
    const observation = observe({ landmarks: landmarks(), segmentation: undefined });

    expect(observation.subject).toMatchObject({
      sourceWidthPx: FRAME_WIDTH,
      sourceHeightPx: FRAME_HEIGHT,
    });
  });

  it('passes the detector confidence through rather than deciding on it', () => {
    const observation = observe({
      landmarks: landmarks({ confidence: 0.42 }),
      segmentation: undefined,
    });

    expect(observation.faceConfidence).toBe(0.42);
  });

  it('passes the yaw through', () => {
    const observation = observe({ landmarks: landmarks({ yawDegrees: 12 }), segmentation: undefined });

    expect(observation.yawDegrees).toBe(12);
  });

  it('reports no subject when the detector found no face', () => {
    const observation = observe({ landmarks: undefined, segmentation: undefined });

    expect(observation).toMatchObject({ subject: undefined, faceConfidence: 0, faceCount: 0 });
  });

  it('reports no subject when too few points came back to measure from', () => {
    // Two points is a face the model is halfway through describing. Measuring
    // a chin from it would produce a number, and the number would be a guess.
    const observation = observe({
      landmarks: landmarks({ points: [{ x: 0.5, y: 0.8 }] }),
      segmentation: undefined,
    });

    expect(observation.subject).toBeUndefined();
  });

  it('measures the light even when there is no face', () => {
    // The one reading that is still trustworthy, and the one that explains why
    // there is no face.
    const observation = observe({ landmarks: undefined, segmentation: undefined }, 10);

    expect(observation.meanLuminance).toBeLessThan(MID_GREY);
  });

  it('leaves the crown unmeasured until segmentation arrives', () => {
    const observation = observe({ landmarks: landmarks(), segmentation: undefined });

    expect(observation.subject?.crownY).toBeUndefined();
  });

  it('leaves the background unjudged until segmentation arrives', () => {
    // Undefined, not "plain". Guessing in the gap would flash "stand against a
    // plain wall" at somebody who already is.
    const observation = observe({ landmarks: landmarks(), segmentation: undefined });

    expect(observation.backgroundUniform).toBeUndefined();
  });

  it('judges the background once there is a mask to judge it by', () => {
    const mask = new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT);
    // A head-shaped block in the middle; everything else is the wall.
    for (let y = 10; y < 50; y += 1) {
      for (let x = 20; x < 44; x += 1) mask[y * FRAME_WIDTH + x] = 255;
    }

    const observation = observe({
      landmarks: landmarks(),
      segmentation: { width: FRAME_WIDTH, height: FRAME_HEIGHT, mask, confidence: 0.9 },
    });

    // A perfectly flat frame is as uniform as a wall gets.
    expect(observation.backgroundUniform).toBe(true);
  });

  it('measures a crown from the mask when it can find one', () => {
    const mask = new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT);
    for (let y = 10; y < 55; y += 1) {
      for (let x = 18; x < 46; x += 1) mask[y * FRAME_WIDTH + x] = 255;
    }

    const observation = observe({
      landmarks: landmarks(),
      segmentation: { width: FRAME_WIDTH, height: FRAME_HEIGHT, mask, confidence: 0.9 },
    });

    expect(observation.subject?.crownY).toBeGreaterThan(0);
  });

  it('refuses to judge a background from a mask of a different size', () => {
    // The mask is indexed by frame pixel, so a mask at another resolution
    // would have index n naming a different pixel in each — producing a
    // verdict computed from a scrambled selection, delivered confidently.
    const half = FRAME_WIDTH / 2;
    const observation = observe({
      landmarks: landmarks(),
      segmentation: {
        width: half,
        height: half,
        mask: new Uint8ClampedArray(half * half),
        confidence: 0.9,
      },
    });

    expect(observation.backgroundUniform).toBeUndefined();
  });

  it('leaves the crown unmeasured when the mask is empty', () => {
    // The estimator declines in more cases than it succeeds in, by design, and
    // an undefined crown is a first-class answer rather than a failure.
    const observation = observe({
      landmarks: landmarks(),
      segmentation: {
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        mask: new Uint8ClampedArray(FRAME_WIDTH * FRAME_HEIGHT),
        confidence: 0.9,
      },
    });

    expect(observation.subject?.crownY).toBeUndefined();
  });
});
