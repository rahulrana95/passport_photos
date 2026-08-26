import { describe, expect, it } from 'vitest';
import { createBrowserWorker } from './analysis-worker.factory';
import type { WorkerCapableScope, WorkerLike } from './analysis-client.types';

describe('createBrowserWorker', () => {
  it('reports a browser with no Worker rather than throwing something opaque', () => {
    // Locked-down enterprise browsers and some private modes remove it. The
    // user needs to be told the check cannot run here, not shown a TypeError.
    expect(() => createBrowserWorker({})).toThrow(
      expect.objectContaining({ code: 'worker-unavailable' }),
    );
  });

  it('constructs the worker as an ES module from a bundler-visible URL', () => {
    // The URL form is what makes the bundler emit a separate chunk, which is
    // what keeps the models out of the first-paint bundle. A plain string path
    // would be bundled into the main entry instead, silently.
    const calls: { url: URL | string; options: { type?: 'module' } | undefined }[] = [];

    class RecordingWorker {
      constructor(url: URL | string, options?: { type?: 'module' }) {
        calls.push({ url, options });
      }
    }

    const scope = { Worker: RecordingWorker } as unknown as WorkerCapableScope;
    const created: WorkerLike = createBrowserWorker(scope);

    expect(created).toBeInstanceOf(RecordingWorker);
    expect(calls[0]?.options).toEqual({ type: 'module' });
    expect(calls[0]?.url).toBeInstanceOf(URL);
    expect(String(calls[0]?.url)).toContain('analysis.worker');
  });
});
