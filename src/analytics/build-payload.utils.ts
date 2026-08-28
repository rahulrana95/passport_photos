import { ALLOWED_PROPERTY_KEYS } from './analytics-event.constants';
import type {
  AnalyticsEvent,
  AnalyticsPayload,
  AnalyticsPropertyValue,
} from './analytics-event.types';

/**
 * Turns a typed event into the flat payload the transport takes.
 *
 * Every branch is written out rather than spread from the event object. A
 * spread would carry whatever the event happened to hold, which is exactly how
 * a field nobody meant to send ends up sent — and the compiler would not say a
 * word about it.
 */
export const buildPayload = (event: AnalyticsEvent): AnalyticsPayload => {
  switch (event.name) {
    case 'check-started':
      return sanitisePayload({ country: event.spec.country, document: event.spec.document });

    case 'photo-downloaded':
      return {};

    case 'photo-accepted':
      return sanitisePayload({ format: event.format });

    case 'photo-refused':
      return sanitisePayload({ reason: event.reason });

    case 'check-completed':
      return sanitisePayload({
        country: event.spec.country,
        document: event.spec.document,
        overall: event.overall,
        failedRules: event.failedRules,
      });

    case 'rule-failed':
      return sanitisePayload({
        ruleId: event.ruleId,
        country: event.spec.country,
        document: event.spec.document,
      });
  }
};

/**
 * The last gate before anything leaves the device.
 *
 * Drops any key not on the allowlist rather than throwing. A throw here would
 * turn a tracking mistake into a broken checker, and the reader's photograph
 * matters more than our metrics — which is the same reason the transport
 * swallows its own errors.
 *
 * Exported so it can be tested on its own, because nothing above can reach its
 * rejecting branch: every case in the builder names its fields one at a time,
 * which already makes a stray key impossible. That is the point — this is the
 * second lock, and the way to know a second lock works is to try it directly
 * rather than to wait for the first one to fail.
 */
export const sanitisePayload = (
  payload: Record<string, AnalyticsPropertyValue>,
): AnalyticsPayload => {
  const allowed: Record<string, AnalyticsPropertyValue> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (ALLOWED_PROPERTY_KEYS.includes(key)) allowed[key] = value;
  }
  return allowed;
};
