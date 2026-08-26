import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * jsdom implements none of the browser APIs Mantine and the analysis pipeline
 * rely on. Registering the stubs once here stops every future test file from
 * re-inventing them.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();

// jsdom does not implement canvas. A null-returning stub silences the noise now
// and is replaced by a real fake in PR #10, where the analysis pipeline needs
// one that actually returns pixel data.
window.HTMLCanvasElement.prototype.getContext = (() =>
  null) as unknown as HTMLCanvasElement['getContext'];

global.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

afterEach(() => {
  cleanup();
});
