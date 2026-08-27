import type { CameraEnvironment } from './media-devices.types';

/**
 * The real host, read at call time rather than at import.
 *
 * A module-level read would touch `navigator` while this file is being
 * evaluated, which on a server render is a crash at import — and this module
 * is reachable from a page that renders on the server before it ever reaches a
 * browser.
 *
 * Both fields are guarded separately because they fail separately: a
 * server render has neither, and a browser on plain http has a window and no
 * mediaDevices at all.
 */
export const browserEnvironment = (): CameraEnvironment => ({
  mediaDevices: typeof navigator === 'undefined' ? undefined : navigator.mediaDevices,
  isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
});
