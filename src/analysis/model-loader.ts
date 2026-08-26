import { MODEL_LOAD_TIMEOUT_MS } from '@/constants/limits.constants';
import { MODEL_CACHE_NAME } from './model-source.constants';
import { AnalysisError } from './analysis-error.utils';
import type { ModelCacheLike, ModelLoaderOptions } from './model-loader.types';

const RATIO_COMPLETE = 1;
const NO_BYTES = 0;

/**
 * Loads a model asset, preferring a cached copy.
 *
 * Persistence is what makes this product usable more than once: the first
 * check pays roughly 6.75 MB gzipped, and every check after it pays nothing.
 * That is the difference between a tool someone uses and a tool someone tries.
 *
 * Concurrent loads of the same URL share one request. A double-click on the
 * dropzone would otherwise start two 12 MB downloads, and on the connection
 * where that matters most it is the difference between slow and unusable.
 */
export const createModelLoader = (
  options: ModelLoaderOptions,
): {
  readonly load: (url: string, expectedBytes: number) => Promise<ArrayBuffer>;
} => {
  const timeoutMs = options.timeoutMs ?? MODEL_LOAD_TIMEOUT_MS;
  const scheduleTimeout = options.setTimeoutFn ?? setTimeout;
  const cancelTimeout = options.clearTimeoutFn ?? clearTimeout;
  const cacheName = options.cacheName ?? MODEL_CACHE_NAME;

  const inFlight = new Map<string, Promise<ArrayBuffer>>();

  /**
   * The Cache API is present and throws in some private-browsing modes, so
   * every call is guarded. A browser that refuses to persist is a slower
   * experience, never a broken one.
   */
  const openCache = async (): Promise<ModelCacheLike | undefined> => {
    if (options.caches === undefined) return undefined;

    try {
      return await options.caches.open(cacheName);
    } catch {
      return undefined;
    }
  };

  const readFromCache = async (url: string): Promise<ArrayBuffer | undefined> => {
    const cache = await openCache();
    if (cache === undefined) return undefined;

    try {
      const cached = await cache.match(url);
      if (cached === undefined) return undefined;
      return await cached.arrayBuffer();
    } catch {
      return undefined;
    }
  };

  const writeToCache = async (url: string, response: Response): Promise<void> => {
    const cache = await openCache();
    if (cache === undefined) return;

    try {
      await cache.put(url, response);
    } catch {
      // Quota exceeded, or a private mode that accepts open() and rejects
      // put(). Neither is worth failing a load that has already succeeded.
    }
  };

  const download = async (url: string, expectedBytes: number): Promise<ArrayBuffer> => {
    const controller = new AbortController();
    const timeout = scheduleTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await options.fetchFn(url, { signal: controller.signal });

      if (!response.ok) {
        throw new AnalysisError(
          'detector-unavailable',
          'The face-detection model could not be downloaded. Check your connection and try again.',
        );
      }

      // Cloned before reading: a Response body can be consumed once, and the
      // cache needs its own copy of the same bytes.
      const forCache = response.clone();
      const buffer = await response.arrayBuffer();

      if (buffer.byteLength !== expectedBytes) {
        // A truncated model loads and then produces silently wrong landmarks,
        // which is far worse than failing here.
        throw new AnalysisError(
          'detector-unavailable',
          'The face-detection model downloaded incompletely. Try again.',
        );
      }

      options.onProgress?.({
        loadedBytes: buffer.byteLength,
        totalBytes: expectedBytes,
        ratio: RATIO_COMPLETE,
      });

      await writeToCache(url, forCache);
      return buffer;
    } catch (error) {
      if (error instanceof AnalysisError) throw error;

      throw new AnalysisError(
        'detector-unavailable',
        'The face-detection model could not be downloaded. Check your connection and try again.',
      );
    } finally {
      cancelTimeout(timeout);
    }
  };

  const load = async (url: string, expectedBytes: number): Promise<ArrayBuffer> => {
    const cached = await readFromCache(url);
    if (cached !== undefined) {
      options.onProgress?.({
        loadedBytes: cached.byteLength,
        totalBytes: cached.byteLength,
        ratio: RATIO_COMPLETE,
      });
      return cached;
    }

    const existing = inFlight.get(url);
    if (existing !== undefined) return existing;

    options.onProgress?.({ loadedBytes: NO_BYTES, totalBytes: expectedBytes, ratio: NO_BYTES });

    const request = download(url, expectedBytes).finally(() => {
      // Cleared on both paths. Leaving a rejected promise in the map would
      // make one failed download permanent for the life of the page.
      inFlight.delete(url);
    });

    inFlight.set(url, request);
    return request;
  };

  return { load };
};
