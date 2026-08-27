import { describe, expect, it, vi } from 'vitest';
import { createFrameLoop } from './frame-loop';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

const INTERVAL_MS = 300;

const frame = (): PixelBuffer => ({
  width: 2,
  height: 2,
  data: new Uint8ClampedArray(16) as Uint8ClampedArray<ArrayBuffer>,
});

/** Lets the loop's own awaits settle without advancing any clock. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('createFrameLoop', () => {
  it('is not running until it is started', () => {
    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame: async () => {} });

    expect(loop.isRunning()).toBe(false);
  });

  it('analyses the first frame immediately rather than after a delay', async () => {
    // The first instruction should appear the moment there is something to
    // say about, not one interval later.
    const onFrame = vi.fn(async () => {});
    createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame }).start();
    await settle();

    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  it('waits for the analysis to finish before scheduling the next', async () => {
    vi.useFakeTimers();
    let inFlight = 0;
    let overlapped = false;

    const loop = createFrameLoop({
      intervalMs: INTERVAL_MS,
      grab: frame,
      onFrame: async () => {
        inFlight += 1;
        if (inFlight > 1) overlapped = true;
        await Promise.resolve();
        inFlight -= 1;
      },
    });

    loop.start();
    for (let tick = 0; tick < 5; tick += 1) {
      await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    }
    loop.stop();
    vi.useRealTimers();

    // setInterval at 300ms where detection takes 400ms does not give three
    // analyses a second; it gives an unbounded queue and a hot phone.
    expect(overlapped).toBe(false);
  });

  it('keeps going frame after frame', async () => {
    vi.useFakeTimers();
    const onFrame = vi.fn(async () => {});
    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame });

    loop.start();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
    loop.stop();
    vi.useRealTimers();

    expect(onFrame.mock.calls.length).toBeGreaterThan(1);
  });

  it('costs a tick rather than a special case when no frame is ready', async () => {
    vi.useFakeTimers();
    const onFrame = vi.fn(async () => {});
    const loop = createFrameLoop({
      intervalMs: INTERVAL_MS,
      grab: () => undefined,
      onFrame,
    });

    loop.start();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);
    loop.stop();
    vi.useRealTimers();

    expect(onFrame).not.toHaveBeenCalled();
  });

  it('reports an analysis failure without stopping', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const onFrame = vi.fn(async () => {
      throw new Error('detector timed out');
    });

    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame, onError });
    loop.start();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);
    loop.stop();
    vi.useRealTimers();

    // A frozen preview leaves the last instruction on screen, and the reader
    // follows advice about a picture from ten seconds ago.
    expect(onError).toHaveBeenCalled();
    expect(onFrame.mock.calls.length).toBeGreaterThan(1);
  });

  it('survives a failure with no error handler attached', async () => {
    const loop = createFrameLoop({
      intervalMs: INTERVAL_MS,
      grab: frame,
      onFrame: async () => {
        throw new Error('detector timed out');
      },
    });

    loop.start();
    await settle();
    loop.stop();

    expect(loop.isRunning()).toBe(false);
  });

  it('reports a grab that threw, rather than dying inside the timer', async () => {
    const onError = vi.fn();
    const loop = createFrameLoop({
      intervalMs: INTERVAL_MS,
      grab: () => {
        throw new Error('canvas went away');
      },
      onFrame: async () => {},
      onError,
    });

    loop.start();
    await settle();
    loop.stop();

    expect(onError).toHaveBeenCalled();
  });

  it('starts only once, however many times start is called', async () => {
    const onFrame = vi.fn(async () => {});
    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame });

    loop.start();
    loop.start();
    await settle();
    loop.stop();

    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  it('stops scheduling once stopped', async () => {
    vi.useFakeTimers();
    const onFrame = vi.fn(async () => {});
    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame });

    loop.start();
    await vi.advanceTimersByTimeAsync(0);
    loop.stop();
    const callsAtStop = onFrame.mock.calls.length;
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
    vi.useRealTimers();

    expect(onFrame.mock.calls.length).toBe(callsAtStop);
  });

  it('does not schedule another run when stopped mid-analysis', async () => {
    vi.useFakeTimers();
    const onFrame = vi.fn(async () => {
      await Promise.resolve();
    });
    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame });

    loop.start();
    // Stopped while the very first analysis is still in flight — the path
    // that would otherwise keep the detector running after the camera is off.
    loop.stop();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
    vi.useRealTimers();

    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  it('can be stopped before it ever started', () => {
    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame: async () => {} });

    expect(() => {
      loop.stop();
    }).not.toThrow();
  });

  it('can be restarted', async () => {
    const onFrame = vi.fn(async () => {});
    const loop = createFrameLoop({ intervalMs: INTERVAL_MS, grab: frame, onFrame });

    loop.start();
    await settle();
    loop.stop();
    loop.start();
    await settle();
    loop.stop();

    expect(onFrame).toHaveBeenCalledTimes(2);
  });

  it('uses injected timers when given them', async () => {
    const setTimeoutFn = vi.fn(globalThis.setTimeout);
    const clearTimeoutFn = vi.fn(globalThis.clearTimeout);
    const loop = createFrameLoop({
      intervalMs: INTERVAL_MS,
      grab: frame,
      onFrame: async () => {},
      setTimeoutFn: setTimeoutFn as unknown as typeof setTimeout,
      clearTimeoutFn: clearTimeoutFn as unknown as typeof clearTimeout,
    });

    loop.start();
    await settle();
    loop.stop();

    expect(setTimeoutFn).toHaveBeenCalled();
    expect(clearTimeoutFn).toHaveBeenCalled();
  });
});
