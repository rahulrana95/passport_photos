import type { AnalysisStage, WorkerRequest, WorkerResponse } from './analysis-protocol.types';

/**
 * The subset of Worker this client depends on.
 *
 * Narrowed to an interface so a deterministic fake can be injected in tests —
 * jsdom has no Worker, and a real one would make every test that touches
 * analysis slow and flaky.
 */
export interface WorkerLike {
  postMessage(message: WorkerRequest, transfer?: readonly Transferable[]): void;
  terminate(): void;
  addEventListener(type: 'message', listener: (event: { data: WorkerResponse }) => void): void;
  addEventListener(type: 'error', listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: never) => void): void;
}

export interface AnalyseOptions {
  readonly onProgress?: (stage: AnalysisStage, ratio: number) => void;
  readonly signal?: AbortSignal;
}

export interface AnalysisClientOptions {
  /** Called lazily, on first use, so no worker or model bytes load at first paint. */
  readonly createWorker: () => WorkerLike;
  readonly timeoutMs?: number;
  /** Injected so tests control time rather than waiting for it. */
  readonly setTimeoutFn?: typeof setTimeout;
  readonly clearTimeoutFn?: typeof clearTimeout;
}

/**
 * The subset of a worker's global scope this application uses.
 *
 * Declared rather than pulled from `lib.webworker`, which cannot be enabled
 * alongside the DOM lib without redefining half the globals. Narrow by design:
 * the bootstrap needs exactly these two members.
 */
export interface WorkerScope {
  readonly postMessage: (response: WorkerResponse) => void;
  readonly addEventListener: (
    type: 'message',
    listener: (event: { readonly data: WorkerRequest }) => void,
  ) => void;
}

/** The global object a worker is constructed from, when the browser allows it. */
export interface WorkerCapableScope {
  readonly Worker?: new (url: URL | string, options?: { readonly type?: 'module' }) => WorkerLike;
}
