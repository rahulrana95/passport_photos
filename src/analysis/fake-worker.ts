import { createRequestHandler } from './analysis-worker.handlers';
import type { Detector, WorkerRequest, WorkerResponse } from './analysis-protocol.types';
import type { WorkerLike } from './analysis-client.types';

export interface FakeWorkerOptions {
  readonly detector: Detector;
  /** Throws on construction, reproducing a browser that blocks workers. */
  readonly failToStart?: boolean;
  /** Fires an error event on the next message, reproducing a crash mid-task. */
  readonly crashOnNextMessage?: boolean;
  /** Swallows messages, reproducing a hung worker so the timeout can be tested. */
  readonly neverRespond?: boolean;
}

/**
 * An in-memory stand-in for a real Worker.
 *
 * jsdom has no Worker at all, and a real one would make every test that touches
 * analysis slow and flaky. This runs the same handler the real worker runs, so
 * the protocol is exercised end to end without a thread.
 */
export const createFakeWorker = (options: FakeWorkerOptions): WorkerLike => {
  if (options.failToStart === true) throw new Error('Worker construction blocked');

  const messageListeners = new Set<(event: { data: WorkerResponse }) => void>();
  const errorListeners = new Set<(event: unknown) => void>();
  let terminated = false;

  const emit = (response: WorkerResponse): void => {
    if (terminated) return;
    for (const listener of messageListeners) listener({ data: response });
  };

  const handle = createRequestHandler(options.detector, emit);

  return {
    postMessage(message: WorkerRequest): void {
      if (terminated || options.neverRespond === true) return;

      if (options.crashOnNextMessage === true) {
        for (const listener of errorListeners) listener(new Error('Worker crashed'));
        return;
      }
      void handle(message);
    },
    terminate(): void {
      terminated = true;
      messageListeners.clear();
      errorListeners.clear();
    },
    addEventListener(type: 'message' | 'error', listener: (event: never) => void): void {
      if (type === 'message') {
        messageListeners.add(listener as unknown as (event: { data: WorkerResponse }) => void);
      } else {
        errorListeners.add(listener as unknown as (event: unknown) => void);
      }
    },
    removeEventListener(_type: string, listener: (event: never) => void): void {
      // Removed from both sets: the listener identity is unique either way, and
      // branching on the type here would add a case with nothing behind it.
      messageListeners.delete(listener as unknown as (event: { data: WorkerResponse }) => void);
      errorListeners.delete(listener as unknown as (event: unknown) => void);
    },
  } as WorkerLike;
};
