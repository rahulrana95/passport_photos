import { describe, expect, it, vi } from 'vitest';
import { trackEvent } from './track-event';
import type { AnalyticsEvent } from './analytics-event.types';

const EVENT: AnalyticsEvent = {
  name: 'check-started',
  spec: { country: 'us', document: 'passport' },
};

describe('sending an event', () => {
  it('passes the name and the built payload to the transport', () => {
    const transport = vi.fn();

    trackEvent(EVENT, transport);

    expect(transport).toHaveBeenCalledWith('check-started', {
      country: 'us',
      document: 'passport',
    });
  });

  it('never throws, whatever the transport does', () => {
    // An ad blocker removes the transport; a browser refuses the beacon
    // offline; the tab is closing. None of those may reach the reader, who is
    // in the middle of finding out whether their photograph is acceptable.
    const transport = () => { throw new Error('blocked'); };

    expect(() => { trackEvent(EVENT, transport); }).not.toThrow();
  });

  it('swallows a transport that rejects rather than throws', () => {
    const transport = (): never => { throw new TypeError('track is not a function'); };

    expect(() => { trackEvent(EVENT, transport); }).not.toThrow();
  });
});
