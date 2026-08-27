import { ANALYSIS_WORKER_PATH } from './analysis-worker.constants';
import { AnalysisError } from './analysis-error.utils';
import type { WorkerLike } from './analysis-client.types';

/**
 * Constructs the real analysis worker.
 *
 * Loaded from a path rather than from `new URL('./analysis.worker.ts',
 * import.meta.url)`, because Turbopack does not compile that form — see
 * analysis-worker.constants.ts for what it does instead.
 *
 * A CLASSIC WORKER, DELIBERATELY. `{ type: 'module' }` is the modern default
 * and it breaks MediaPipe. Its WASM runtime arrives as a classic script that
 * declares `var ModuleFactory` at the top level and expects to find it on the
 * global afterwards; inside a module worker that declaration is module-scoped,
 * the global stays empty, and the detector fails with "ModuleFactory not set"
 * after downloading twelve megabytes. Classic it is, which is also why the
 * build emits an IIFE with nothing left to import at runtime.
 */
export const createBrowserWorker = (): WorkerLike => {
  if (typeof Worker === 'undefined') {
    throw new AnalysisError(
      'worker-unavailable',
      'This browser blocked the analysis engine from starting. Checks cannot run here.',
    );
  }

  return new Worker(ANALYSIS_WORKER_PATH);
};
