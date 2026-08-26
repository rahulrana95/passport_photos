import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
  reporter: process.env['CI'] === undefined ? 'list' : [['html'], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], ...launchOverride } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], ...launchOverride } },
  ],
  // Build must finish before any spec runs, or the first request races the
  // compiler and the suite fails for reasons unrelated to the code.
  webServer: {
    command: 'npm run build && npm run start',
    url: BASE_URL,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 180_000,
  },
});
