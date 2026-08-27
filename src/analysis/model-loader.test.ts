import { describe, expect, it, vi } from 'vitest';
import { createModelLoader } from './model-loader';
import type {
  ModelCacheLike,
  ModelCacheStorageLike,
  ModelLoadProgress,
} from './model-loader.types';

const MODEL_URL = '/models/face_landmarker.task';
const SIZE = 64;

const okResponse = (byteLength: number): Response =>
  new Response(new Uint8Array(byteLength).fill(7).buffer, { status: 200 });

const memoryCache = (): { storage: ModelCacheStorageLike; entries: Map<string, Response> } => {
  const entries = new Map<string, Response>();
  const cache: ModelCacheLike = {
    match: (request) => Promise.resolve(entries.get(request)?.clone()),
    put: (request, response) => {
      entries.set(request, response);
      return Promise.resolve();
    },
  };

  return { storage: { open: () => Promise.resolve(cache) }, entries };
};

describe('a first load', () => {
  it('downloads the asset and returns its bytes', async () => {
    const loader = createModelLoader({ fetchFn: () => Promise.resolve(okResponse(SIZE)) });

    const buffer = await loader.load(MODEL_URL, SIZE);

    expect(buffer.byteLength).toBe(SIZE);
  });

  it('reports progress from zero to complete', async () => {
    // A spinner is not enough for a download this size. The user needs to see
    // that something is happening and roughly how much is left.
    const seen: ModelLoadProgress[] = [];
    const loader = createModelLoader({
      fetchFn: () => Promise.resolve(okResponse(SIZE)),
      onProgress: (progress) => seen.push(progress),
    });

    await loader.load(MODEL_URL, SIZE);

    expect(seen[0]?.ratio).toBe(0);
    expect(seen.at(-1)?.ratio).toBe(1);
    expect(seen.at(-1)?.loadedBytes).toBe(SIZE);
  });

  it('stores the asset for next time', async () => {
    const { storage, entries } = memoryCache();
    const loader = createModelLoader({
      fetchFn: () => Promise.resolve(okResponse(SIZE)),
      caches: storage,
    });

    await loader.load(MODEL_URL, SIZE);

    expect(entries.has(MODEL_URL)).toBe(true);
  });
});

describe('a cached load', () => {
  it('returns the cached copy without touching the network', async () => {
    // This is what makes the product usable more than once: the first check
    // pays roughly 6.75 MB gzipped and every check after it pays nothing.
    const { storage } = memoryCache();
    const fetchFn = vi.fn(() => Promise.resolve(okResponse(SIZE)));
    const loader = createModelLoader({ fetchFn, caches: storage });

    await loader.load(MODEL_URL, SIZE);
    fetchFn.mockClear();
    const second = await loader.load(MODEL_URL, SIZE);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(second.byteLength).toBe(SIZE);
  });

  it('still reports completion, so the UI is not left waiting', async () => {
    const { storage } = memoryCache();
    const seen: ModelLoadProgress[] = [];
    const loader = createModelLoader({
      fetchFn: () => Promise.resolve(okResponse(SIZE)),
      caches: storage,
    });

    await loader.load(MODEL_URL, SIZE);

    const cachedLoader = createModelLoader({
      fetchFn: () => Promise.resolve(okResponse(SIZE)),
      caches: storage,
      onProgress: (progress) => seen.push(progress),
    });
    await cachedLoader.load(MODEL_URL, SIZE);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.ratio).toBe(1);
  });
});

