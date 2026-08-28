import { buildPayload } from './build-payload.utils';
import type { AnalyticsEvent, AnalyticsTransport } from './analytics-event.types';

/**
 * Sends one event, and can never be the reason something breaks.
 *
 * Tracking is the least important thing this file's caller is doing. A reader
 * checking whether their passport photograph will be accepted does not care
 * that a beacon failed, and an exception thrown from a metrics call would
 * propagate into the checker and cost them the answer they came for. So every
 * failure is swallowed: a blocked beacon, an ad blocker that removed the
 * transport, a browser refusing the request offline.
 */
export const trackEvent = (event: AnalyticsEvent, transport: AnalyticsTransport): void => {
  try {
    transport(event.name, buildPayload(event));
  } catch {
    // Deliberately empty. See above: metrics never break the product.
  }
};
