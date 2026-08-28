/**
 * The same routes, on a throttled mid-range phone.
 *
 * SEPARATE FROM THE DESKTOP CONFIG, and the separation is the point: the two
 * measure genuinely different things and a single set of thresholds would have
 * to be loose enough for the worse one, which would stop the better one
 * catching anything.
 *
 * This is where most of this product's traffic actually is. Somebody
 * photographing themselves for a passport application is holding a phone, and
 * the desktop numbers — LCP around 550ms — say nothing about what they see.
 *
 * WHAT THIS FOUND, recorded because the numbers below are otherwise puzzling:
 * on this profile every route lands between 1.5 and 1.8 seconds for LCP, and
 * the product's stated target is 1.2. The target is currently met on desktop
 * only. Closing that is real work — hydration and font loading, not a
 * threshold change — so these thresholds are set from the measured values with
 * headroom, as a REGRESSION GUARD, and the gap is written down rather than
 * papered over. A budget that was red the day it landed would be muted the day
 * after, and then it would catch nothing at all.
 *
 * Lighthouse's mobile profile is deliberately pessimistic — a Moto G4-class
 * CPU at 4x slowdown on 1.6Mbps — and this runs against a local server rather
 * than Vercel's edge. Real devices on real connections do better. The truth
 * about what readers experience is in Speed Insights, which is already
 * installed and reports from actual visits; this job exists to catch the
 * change that makes it worse.
 */

const desktop = require('./lighthouserc.cjs');

/**
 * Measured 2026-08-28 over fifteen runs: worst LCP 2589ms, worst TBT 192ms,
 * worst performance score 0.94.
 *
 * The spread is wide and worth knowing about. A single unloaded run put every
 * route between 1.5 and 1.8 seconds; three concurrent runs on the same box
 * pushed the medians to 2.2-2.4 and the worst case to 2.6. That is contention,
 * not the site, and it is why these sit well above the measurement — a shared
 * CI runner is noisier than a laptop, and a guard that trips on a busy morning
 * is a guard somebody deletes.
 *
 * Loose enough to survive that, tight enough to catch a doubling.
 */
const LCP_GUARD_MS = 3000;
const TBT_GUARD_MS = 500;
const PERFORMANCE_FLOOR = 0.85;

module.exports = {
  ci: {
    ...desktop.ci,
    collect: {
      ...desktop.ci.collect,
      settings: {
        ...desktop.ci.collect.settings,
        // Lighthouse's own mobile emulation: throttled CPU, slow 4G, a phone
        // viewport. Not our own numbers, deliberately — a profile somebody
        // invented is a profile nobody can compare against.
        preset: undefined,
        formFactor: 'mobile',
      },
    },
    assert: {
      assertions: {
        ...desktop.ci.assert.assertions,
        'categories:performance': ['error', { minScore: PERFORMANCE_FLOOR }],
        'largest-contentful-paint': ['error', { maxNumericValue: LCP_GUARD_MS }],
        'total-blocking-time': ['error', { maxNumericValue: TBT_GUARD_MS }],
        // Zero on every route measured, and the one metric that is already
        // where it should be on both profiles. Held at the real target.
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        // Throttled mobile downloads the same bytes more slowly; the weight
        // itself is guarded by the desktop run and does not need two limits.
        'total-byte-weight': 'off',
        'unused-javascript': 'off',
        'render-blocking-resources': 'off',
      },
    },
    upload: { ...desktop.ci.upload, outputDir: '.lighthouseci-mobile' },
  },
};
