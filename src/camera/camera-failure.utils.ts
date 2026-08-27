import type { CameraFailure, CameraFailureCode } from './camera-failure.types';

/**
 * What each DOMException name means, as browsers actually use them.
 *
 * Transcribed from the specification and from observed behaviour, and the two
 * do not agree. `SecurityError` is specified as a permission problem and is
 * what older Firefox threw for an insecure context; `TrackStartError` is a
 * Chrome-only name for the same condition Firefox calls `NotReadableError`;
 * `AbortError` means the hardware failed after permission was granted, which
 * is neither a denial nor a missing device.
 *
 * Kept as a lookup rather than a chain of ifs so that adding a browser's
 * private name is one line, and so the whole mapping can be read at once when
 * somebody reports the wrong advice.
 */
const FAILURE_BY_EXCEPTION_NAME: Readonly<Record<string, CameraFailureCode>> = {
  NotAllowedError: 'permission-denied',
  PermissionDeniedError: 'permission-denied',
  SecurityError: 'permission-denied',
  NotFoundError: 'no-camera',
  DevicesNotFoundError: 'no-camera',
  NotReadableError: 'camera-in-use',
  TrackStartError: 'camera-in-use',
  OverconstrainedError: 'constraints-unsatisfiable',
  ConstraintNotSatisfiedError: 'constraints-unsatisfiable',
  AbortError: 'unknown',
};

/**
 * Reads the name off whatever getUserMedia rejected with.
 *
 * Not `instanceof DOMException`: a rejection that crossed a realm — an iframe,
 * a polyfill, a test double — fails that check while carrying a perfectly good
 * name, and falling through to 'unknown' would replace correct advice with
 * none.
 */
const exceptionName = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;

  const { name } = error as { readonly name?: unknown };
  return typeof name === 'string' && name.length > 0 ? name : undefined;
};

export const cameraFailureFrom = (error: unknown): CameraFailure => {
  const name = exceptionName(error);
  if (name === undefined) return { code: 'unknown' };

  return { code: FAILURE_BY_EXCEPTION_NAME[name] ?? 'unknown', cause: name };
};

export const cameraFailure = (code: CameraFailureCode): CameraFailure => ({ code });
