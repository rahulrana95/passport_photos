import { defineConfig, devices } from '@playwright/test';

const APP_PORT = 3000;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const STORYBOOK_PORT = 6006;
const STORYBOOK_URL = `http://127.0.0.1:${STORYBOOK_PORT}`;

/**
 * CI installs its own browsers, so this is normally empty. Set
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE to run against a Chromium that is already on
 * the machine — useful in sandboxes and images where the bundled revision does
 * not match the one this Playwright version expects.
 */
const chromiumExecutable = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];
const launchOverride =
  chromiumExecutable === undefined ? {} : { launchOptions: { executablePath: chromiumExecutable } };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 2,
  // The HTML report renders expected / actual / diff side by side with a
  // slider. That is how a visual failure is actually reviewed, so it is always
  // written — not only on CI.
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      // Zero, and not a ratio.
      //
      // Measured, not guessed: recolouring the fail status icon changes exactly
      // 26 pixels. A 1% ratio allowance let that through, and so did an
      // absolute budget of 60 — the suite reported green while a status colour
      // had been changed entirely. Any non-zero budget is a hole the size of a
      // small component.
      //
      // Baselines are platform-suffixed (-linux), and CI runs the same Chromium
      // on the same platform, so identical rendering is a reasonable demand.
      // If this ever proves flaky, raise it with the measured number in hand.
      maxDiffPixels: 0,
      // Per-pixel tolerance, expressed as YIQ colour distance. Playwright's
      // usual 0.2 is far too permissive here: swapping the fail red (#a8401c)
      // for a purple (#7a1fa2) is ~0.07 apart in YIQ, so a status colour could
      // be changed entirely and every screenshot would still pass. 0.05 still
      // absorbs subpixel antialiasing between a laptop and a CI runner.
      threshold: 0.05,
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /visual\//,
      use: { ...devices['Desktop Chrome'], baseURL: APP_URL, ...launchOverride },
    },
    {
      name: 'mobile-chromium',
      testIgnore: /visual\//,
      use: { ...devices['Pixel 7'], baseURL: APP_URL, ...launchOverride },
    },
    {
      // Story screenshots set their own viewport per variant, so the device
      // preset here only supplies the browser.
      name: 'stories',
      testMatch: /visual\//,
      use: { ...devices['Desktop Chrome'], baseURL: STORYBOOK_URL, ...launchOverride },
    },
  ],
  // Both builds must finish before any spec runs, or the first request races
  // the compiler and the suite fails for reasons unrelated to the code.
  webServer: [
    {
      command: 'npm run build && npm run start',
      url: APP_URL,
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 180_000,
    },
    {
      // Serve only. The Storybook build belongs in the npm script, NOT here:
      // reuseExistingServer skips this command entirely when a server is
      // already up, so a build placed here is silently skipped locally and the
      // suite compares screenshots against a stale bundle. That failure mode is
      // invisible — every test passes while nothing was re-rendered.
      command: `node scripts/serve-static.mjs storybook-static ${STORYBOOK_PORT}`,
      url: STORYBOOK_URL,
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 60_000,
    },
  ],
});
