/**
 * Where the compiled analysis worker is served from.
 *
 * The worker is built by scripts/build-worker.mjs into public/workers rather
 * than by the application bundler. Turbopack does not compile a
 * `new Worker(new URL('./analysis.worker.ts', import.meta.url))` entry point:
 * it resolves the URL as a static asset and copies the TypeScript file out
 * verbatim, so the browser is handed a .ts file it cannot parse and the worker
 * dies before it runs a line. The build still succeeds, which is what makes it
 * dangerous — the only symptom is a checker that says the checks stopped
 * unexpectedly, in production, to a user who did nothing wrong.
 *
 * Building it ourselves also removes the guesswork: the worker is a bundle we
 * name, at a path we control, that cannot be pulled into the first-paint graph
 * by accident. Nothing on a country page imports it, so its bytes stay unread
 * until someone chooses a photo.
 *
 * Read by the build script too, so the path the build writes and the path the
 * application requests can never disagree.
 */
export const ANALYSIS_WORKER_PATH = '/workers/analysis.worker.js';
