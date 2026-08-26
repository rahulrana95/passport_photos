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
    env: { NEXT_PUBLIC_SITE_URL: 'https://example.test' },
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
        // Test-support code, not shipped product code. It is still tested (see
        // src/testing/*.test.ts) — it just is not part of the product's
        // coverage budget.
        'src/testing/**',
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
