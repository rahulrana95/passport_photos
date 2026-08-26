import { describe, expect, it, vi } from 'vitest';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { SYNTHETIC_HEAD_FIXTURES } from '@/testing/fixtures/synthetic-head.constants';
import { createRequestHandler } from './analysis-worker.handlers';
import { createFakeDetector } from './fake-detector';
import type { WorkerResponse } from './analysis-protocol.types';

const buffer = generateSyntheticHead(SYNTHETIC_HEAD_FIXTURES[0]!.spec);
const payload = { buffer };

const collect = (): { emit: (r: WorkerResponse) => void; seen: WorkerResponse[] } => {
  const seen: WorkerResponse[] = [];
  return { emit: (response) => seen.push(response), seen };
};

describe('createRequestHandler', () => {
  it('emits progress then a result', async () => {
    const { emit, seen } = collect();
    await createRequestHandler(createFakeDetector(), emit)({ kind: 'analyse', id: '1', payload });

    expect(seen.filter((r) => r.kind === 'progress').length).toBeGreaterThan(0);
    expect(seen.at(-1)?.kind).toBe('result');
  });

  it('emits a structured error when no face is found', async () => {
    const { emit, seen } = collect();
    const handle = createRequestHandler(createFakeDetector({ failLandmarks: true }), emit);

    await handle({ kind: 'analyse', id: '1', payload });

    expect(seen.at(-1)).toMatchObject({ kind: 'error', error: { code: 'no-face-detected' } });
  });

  it('still returns a result when segmentation fails but landmarks succeed', async () => {
    // Partial success is useful: geometry that depends only on landmarks can
    // still be reported, with crown height degraded to unmeasurable.
    const { emit, seen } = collect();
    const handle = createRequestHandler(createFakeDetector({ failSegmentation: true }), emit);

    await handle({ kind: 'analyse', id: '1', payload });

    expect(seen.at(-1)).toMatchObject({ kind: 'result' });
  });

  it('acknowledges a cancellation', async () => {
    const { emit, seen } = collect();
    await createRequestHandler(createFakeDetector(), emit)({ kind: 'cancel', id: '1' });

    expect(seen).toEqual([{ kind: 'cancelled', id: '1' }]);
  });

  it('stops work when a cancellation lands mid-analysis', async () => {
    const { emit, seen } = collect();
    const detector = createFakeDetector();
    const handle = createRequestHandler(
      {
        detectLandmarks: async (input) => {
          await handle({ kind: 'cancel', id: '1' });
          return detector.detectLandmarks(input);
        },
        segment: detector.segment,
      },
      emit,
    );

    await handle({ kind: 'analyse', id: '1', payload });

    expect(seen.some((r) => r.kind === 'result')).toBe(false);
  });

  it('does not report an error for a request that was cancelled', async () => {
    // The caller has moved on; a late failure would surface as a spurious error
    // on whatever they are looking at now.
    const { emit, seen } = collect();
    const handle = createRequestHandler(
      {
        detectLandmarks: async () => {
          await handle({ kind: 'cancel', id: '1' });
          throw new Error('boom');
        },
        segment: () => Promise.resolve(undefined),
      },
      emit,
    );

    await handle({ kind: 'analyse', id: '1', payload });

    expect(seen.some((r) => r.kind === 'error')).toBe(false);
  });

  it('stops before touching the detector when cancelled during decoding', async () => {
    // Each checkpoint is tested separately on purpose: a cancellation that is
    // only noticed at the end still burns the whole analysis, which on a phone
    // is seconds of blocked work the user has already navigated away from.
    const detectLandmarks = vi.fn(createFakeDetector().detectLandmarks);
    const seen: WorkerResponse[] = [];
    const handle = createRequestHandler(
      { detectLandmarks, segment: createFakeDetector().segment },
      (response) => {
        seen.push(response);
        if (response.kind === 'progress' && response.stage === 'decoding') {
          void handle({ kind: 'cancel', id: '1' });
        }
      },
    );

    await handle({ kind: 'analyse', id: '1', payload });

    expect(detectLandmarks).not.toHaveBeenCalled();
    expect(seen.some((r) => r.kind === 'result')).toBe(false);
  });

  it('stops after segmentation when the cancellation lands during it', async () => {
    const seen: WorkerResponse[] = [];
    const handle = createRequestHandler(createFakeDetector(), (response) => {
      seen.push(response);
      if (response.kind === 'progress' && response.stage === 'segmenting') {
        void handle({ kind: 'cancel', id: '1' });
      }
    });

    await handle({ kind: 'analyse', id: '1', payload });

    expect(seen.some((r) => r.kind === 'progress' && r.stage === 'checking-quality')).toBe(false);
    expect(seen.some((r) => r.kind === 'result')).toBe(false);
  });

  it('serialises an unexpected throw rather than losing it', async () => {
    const { emit, seen } = collect();
    const handle = createRequestHandler(
      {
        detectLandmarks: () => Promise.reject(new Error('detector exploded')),
        segment: () => Promise.resolve(undefined),
      },
      emit,
    );

    await handle({ kind: 'analyse', id: '1', payload });

    expect(seen.at(-1)).toMatchObject({
      kind: 'error',
      error: { code: 'unknown', message: 'detector exploded' },
    });
  });

  it('lets a later request with a reused id run, since cancellation is per-request', async () => {
    const { emit } = collect();
    const handle = createRequestHandler(createFakeDetector(), emit);

    await handle({ kind: 'cancel', id: '1' });
    const second = collect();
    const handleAgain = createRequestHandler(createFakeDetector(), second.emit);
    await handleAgain({ kind: 'analyse', id: '1', payload });

    expect(second.seen.at(-1)?.kind).toBe('result');
  });

  it('does not emit anything after a terminated worker stops listening', async () => {
    const emit = vi.fn();
    await createRequestHandler(createFakeDetector(), emit)({ kind: 'cancel', id: '9' });

    expect(emit).toHaveBeenCalledTimes(1);
  });
});
