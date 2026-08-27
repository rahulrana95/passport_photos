import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { RecordingResizeObserver, resetResizeObservers } from './src/testing/resize-observer.stub';

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

// ImageData is part of the canvas API, which jsdom does not implement either.
// The detector builds one to hand to MediaPipe and reads nothing back from it,
// so a faithful container of the same three fields is a complete stand-in —
// there is no behaviour here to fake incorrectly.
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    readonly colorSpace: PredefinedColorSpace = 'srgb';

    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  } as unknown as typeof globalThis.ImageData;
}

// A recording stub rather than a no-op one. A component that reacts to its own
// size was previously frozen at zero for the whole unit suite, which meant its
// most breakable behaviour was only ever exercised in a browser screenshot.
global.ResizeObserver = RecordingResizeObserver;

afterEach(() => {
  cleanup();
  resetResizeObservers();

  // Theme state is written to localStorage and stamped on <html>, so without
  // this a test that switches theme leaks into every test that follows it.
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-mantine-color-scheme');
});
