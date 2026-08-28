import { track } from '@vercel/analytics';
import type { AnalyticsPayload, AnalyticsTransport } from './analytics-event.types';

/**
 * The one line that reaches Vercel Analytics.
 *
 * Its own file for the reason the WASM loaders have theirs: every other module
 * in this directory can then be imported by a test without pulling in a
 * transport that wants a browser and a network.
 *
 * Vercel Analytics was chosen in PR #12 over a third-party stack, and the
 * reason applies here more than it did there. It is same-origin and cookieless:
 * a visitor watching the Network tab to check that their photograph is not
 * being uploaded sees first-party requests to our own host, not a wall of
 * calls to somebody else's. Sending custom events through the same channel
 * keeps that true; sending them anywhere else would quietly break it.
 */
export const vercelTransport: AnalyticsTransport = (
  name: string,
  payload: AnalyticsPayload,
): void => {
  track(name, { ...payload });
};
