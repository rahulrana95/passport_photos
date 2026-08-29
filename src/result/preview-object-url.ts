import type { ObjectUrlPort } from './preview-object-url.types';

/**
 * The browser's own object URLs.
 *
 * Built on call rather than captured at module load: this module is imported
 * by a component that renders server-side and under jsdom, and binding methods
 * that do not exist there would throw on import rather than on use.
 */
export const browserObjectUrls = (): ObjectUrlPort => ({
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => {
    URL.revokeObjectURL(url);
  },
});
