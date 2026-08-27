import { describe, expect, it } from 'vitest';
import { cameraFailure, cameraFailureFrom } from './camera-failure.utils';

/** A rejection shaped like the ones browsers actually produce. */
const named = (name: string): Error => Object.assign(new Error('denied'), { name });

describe('cameraFailureFrom', () => {
  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['PermissionDeniedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'no-camera'],
    ['DevicesNotFoundError', 'no-camera'],
    ['NotReadableError', 'camera-in-use'],
    ['TrackStartError', 'camera-in-use'],
    ['OverconstrainedError', 'constraints-unsatisfiable'],
    ['ConstraintNotSatisfiedError', 'constraints-unsatisfiable'],
  ])('reads %s as %s', (name, code) => {
    expect(cameraFailureFrom(named(name))).toEqual({ code, cause: name });
  });

  it('keeps the name it was given, so a wrong mapping can be diagnosed', () => {
    // The codes are our conclusions; this is the record of what we were told.
    expect(cameraFailureFrom(named('NotReadableError')).cause).toBe('NotReadableError');
  });

  it('does not guess at a name it has never seen', () => {
    expect(cameraFailureFrom(named('SomeFutureError'))).toEqual({
      code: 'unknown',
      cause: 'SomeFutureError',
    });
  });

  it('reads a name off an object that is not an Error', () => {
    // A rejection that crossed a realm — an iframe, a polyfill — fails an
    // instanceof check while carrying a perfectly good name, and falling
    // through to 'unknown' would replace correct advice with none.
    expect(cameraFailureFrom({ name: 'NotAllowedError' }).code).toBe('permission-denied');
  });

  it.each([[null], [undefined], ['NotAllowedError'], [42]])(
    'falls back to unknown for %s, which carries no name',
    (value) => {
      expect(cameraFailureFrom(value)).toEqual({ code: 'unknown' });
    },
  );

  it('ignores an empty name rather than treating it as a mapping key', () => {
    expect(cameraFailureFrom({ name: '' })).toEqual({ code: 'unknown' });
  });

  it('ignores a name that is not a string', () => {
    expect(cameraFailureFrom({ name: 7 })).toEqual({ code: 'unknown' });
  });
});

describe('cameraFailure', () => {
  it('builds a failure with no underlying exception to report', () => {
    expect(cameraFailure('insecure-context')).toEqual({ code: 'insecure-context' });
  });
});
