import { describe, expect, it, vi } from 'vitest';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { SYNTHETIC_HEAD_FIXTURES } from '@/testing/fixtures/synthetic-head.constants';
import { startAnalysisWorker } from './analysis-worker.bootstrap';
import { createFakeDetector } from './fake-detector';
import type { WorkerRequest, WorkerResponse } from './analysis-protocol.types';
import type { WorkerScope } from './analysis-client.types';

const payload = { buffer: generateSyntheticHead(SYNTHETIC_HEAD_FIXTURES[0]!.spec) };

const fakeScope = (): {
  readonly scope: WorkerScope;
  readonly send: (request: WorkerRequest) => void;
  readonly sent: WorkerResponse[];
} => {
  const sent: WorkerResponse[] = [];
  let listener: ((event: { data: WorkerRequest }) => void) | undefined;

  return {
    scope: {
      postMessage: (response) => sent.push(response),
      addEventListener: (_type, handler) => {
        listener = handler;
      },
    },
    send: (request) => listener?.({ data: request }),
    sent,
  };
};

const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0); });

describe('startAnalysisWorker', () => {
  it('answers a request posted into the scope', async () => {
    const harness = fakeScope();
    startAnalysisWorker(harness.scope, createFakeDetector());

    harness.send({ kind: 'analyse', id: '1', payload });
    await flush();

    expect(harness.sent.at(-1)?.kind).toBe('result');
  });

  it('acknowledges a cancellation posted into the scope', () => {
    const harness = fakeScope();
    startAnalysisWorker(harness.scope, createFakeDetector());

    harness.send({ kind: 'cancel', id: '1' });

    expect(harness.sent).toEqual([{ kind: 'cancelled', id: '1' }]);
  });

  it('subscribes to messages rather than polling', () => {
    const addEventListener = vi.fn();
    startAnalysisWorker({ postMessage: vi.fn(), addEventListener }, createFakeDetector());

    expect(addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
