import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserObjectUrls } from './preview-object-url';

/**
 * jsdom implements neither method, so both are installed for the duration of a
 * test and removed after it.
 *
 * Stubbing the platform is the only way to reach this module at all — and the
 * module exists precisely so that nothing else in the product has to. What is
 * asserted is the whole of its job: that it hands each call straight to the
 * browser, with the argument it was given.
 */
const stubUrlMethods = (): {
  readonly create: ReturnType<typeof vi.fn>;
  readonly revoke: ReturnType<typeof vi.fn>;
} => {
  const create = vi.fn(() => 'blob:stub');
  const revoke = vi.fn();

  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));

  return { create, revoke };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the browser’s object URLs', () => {
  it('hands the blob to the browser and returns what it gave back', () => {
    const { create } = stubUrlMethods();
    const blob = new Blob(['photo']);

    expect(browserObjectUrls().create(blob)).toBe('blob:stub');
    expect(create).toHaveBeenCalledWith(blob);
  });

  it('releases exactly the url it was asked to release', () => {
    const { revoke } = stubUrlMethods();

    browserObjectUrls().revoke('blob:one');

    expect(revoke).toHaveBeenCalledWith('blob:one');
  });

  it('is built on call, so importing it cannot fail where the methods are absent', () => {
    // The reason this is a factory rather than a frozen object: this module is
    // imported by a component that renders server-side, where binding methods
    // that do not exist would throw on import rather than on use.
    expect(() => browserObjectUrls()).not.toThrow();
  });
});