describe('browsers that will not persist', () => {
  it('works with no Cache API at all', async () => {
    const loader = createModelLoader({ fetchFn: () => Promise.resolve(okResponse(SIZE)) });

    await expect(loader.load(MODEL_URL, SIZE)).resolves.toBeDefined();
  });

  it('works when opening the cache throws, as private browsing does', async () => {
    // The API is present and every call rejects. A browser that refuses to
    // persist is a slower experience, never a broken one.
    const loader = createModelLoader({
      fetchFn: () => Promise.resolve(okResponse(SIZE)),
      caches: { open: () => Promise.reject(new Error('SecurityError')) },
    });

    await expect(loader.load(MODEL_URL, SIZE)).resolves.toBeDefined();
  });

  it('works when reading from the cache throws', async () => {
    const loader = createModelLoader({
      fetchFn: () => Promise.resolve(okResponse(SIZE)),
      caches: {
        open: () =>
          Promise.resolve({
            match: () => Promise.reject(new Error('read failed')),
            put: () => Promise.resolve(),
          }),
      },
    });

    await expect(loader.load(MODEL_URL, SIZE)).resolves.toBeDefined();
  });

  it('succeeds even when writing to the cache fails on quota', async () => {
    const loader = createModelLoader({
      fetchFn: () => Promise.resolve(okResponse(SIZE)),
      caches: {
        open: () =>
          Promise.resolve({
            match: () => Promise.resolve(undefined),
            put: () => Promise.reject(new Error('QuotaExceededError')),
          }),
      },
    });

    await expect(loader.load(MODEL_URL, SIZE)).resolves.toBeDefined();
  });
});

describe('failures', () => {
  it('reports a download that returns an error status', async () => {
    const loader = createModelLoader({
      fetchFn: () => Promise.resolve(new Response('', { status: 503 })),
    });

    await expect(loader.load(MODEL_URL, SIZE)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
  });

  it('reports a network failure, which is what offline looks like', async () => {
    const loader = createModelLoader({ fetchFn: () => Promise.reject(new Error('offline')) });

    await expect(loader.load(MODEL_URL, SIZE)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
  });

  it('refuses a truncated model rather than loading it', async () => {
    // A short model loads and then produces silently wrong landmarks, which is
    // far worse than failing here.
    const loader = createModelLoader({ fetchFn: () => Promise.resolve(okResponse(SIZE - 1)) });

    await expect(loader.load(MODEL_URL, SIZE)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
  });

  it('aborts a download that exceeds the timeout', async () => {
    const abort = vi.fn();
    const loader = createModelLoader({
      fetchFn: (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          const stop = (): void => {
            abort();
            reject(new Error('aborted'));
          };

          // Both orderings. A synchronous fake timer aborts before fetch is
          // even called, and a real one aborts while it is in flight; the
          // loader must surface a typed failure either way.
          if (signal?.aborted === true) stop();
          else signal?.addEventListener('abort', stop);
        }),
      timeoutMs: 10,
      setTimeoutFn: ((callback: () => void) => {
        callback();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }) as unknown as typeof setTimeout,
      clearTimeoutFn: (() => undefined) as unknown as typeof clearTimeout,
    });

    await expect(loader.load(MODEL_URL, SIZE)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
    expect(abort).toHaveBeenCalled();
  });

  it('lets a retry succeed after a failure', async () => {
    // The in-flight entry must be cleared on rejection too. Leaving it would
    // make one failed download permanent for the life of the page.
    let attempt = 0;
    const loader = createModelLoader({
      fetchFn: () => {
        attempt += 1;
        return attempt === 1
          ? Promise.reject(new Error('offline'))
          : Promise.resolve(okResponse(SIZE));
      },
    });

    await expect(loader.load(MODEL_URL, SIZE)).rejects.toBeDefined();

    await expect(loader.load(MODEL_URL, SIZE)).resolves.toBeDefined();
  });
});

describe('concurrent loads', () => {
  it('shares one request between two callers', async () => {
    // A double-click on the dropzone would otherwise start two 12 MB
    // downloads, and on the connection where that matters most it is the
    // difference between slow and unusable.
    const fetchFn = vi.fn(() => Promise.resolve(okResponse(SIZE)));
    const loader = createModelLoader({ fetchFn });

    const [first, second] = await Promise.all([
      loader.load(MODEL_URL, SIZE),
      loader.load(MODEL_URL, SIZE),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(first.byteLength).toBe(SIZE);
    expect(second.byteLength).toBe(SIZE);
  });

  it('does not share between different assets', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(okResponse(SIZE)));
    const loader = createModelLoader({ fetchFn });

    await Promise.all([loader.load(MODEL_URL, SIZE), loader.load('/models/other.task', SIZE)]);

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('fails both callers when the shared request fails', async () => {
    const loader = createModelLoader({ fetchFn: () => Promise.reject(new Error('offline')) });

    const results = await Promise.allSettled([
      loader.load(MODEL_URL, SIZE),
      loader.load(MODEL_URL, SIZE),
    ]);

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
  });
});
