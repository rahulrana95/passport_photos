import { describe, expect, it, vi } from 'vitest';
import { openCamera, stopStream } from './open-camera';
import type { CameraEnvironment, MediaDevicesLike } from './media-devices.types';

const fakeStream = (): MediaStream => ({}) as MediaStream;

const devices = (getUserMedia: MediaDevicesLike['getUserMedia']): MediaDevicesLike => ({
  getUserMedia,
});

const secure = (getUserMedia: MediaDevicesLike['getUserMedia']): CameraEnvironment => ({
  mediaDevices: devices(getUserMedia),
  isSecureContext: true,
});

describe('openCamera', () => {
  it('returns the stream when the camera opens', async () => {
    const stream = fakeStream();
    const result = await openCamera({ environment: secure(async () => stream) });

    expect(result).toEqual({ ok: true, stream });
  });

  it('passes the requested facing mode through', async () => {
    const getUserMedia = vi.fn(async () => fakeStream());

    await openCamera({ environment: secure(getUserMedia), facing: 'environment' });

    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
      }),
    );
  });

  it('passes a pinned device through', async () => {
    const getUserMedia = vi.fn(async () => fakeStream());

    await openCamera({ environment: secure(getUserMedia), deviceId: 'cam-2' });

    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ deviceId: { exact: 'cam-2' } }),
      }),
    );
  });

  it('never throws, whatever getUserMedia does', async () => {
    const result = await openCamera({
      environment: secure(() => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }))),
    });

    // A rejected promise would push the same five-way decision onto every
    // caller, and every one of these failures has a different remedy.
    expect(result).toEqual({ ok: false, failure: { code: 'permission-denied', cause: 'NotAllowedError' } });
  });

  it('blames the protocol, not the hardware, when the API is missing over http', async () => {
    // Safari withholds mediaDevices entirely over plain http, so this looks
    // exactly like having no camera — and telling somebody to buy a webcam
    // when they need https would be wrong.
    const result = await openCamera({
      environment: { mediaDevices: undefined, isSecureContext: false },
    });

    expect(result).toEqual({ ok: false, failure: { code: 'insecure-context' } });
  });

  it('blames the browser when the API is missing on a secure page', async () => {
    const result = await openCamera({
      environment: { mediaDevices: undefined, isSecureContext: true },
    });

    expect(result).toEqual({ ok: false, failure: { code: 'unsupported' } });
  });

  it('does not call getUserMedia when there is no media API at all', async () => {
    // Reaching for it would throw a TypeError, which carries no name worth
    // mapping, and the reader would be told "something went wrong".
    const result = await openCamera({
      environment: { mediaDevices: undefined, isSecureContext: true },
    });

    expect(result.ok).toBe(false);
  });
});

describe('stopStream', () => {
  it('stops every track', () => {
    // A track left running keeps the camera light on after the reader has
    // moved on. On this product, a light that stays on IS the accusation.
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream;

    stopStream(stream);

    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('tolerates being called with nothing, because unmount paths run twice', () => {
    expect(() => {
      stopStream(undefined);
    }).not.toThrow();
  });
});
