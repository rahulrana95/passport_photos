import { describe, expect, it, vi } from 'vitest';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { SYNTHETIC_HEAD_FIXTURES } from '@/testing/fixtures/synthetic-head.constants';
import { createAnalysisClient } from './analysis-client';
import { createFakeDetector } from './fake-detector';
import { createFakeWorker } from './fake-worker';
import type { AnalysisRequestPayload, WorkerResponse } from './analysis-protocol.types';
import type { WorkerLike } from './analysis-client.types';

const fixture = (name: string): AnalysisRequestPayload => {
  const found = SYNTHETIC_HEAD_FIXTURES.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`Unknown fixture: ${name}`);
  return { buffer: generateSyntheticHead(found.spec) };
};

const NOMINAL = fixture('nominal');

const clientWith = (
  workerOptions: Parameters<typeof createFakeWorker>[0],
  clientOptions: Partial<Parameters<typeof createAnalysisClient>[0]> = {},
): ReturnType<typeof createAnalysisClient> =>
  createAnalysisClient({
    createWorker: () => createFakeWorker(workerOptions),
    ...clientOptions,
  });

describe('a successful analysis', () => {
  it('resolves with landmarks and a segmentation mask', async () => {
    const client = clientWith({ detector: createFakeDetector() });

    const result = await client.analyse(NOMINAL);

    expect(result.landmarks).toBeDefined();
    expect(result.segmentation).toBeDefined();
  });

  it('reports progress through every stage, in increasing order', async () => {
    const seen: number[] = [];
    const client = clientWith({ detector: createFakeDetector() });

    await client.analyse(NOMINAL, { onProgress: (_stage, ratio) => seen.push(ratio) });

    expect(seen.length).toBeGreaterThan(1);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it('creates the worker lazily, not when the client is constructed', () => {
    // Not an optimisation: the models are several megabytes, and loading them
    // at first paint would wreck the LCP budget on every country page.
    const createWorker = vi.fn(() => createFakeWorker({ detector: createFakeDetector() }));
    createAnalysisClient({ createWorker });

    expect(createWorker).not.toHaveBeenCalled();
  });

  it('reuses one worker across calls', async () => {
    const createWorker = vi.fn(() => createFakeWorker({ detector: createFakeDetector() }));
    const client = createAnalysisClient({ createWorker });

    await client.analyse(NOMINAL);
    await client.analyse(NOMINAL);

    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('keeps two concurrent analyses separate', async () => {
    const client = clientWith({ detector: createFakeDetector() });

    const [first, second] = await Promise.all([
      client.analyse(NOMINAL),
      client.analyse(fixture('head-covering')),
    ]);

    expect(first.landmarks).toBeDefined();
    expect(second.landmarks).toBeDefined();
  });
});

describe('failures the caller must be able to act on', () => {
  it('reports no face found, with an instruction', async () => {
    const client = clientWith({ detector: createFakeDetector({ failLandmarks: true }) });

    await expect(client.analyse(NOMINAL)).rejects.toMatchObject({
      code: 'no-face-detected',
      message: expect.stringMatching(/try again/i),
    });
  });

  it('preserves the error code across the worker boundary', async () => {
    // Structured clone drops the prototype, so an un-serialised Error would
    // arrive as a shapeless object the caller could not branch on.
    const client = clientWith({ detector: createFakeDetector({ failLandmarks: true }) });

    await expect(client.analyse(NOMINAL)).rejects.toHaveProperty('code', 'no-face-detected');
  });

  it('reports a browser that blocks workers, rather than hanging', async () => {
    const client = clientWith({ detector: createFakeDetector(), failToStart: true });

    await expect(client.analyse(NOMINAL)).rejects.toMatchObject({ code: 'worker-unavailable' });
  });

  it('fails in-flight requests when the worker crashes', async () => {
    const client = clientWith({ detector: createFakeDetector(), crashOnNextMessage: true });

    await expect(client.analyse(NOMINAL)).rejects.toMatchObject({ code: 'worker-crashed' });
  });

  it('builds a fresh worker after a crash rather than posting into a dead thread', async () => {
    let crash = true;
    const createWorker = vi.fn(() =>
      createFakeWorker({ detector: createFakeDetector(), crashOnNextMessage: crash }),
    );
    const client = createAnalysisClient({ createWorker });

    await expect(client.analyse(NOMINAL)).rejects.toMatchObject({ code: 'worker-crashed' });
    crash = false;
    await expect(client.analyse(NOMINAL)).resolves.toBeDefined();

    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('times out a worker that never responds', async () => {
    vi.useFakeTimers();
    const client = clientWith({ detector: createFakeDetector(), neverRespond: true }, {
      timeoutMs: 1000,
    });

    const promise = client.analyse(NOMINAL);
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;

    vi.useRealTimers();
  });
});

describe('cancellation', () => {
  it('rejects when the signal aborts', async () => {
    const controller = new AbortController();
    const client = clientWith({ detector: createFakeDetector(), neverRespond: true });

    const promise = client.analyse(NOMINAL, { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('does not settle twice when cancellation arrives after completion', async () => {
    // A late rejection would surface as a spurious failure on whatever the user
    // is looking at by then.
    const controller = new AbortController();
    const client = clientWith({ detector: createFakeDetector() });

    const result = await client.analyse(NOMINAL, { signal: controller.signal });
    expect(result.landmarks).toBeDefined();

    expect(() => controller.abort()).not.toThrow();
  });

  it('fails everything in flight when disposed', async () => {
    const client = clientWith({ detector: createFakeDetector(), neverRespond: true });

    const promise = client.analyse(NOMINAL);
    client.dispose();

    await expect(promise).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('refuses further work after disposal', async () => {
    const client = clientWith({ detector: createFakeDetector() });
    client.dispose();

    await expect(client.analyse(NOMINAL)).rejects.toMatchObject({ code: 'worker-unavailable' });
  });

  it('terminates the worker on disposal', async () => {
    const worker = createFakeWorker({ detector: createFakeDetector() });
    const terminate = vi.spyOn(worker, 'terminate');
    const client = createAnalysisClient({ createWorker: () => worker });

    // Rejection is expected on dispose; attaching a handler keeps it from
    // surfacing as an unhandled rejection and failing an unrelated test.
    const inFlight = client.analyse(NOMINAL).catch(() => undefined);
    client.dispose();
    await inFlight;

    expect(terminate).toHaveBeenCalled();
  });
});

/**
 * A worker that says nothing on its own and replays exactly what a test asks
 * it to. Used for protocol responses the fake worker never produces, which are
 * the ones a future worker implementation is most likely to get wrong.
 */
const createScriptedWorker = (): {
  readonly worker: WorkerLike;
  readonly emit: (response: WorkerResponse) => void;
  readonly listenerCount: () => number;
} => {
  const listeners = new Set<(event: { data: WorkerResponse }) => void>();

  const worker = {
    postMessage(): void {
      // Deliberately silent: the test drives every response.
    },
    terminate(): void {
      listeners.clear();
    },
    addEventListener(type: string, listener: (event: never) => void): void {
      if (type === 'message') {
        listeners.add(listener as unknown as (event: { data: WorkerResponse }) => void);
      }
    },
    removeEventListener(_type: string, listener: (event: never) => void): void {
      listeners.delete(listener as unknown as (event: { data: WorkerResponse }) => void);
    },
  } as WorkerLike;

  return {
    worker,
    emit: (response) => {
      for (const listener of listeners) listener({ data: response });
    },
    listenerCount: () => listeners.size,
  };
};

describe('protocol responses the client must survive', () => {
  it('rejects a live request the worker reports as cancelled', async () => {
    // The client normally settles a cancellation itself before the worker
    // acknowledges it. A worker that cancels on its own — under memory
    // pressure, say — must still settle the promise rather than leave the
    // caller waiting for the timeout.
    const scripted = createScriptedWorker();
    const client = createAnalysisClient({ createWorker: () => scripted.worker });

    const pending = client.analyse(NOMINAL);
    scripted.emit({ kind: 'cancelled', id: '0' });

    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('ignores progress for a request it no longer knows about', async () => {
    const scripted = createScriptedWorker();
    const client = createAnalysisClient({ createWorker: () => scripted.worker });

    const pending = client.analyse(NOMINAL);
    scripted.emit({ kind: 'progress', id: 'not-a-request', stage: 'decoding', ratio: 0.1 });
    scripted.emit({ kind: 'cancelled', id: '0' });

    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('stops listening to a worker it has disposed', () => {
    const scripted = createScriptedWorker();
    const client = createAnalysisClient({ createWorker: () => scripted.worker });

    void client.analyse(NOMINAL).catch(() => undefined);
    expect(scripted.listenerCount()).toBe(1);

    client.dispose();

    // Left attached, a late message from an abandoned worker would settle a
    // request belonging to its replacement.
    expect(scripted.listenerCount()).toBe(0);
  });
});
