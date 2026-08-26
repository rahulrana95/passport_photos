import { describe, expect, it, vi } from 'vitest';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { SYNTHETIC_HEAD_FIXTURES } from '@/testing/fixtures/synthetic-head.constants';
import { createFakeDetector } from './fake-detector';
import { createFakeWorker } from './fake-worker';
import type { WorkerResponse } from './analysis-protocol.types';

const payload = { buffer: generateSyntheticHead(SYNTHETIC_HEAD_FIXTURES[0]!.spec) };
const detector = createFakeDetector();

const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0); });

describe('the fake worker stands in for a real one', () => {
  it('delivers responses to a registered message listener', async () => {
    const seen: WorkerResponse[] = [];
    const worker = createFakeWorker({ detector });
    worker.addEventListener('message', (event: { data: WorkerResponse }) => {
      seen.push(event.data);
    });

    worker.postMessage({ kind: 'analyse', id: '1', payload });
    await flush();

    expect(seen.at(-1)?.kind).toBe('result');
  });

  it('stops delivering to a listener that was removed', async () => {
    const listener = vi.fn();
    const worker = createFakeWorker({ detector });
    worker.addEventListener('message', listener);
    worker.removeEventListener('message', listener);

    worker.postMessage({ kind: 'analyse', id: '1', payload });
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops delivering to an error listener that was removed', () => {
    const listener = vi.fn();
    const worker = createFakeWorker({ detector, crashOnNextMessage: true });
    worker.addEventListener('error', listener);
    worker.removeEventListener('error', listener);

    worker.postMessage({ kind: 'analyse', id: '1', payload });

    expect(listener).not.toHaveBeenCalled();
  });

  it('reproduces a browser that blocks worker construction', () => {
    expect(() => createFakeWorker({ detector, failToStart: true })).toThrow();
  });

  it('reproduces a crash by firing an error event instead of responding', () => {
    const onError = vi.fn();
    const onMessage = vi.fn();
    const worker = createFakeWorker({ detector, crashOnNextMessage: true });
    worker.addEventListener('error', onError);
    worker.addEventListener('message', onMessage);

    worker.postMessage({ kind: 'analyse', id: '1', payload });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('reproduces a hung worker by swallowing the message', async () => {
    const listener = vi.fn();
    const worker = createFakeWorker({ detector, neverRespond: true });
    worker.addEventListener('message', listener);

    worker.postMessage({ kind: 'analyse', id: '1', payload });
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('goes silent once terminated', async () => {
    const listener = vi.fn();
    const worker = createFakeWorker({ detector });
    worker.addEventListener('message', listener);
    worker.terminate();

    worker.postMessage({ kind: 'analyse', id: '1', payload });
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('emits nothing further once terminated mid-task', async () => {
    // A task already in flight when the worker is terminated must not go on
    // reaching a listener that has gone away. The early stages report
    // synchronously, so the claim is that nothing arrives after terminate —
    // not that nothing arrived at all.
    const listener = vi.fn();
    const worker = createFakeWorker({ detector });
    worker.addEventListener('message', listener);

    worker.postMessage({ kind: 'analyse', id: '1', payload });
    worker.terminate();
    const deliveredBeforeTerminate = listener.mock.calls.length;
    await flush();

    expect(listener).toHaveBeenCalledTimes(deliveredBeforeTerminate);
    expect(listener.mock.calls.some(([event]) => event.data.kind === 'result')).toBe(false);
  });
});
