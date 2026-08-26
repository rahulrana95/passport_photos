import { describe, expect, it, vi } from 'vitest';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { NOMINAL_HEAD_SPEC } from '@/testing/fixtures/synthetic-head.constants';
import { createFakeMediaPipe } from './fake-mediapipe';
import { createMediaPipeDetector } from './mediapipe-detector';
import { createDetector, createUnavailableDetector } from './detector.factory';
import type { FakeFace } from './fake-mediapipe';

const buffer = generateSyntheticHead({ ...NOMINAL_HEAD_SPEC, widthPx: 64, heightPx: 64 });

/** A face box centred at (cx, cy) spanning `height` of the frame. */
const faceAt = (centreX: number, centreY: number, height: number): FakeFace => {
  const halfHeight = height / 2;
  const halfWidth = height / 3;

  return {
    points: [
      { x: centreX - halfWidth, y: centreY - halfHeight },
      { x: centreX + halfWidth, y: centreY - halfHeight },
      { x: centreX, y: centreY + halfHeight },
    ],
  };
};

describe('starting the runtime', () => {
  it('uses the GPU delegate when it is available', () => {
    const onBuild = vi.fn();

    return createMediaPipeDetector(createFakeMediaPipe({ onBuild })).then(() => {
      expect(onBuild).toHaveBeenCalledWith('GPU');
    });
  });

  it('falls back to CPU when WebGL is unavailable', async () => {
    // Not optional. WebGL is disabled outright in some hardened and enterprise
    // browsers, and an analysis that simply never completes there is
    // indistinguishable from a broken product.
    const onBuild = vi.fn();

    await createMediaPipeDetector(createFakeMediaPipe({ gpuUnavailable: true, onBuild }));

    expect(onBuild).toHaveBeenCalledWith('CPU');
    expect(onBuild).not.toHaveBeenCalledWith('GPU');
  });
});

describe('reading a detection', () => {
  it('returns the landmarks of the only face', async () => {
    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({ faces: [faceAt(0.5, 0.5, 0.6)] }),
    );

    const result = await detector.detectLandmarks(buffer);

    expect(result?.points).toHaveLength(3);
  });

  it('chooses the largest of several faces', async () => {
    // Silently measuring a bystander is the failure mode that produces a
    // confident, wrong answer about the wrong person.
    const subject = faceAt(0.5, 0.5, 0.6);
    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({ faces: [faceAt(0.2, 0.3, 0.2), subject] }),
    );

    const result = await detector.detectLandmarks(buffer);

    expect(result?.points[2]?.y).toBeCloseTo(0.8, 6);
  });

  it('reports nothing when the model found no face', async () => {
    const detector = await createMediaPipeDetector(createFakeMediaPipe({ faces: [] }));

    expect(await detector.detectLandmarks(buffer)).toBeUndefined();
  });

  it('reports nothing for a face too small to measure', async () => {
    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({ faces: [faceAt(0.5, 0.5, 0.05)] }),
    );

    expect(await detector.detectLandmarks(buffer)).toBeUndefined();
  });

  it('carries blendshapes through for the expression rules', async () => {
    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({
        faces: [faceAt(0.5, 0.5, 0.6)],
        blendshapes: { jawOpen: 0.42, mouthSmile: 0.11 },
      }),
    );

    const result = await detector.detectLandmarks(buffer);

    expect(result?.blendshapes['jawOpen']).toBe(0.42);
  });

  it('returns an empty blendshape set rather than failing when there are none', async () => {
    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({ faces: [faceAt(0.5, 0.5, 0.6)] }),
    );

    const result = await detector.detectLandmarks(buffer);

    expect(result?.blendshapes).toEqual({});
  });

  it('reads pose from the transform matrix of the face it selected', async () => {
    // Not of the first face the model returned. When a bystander is dropped,
    // their matrix must go with them.
    const turned = 20 / (180 / Math.PI);
    const yawMatrix = [
      Math.cos(turned), 0, -Math.sin(turned), 0,
      0, 1, 0, 0,
      Math.sin(turned), 0, Math.cos(turned), 0,
      0, 0, 0, 1,
    ];

    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({
        faces: [
          { ...faceAt(0.2, 0.3, 0.2), matrix: [] },
          { ...faceAt(0.5, 0.5, 0.6), matrix: yawMatrix },
        ],
      }),
    );

    const result = await detector.detectLandmarks(buffer);

    expect(result?.yawDegrees).toBeCloseTo(20, 3);
  });

  it('declines to measure a face turned too far', async () => {
    const turned = 60 / (180 / Math.PI);
    const yawMatrix = [
      Math.cos(turned), 0, -Math.sin(turned), 0,
      0, 1, 0, 0,
      Math.sin(turned), 0, Math.cos(turned), 0,
      0, 0, 0, 1,
    ];

    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({ faces: [{ ...faceAt(0.5, 0.5, 0.6), matrix: yawMatrix }] }),
    );

    expect(await detector.detectLandmarks(buffer)).toBeUndefined();
  });

  it('reports no segmentation, which is PR #18 and not this one', async () => {
    // Honest rather than absent: geometry that depends only on landmarks still
    // works, and crown height degrades to unmeasurable rather than to wrong.
    const detector = await createMediaPipeDetector(
      createFakeMediaPipe({ faces: [faceAt(0.5, 0.5, 0.6)] }),
    );

    expect(await detector.segment(buffer)).toBeUndefined();
  });
});

describe('createDetector', () => {
  it('builds a working detector when the runtime starts', async () => {
    const detector = await createDetector(() =>
      Promise.resolve(createFakeMediaPipe({ faces: [faceAt(0.5, 0.5, 0.6)] })),
    );

    expect(await detector.detectLandmarks(buffer)).toBeDefined();
  });

  it('returns an unavailable detector when the bundle cannot be loaded', async () => {
    // Returned rather than thrown, so the failure arrives through the normal
    // protocol path. Throwing would take the worker down and every request
    // would surface as worker-crashed — the wrong diagnosis entirely.
    const detector = await createDetector(() => Promise.reject(new Error('blocked')));

    await expect(detector.detectLandmarks(buffer)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
  });

  it('returns an unavailable detector when the runtime refuses to start', async () => {
    const detector = await createDetector(() =>
      Promise.resolve(createFakeMediaPipe({ failToStart: true })),
    );

    await expect(detector.segment(buffer)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
  });
});

describe('createUnavailableDetector', () => {
  it('rejects both calls with the message it was given', async () => {
    const detector = createUnavailableDetector('no engine here');

    await expect(detector.detectLandmarks(buffer)).rejects.toThrow('no engine here');
    await expect(detector.segment(buffer)).rejects.toThrow('no engine here');
  });
});
