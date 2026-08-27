import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserWorker } from './analysis-worker.factory';
import { ANALYSIS_WORKER_PATH } from './analysis-worker.constants';
import type { WorkerLike } from './analysis-client.types';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBrowserWorker', () => {
  it('reports a browser with no Worker rather than throwing something opaque', () => {
    // Locked-down enterprise browsers and some private modes remove it. The
    // user needs to be told the check cannot run here, not shown a TypeError.
    // jsdom has no Worker either, so this is the unstubbed default.
    expect(() => createBrowserWorker()).toThrow(
      expect.objectContaining({ code: 'worker-unavailable' }),
    );
  });

  it('constructs a classic worker from the path the build writes to', () => {
    // Not a module worker: MediaPipe's WASM runtime is a classic script whose
    // top-level `var ModuleFactory` never reaches the global inside a module,
    // and the detector then fails after a twelve megabyte download. Asserted
    // because the module form is the one someone will reach for next.
    const calls: { url: URL | string; options: { type?: 'module' } | undefined }[] = [];

    class RecordingWorker {
      constructor(url: URL | string, options?: { type?: 'module' }) {
        calls.push({ url, options });
      }
    }

    vi.stubGlobal('Worker', RecordingWorker);
    const created: WorkerLike = createBrowserWorker();

    expect(created).toBeInstanceOf(RecordingWorker);
    expect(calls[0]?.url).toBe(ANALYSIS_WORKER_PATH);
    expect(calls[0]?.options).toBeUndefined();
  });
});
