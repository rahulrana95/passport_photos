import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // The app validates environment eagerly so a bad value fails the build.
    // Tests therefore need a valid value present; parseEnvironment is exercised
    // directly with explicit inputs for the failure cases.
    // Tests run as though on a Vercel production deployment. Without VERCEL_ENV
    // the suite inherits NODE_ENV=test, nothing is indexable, and every
    // metadata assertion would be exercising the preview path by accident.
    // The production-versus-preview logic itself is covered directly by
    // resolveIsIndexable's own tests.
    env: { NEXT_PUBLIC_SITE_URL: 'https://example.test', VERCEL_ENV: 'production' },
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Type-only modules emit no runtime code, so they can never be covered.
        'src/**/*.types.ts',
        // Stories are exercised by the Storybook test-runner, not by Vitest.
        'src/**/*.stories.tsx',
        // App Router entry points render as Server Components; they are covered
        // by the Playwright suite in e2e/ rather than in jsdom.
        'src/app/**',
        // The worker entry point. It is one call into startAnalysisWorker,
        // which is itself fully covered; the entry cannot be imported in jsdom
        // because there is no worker global to attach to. Same reasoning as
        // src/app/** above: entry points are wiring, not logic.
        'src/analysis/analysis.worker.ts',
        // The axe wrapper is thin test-support glue and is verified by its own
        // test. Everything else under src/testing IS covered: the fixture
        // generator is load-bearing, and a bug there would silently corrupt
        // every measurement downstream of it.
        'src/testing/axe.utils.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
