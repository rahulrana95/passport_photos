export interface ModelLoadProgress {
  readonly loadedBytes: number;
  /** Total for the whole load, not just this asset. Zero when unknown. */
  readonly totalBytes: number;
  readonly ratio: number;
}

/**
 * The narrow slice of the Cache API this loader uses.
 *
 * Narrowed to an interface so a fake can be injected, and so the private-mode
 * failure — where `caches` exists and every call throws — is reachable in a
 * test rather than only on a reviewer's phone.
 */
export interface ModelCacheLike {
  readonly match: (request: string) => Promise<Response | undefined>;
  readonly put: (request: string, response: Response) => Promise<void>;
}

export interface ModelCacheStorageLike {
  readonly open: (cacheName: string) => Promise<ModelCacheLike>;
}

export type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export interface ModelLoaderOptions {
  readonly fetchFn: FetchLike;
  /** Omit to run without persistence, which is what private browsing gives us. */
  readonly caches?: ModelCacheStorageLike;
  readonly cacheName?: string;
  readonly timeoutMs?: number;
  readonly onProgress?: (progress: ModelLoadProgress) => void;
  readonly setTimeoutFn?: typeof setTimeout;
  readonly clearTimeoutFn?: typeof clearTimeout;
}
