import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserEnvironment } from './browser-environment';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browserEnvironment', () => {
  it('reports what this host can actually do', () => {
    const environment = browserEnvironment();

    // jsdom has a navigator and a window but implements no getUserMedia and is
    // not a secure context, which is exactly the shape the insecure-context
    // and unsupported branches are there to tell apart.
    expect(environment).toEqual({
      mediaDevices: navigator.mediaDevices,
      isSecureContext: window.isSecureContext,
    });
  });

  it('reports no media API on a host that has no navigator', () => {
    // A server render. Reading navigator at module scope would crash at
    // import, and this module is reachable from a page that renders on the
    // server before it ever reaches a browser.
    vi.stubGlobal('navigator', undefined);

    expect(browserEnvironment().mediaDevices).toBeUndefined();
  });

  it('reports an insecure host when there is no window either', () => {
    vi.stubGlobal('window', undefined);

    expect(browserEnvironment().isSecureContext).toBe(false);
  });

  it('reads the host at call time, not at import', () => {
    // A module-level read would touch navigator while this file is being
    // evaluated, which on a server render is a crash at import.
    expect(browserEnvironment()).not.toBe(browserEnvironment());
  });
});
