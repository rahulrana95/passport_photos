import { WORKER_TASK_TIMEOUT_MS } from '@/constants/limits.constants';
import { AnalysisError, deserialiseError } from './analysis-error.utils';
import type {
  AnalysisRequestPayload,
  AnalysisResult,
  WorkerResponse,
} from './analysis-protocol.types';
import type { AnalyseOptions, AnalysisClientOptions, WorkerLike } from './analysis-client.types';

interface PendingRequest {
  readonly resolve: (result: AnalysisResult) => void;
  readonly reject: (error: AnalysisError) => void;
  readonly onProgress: AnalyseOptions['onProgress'];
  readonly timeoutHandle: ReturnType<typeof setTimeout>;
  settled: boolean;
}

export interface AnalysisClient {
  readonly analyse: (
    payload: AnalysisRequestPayload,
    options?: AnalyseOptions,
  ) => Promise<AnalysisResult>;
  readonly dispose: () => void;
}

/**
 * Owns the worker's lifecycle and correlates requests with responses.
 *
 * The worker is created lazily on first use. That is a hard requirement rather
 * than an optimisation: the analysis models are several megabytes, and loading
 * them at first paint would wreck the LCP budget on every one of the country
 * pages that carry our search traffic.
 */
export const createAnalysisClient = (options: AnalysisClientOptions): AnalysisClient => {
  const timeoutMs = options.timeoutMs ?? WORKER_TASK_TIMEOUT_MS;
  const scheduleTimeout = options.setTimeoutFn ?? setTimeout;
  const cancelTimeout = options.clearTimeoutFn ?? clearTimeout;

  const pending = new Map<string, PendingRequest>();
  let worker: WorkerLike | undefined;
  let detachWorker: (() => void) | undefined;
  let nextId = 0;
  let disposed = false;

  /** Every pending request is settled exactly once, whatever path gets there. */
  const settle = (id: string, action: (request: PendingRequest) => void): void => {
    const request = pending.get(id);
    if (request === undefined || request.settled) return;

    request.settled = true;
    cancelTimeout(request.timeoutHandle);
    pending.delete(id);
    action(request);
  };

  const failAll = (error: AnalysisError): void => {
    for (const id of [...pending.keys()]) settle(id, (request) => { request.reject(error); });
  };

  const handleMessage = (event: { data: WorkerResponse }): void => {
    const response = event.data;

    if (response.kind === 'progress') {
      // Progress does not settle, so it is read rather than settled. A response
      // for an unknown id is a superseded request and is dropped silently.
      pending.get(response.id)?.onProgress?.(response.stage, response.ratio);
      return;
    }
    if (response.kind === 'result') {
      settle(response.id, (request) => { request.resolve(response.payload); });
      return;
    }
    if (response.kind === 'error') {
      settle(response.id, (request) => { request.reject(deserialiseError(response.error)); });
      return;
    }
    settle(response.id, (request) => {
      request.reject(new AnalysisError('cancelled', 'Analysis was cancelled.'));
    });
  };

  const ensureWorker = (): WorkerLike => {
    if (worker !== undefined) return worker;

    try {
      const created = options.createWorker();

      // Detaching matters as much as terminating: a worker we have given up on
      // but stayed subscribed to could still settle a request belonging to its
      // replacement.
      const detach = (): void => {
        created.removeEventListener('message', handleMessage);
        created.removeEventListener('error', handleError);
      };

      function handleError(): void {
        // A crashed worker cannot be reused. Every in-flight request is failed
        // and the instance dropped, so the next call builds a fresh one rather
        // than posting into a dead thread and hanging forever.
        detach();
        worker = undefined;
        detachWorker = undefined;
        failAll(new AnalysisError('worker-crashed', 'The analysis engine stopped unexpectedly.'));
      }

      created.addEventListener('message', handleMessage);
      created.addEventListener('error', handleError);
      worker = created;
      detachWorker = detach;
      return created;
    } catch {
      throw new AnalysisError(
        'worker-unavailable',
        'This browser blocked the analysis engine from starting. Checks cannot run here.',
      );
    }
  };

  const analyse = async (
    payload: AnalysisRequestPayload,
    analyseOptions: AnalyseOptions = {},
  ): Promise<AnalysisResult> => {
    if (disposed) {
      throw new AnalysisError('worker-unavailable', 'This analysis client has been disposed.');
    }

    const active = ensureWorker();
    const id = String(nextId);
    nextId += 1;

    return new Promise<AnalysisResult>((resolve, reject) => {
      // Armed before the request is registered so that every pending entry has
      // a live timeout from the moment it becomes settleable — there is no
      // window in which a request could be settled without one to clear.
      const timeoutHandle = scheduleTimeout(() => {
        settle(id, (found) => {
          found.reject(
            new AnalysisError('timeout', 'The check took too long and was stopped. Try again.'),
          );
        });
        active.postMessage({ kind: 'cancel', id });
      }, timeoutMs);

      pending.set(id, {
        resolve,
        reject,
        onProgress: analyseOptions.onProgress,
        timeoutHandle,
        settled: false,
      });

      analyseOptions.signal?.addEventListener('abort', () => {
        settle(id, (found) => {
          found.reject(new AnalysisError('cancelled', 'Analysis was cancelled.'));
        });
        active.postMessage({ kind: 'cancel', id });
      });

      active.postMessage({ kind: 'analyse', id, payload });
    });
  };

  const dispose = (): void => {
    disposed = true;
    failAll(new AnalysisError('cancelled', 'Analysis was cancelled.'));
    detachWorker?.();
    worker?.terminate();
    detachWorker = undefined;
    worker = undefined;
  };

  return { analyse, dispose };
};
