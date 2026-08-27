import { describe, expect, it } from 'vitest';
import { buildCameraConstraints } from './camera-constraints.utils';
import {
  REQUESTED_CAPTURE_HEIGHT_PX,
  REQUESTED_CAPTURE_WIDTH_PX,
} from './camera-facing.constants';

const videoOf = (constraints: MediaStreamConstraints): MediaTrackConstraints =>
  constraints.video as MediaTrackConstraints;

describe('buildCameraConstraints', () => {
  it('never asks for a microphone', () => {
    // Asking would put a recording indicator on the reader's screen, on a
    // product whose whole claim is that it is not watching them.
    expect(buildCameraConstraints({}).audio).toBe(false);
  });

  it('asks for the facing mode as an ideal, never an exact', () => {
    // An exact facingMode is the commonest way a camera fails to open on a
    // laptop: one webcam, no facing mode reported, OverconstrainedError on a
    // device that would have worked perfectly.
    expect(videoOf(buildCameraConstraints({ facing: 'environment' })).facingMode).toEqual({
      ideal: 'environment',
    });
  });

  it('defaults to the front camera, which is who is taking the photograph', () => {
    expect(videoOf(buildCameraConstraints({})).facingMode).toEqual({ ideal: 'user' });
  });

  it('asks for the resolution as an ideal too', () => {
    expect(videoOf(buildCameraConstraints({}))).toMatchObject({
      width: { ideal: REQUESTED_CAPTURE_WIDTH_PX },
      height: { ideal: REQUESTED_CAPTURE_HEIGHT_PX },
    });
  });

  it('pins a chosen camera exactly, because the reader picked it from a list', () => {
    // The one place `exact` is right: silently opening a different camera than
    // the one somebody selected is worse than failing.
    expect(videoOf(buildCameraConstraints({ deviceId: 'cam-2' })).deviceId).toEqual({
      exact: 'cam-2',
    });
  });

  it('drops the facing mode when a specific camera was chosen', () => {
    const video = videoOf(buildCameraConstraints({ deviceId: 'cam-2', facing: 'user' }));

    // Both at once is a contradiction the browser resolves by refusing.
    expect(video.facingMode).toBeUndefined();
  });
});
