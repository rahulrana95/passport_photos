#!/usr/bin/env node
/**
 * Compiles the analysis worker into public/workers before a build or a dev run.
 *
 * WHY THIS EXISTS AT ALL
 * Every bundler is supposed to detect `new Worker(new URL('./x.ts',
 * import.meta.url))` and compile the target as its own entry point. Turbopack
 * does not: it resolves the URL as a static asset and copies the TypeScript
 * file out verbatim, so the browser is served a .ts file it cannot parse and
 * the worker dies before running a line. The build succeeds either way, which
 * is what makes it dangerous — the only symptom is a checker that tells the
 * user the checks stopped unexpectedly, in production.
 *
 * Owning the worker build removes the guesswork. The entry point, the output
 * path and the module format are declared here, and the path is read from the
 * same constants file the application imports, so the path the build writes and
 * the path the browser requests cannot drift apart.
 *
 * WHY AN IIFE AND NOT AN ES MODULE
 * The worker is constructed as a classic worker, because MediaPipe's WASM
 * runtime is a classic script that declares `var ModuleFactory` and expects to
 * read it back off the global — module scope swallows that and the detector
 * fails with "ModuleFactory not set". A classic worker cannot use a dynamic
 * import, so the MediaPipe wrapper is inlined rather than split out. Nothing is
 * lost by that: the worker is only ever constructed once a photo is chosen, and
 * it builds a detector immediately, so a second request would defer nothing.
 * The 15 MB of models and WASM runtime are not in this bundle at all — they are
 * fetched from /models at detector startup and cached there.
 *
 * Output is gitignored — it is reproducible from the source and the lockfile.
 */

import { build } from 'esbuild';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(ROOT, 'src', 'analysis', 'analysis.worker.ts');

// Read from the constants file rather than duplicated here, so the path the
// build writes and the one the application requests can never disagree.
const CONSTANTS = join(ROOT, 'src', 'analysis', 'analysis-worker.constants.ts');

const readWorkerPath = async () => {
  const source = await readFile(CONSTANTS, 'utf8');
  const match = /ANALYSIS_WORKER_PATH\s*=\s*'([^']+)'/.exec(source);

  if (match?.[1] === undefined) {
    throw new Error(`Could not read ANALYSIS_WORKER_PATH from ${CONSTANTS}`);
  }

  return match[1];
};

/**
 * Matches the browsers Next targets, and no older: the worker parses on the
 * same engines the application already requires, and downlevelling further
 * would only make the bundle bigger for browsers that never load it.
 */
const BYTES_PER_KB = 1024;

const BROWSER_TARGETS = ['chrome111', 'edge111', 'firefox111', 'safari16.4'];

const main = async () => {
  const workerPath = await readWorkerPath();
  const outputDir = join(ROOT, 'public', dirname(workerPath).replace(/^\//, ''));
  const outputFile = join(outputDir, workerPath.split('/').pop());

  // Cleared rather than overwritten, so a rename or a removed output cannot
  // leave last build's file behind to be served under a name nothing checks.
  await rm(outputDir, { recursive: true, force: true });

  const result = await build({
    entryPoints: [ENTRY],
    outfile: outputFile,
    bundle: true,
    splitting: false,
    format: 'iife',
    platform: 'browser',
    target: BROWSER_TARGETS,
    minify: true,
    sourcemap: true,
    // The application resolves '@/x' to src/x; esbuild has no access to the
    // tsconfig paths unless it is pointed at the file.
    tsconfig: join(ROOT, 'tsconfig.json'),
    // MediaPipe reads it, and an unreplaced reference is a ReferenceError in a
    // worker, where there is no bundler shim and no `process`.
    define: { 'process.env.NODE_ENV': '"production"' },
    metafile: true,
    logLevel: 'warning',
  });

  const bytes = Object.values(result.metafile.outputs).reduce(
    (total, output) => total + output.bytes,
    0,
  );

  console.log(`worker: wrote ${outputFile} (${(bytes / BYTES_PER_KB).toFixed(1)} KB total)`);
};

await main();
