/**
 * Performance and quality budgets, asserted in CI.
 *
 * Every threshold below is calibrated against a measured run, not guessed.
 * The homepage currently scores 1.00 on performance with LCP 0.5s, CLS 0 and
 * TBT 0ms, so these are regression guards with deliberate headroom rather than
 * aspirations — a budget that was already failing on the day it landed would
 * teach everyone to ignore the job.
 */

/** The desktop preset, because the numbers below were measured on it. */
const PRESET = 'desktop';

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready in',
      /**
       * A representative page of each kind, not just the homepage.
       *
       * The homepage is the SIMPLEST page here — a heading and some links —
       * and guarding only it means the budget passes while the pages that
       * carry the product get slower. Each entry below is a different shape:
       * a country page renders a requirements table and mounts the checker, a
       * size page renders a country list, the rejection page renders
       * twenty-four reasons and structured data, and the checker is the one
       * that has fifteen megabytes of models waiting behind it.
       */
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/passport-photo-checker',
        'http://localhost:3000/us/passport-photo',
        'http://localhost:3000/35x45mm-photo',
        'http://localhost:3000/why-was-my-passport-photo-rejected',
      ],
      // Three runs, median reported. A single run on a shared CI box is noise.
      numberOfRuns: 3,
      settings: {
        preset: PRESET,
        skipAudits: [
          // Always fails against a local server, and says nothing about the
          // deployed site — Vercel serves HTTP/2.
          'uses-http2',
          // Both are asserted properly by scripts/assert-seo.ts against the
          // built HTML. Here they would only ever measure the CI placeholder
          // origin and the non-production robots policy, neither of which is
          // what ships.
          'canonical',
          'is-crawlable',
        ],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.98 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],

        // Core Web Vitals. CLS and TBT are held at the real target because the
        // page currently measures zero on both, so any regression is a genuine
        // one. LCP is held at the product target of 1.2s from a measured 0.5s.
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 1200 }],
        'total-blocking-time': ['error', { maxNumericValue: 100 }],

        // Not zero, and the difference matters. Three render-blocking
        // stylesheets and three framework chunks are the floor for a Next.js
        // app with a component library, and demanding zero would mean the job
        // is red on day one and muted by day two. These are set roughly double
        // the current measurement, which still catches the failure that would
        // actually hurt: the analysis models arriving on first paint.
        'render-blocking-resources': ['error', { maxNumericValue: 250 }],
        'unused-javascript': ['error', { maxNumericValue: 150000 }],
        'total-byte-weight': ['error', { maxNumericValue: 400000 }],

        // Serving the site locally means the Vercel analytics and speed-insights
        // scripts 404. That is an artifact of the lab, not a defect — on Vercel
        // they are rewritten and served — and it costs exactly the 0.04 below.
        // The audit itself stays visible as a warning so a new console error is
        // still reported, and the category is held at the measured value so a
        // regression in any OTHER best-practices audit is a hard failure.
        'errors-in-console': 'warn',
        'categories:best-practices': ['error', { minScore: 0.96 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
