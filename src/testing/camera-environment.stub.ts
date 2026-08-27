import type { CameraEnvironment } from '@/camera/media-devices.types';

export interface StubTrack {
  readonly stop: () => void;
}

export interface StubCameraEnvironment extends CameraEnvironment {
  readonly stopped: () => number;
  readonly opened: () => number;
}

/**
 * A camera that never existed.
 *
 * jsdom implements no getUserMedia, and a suite that reached for a real one
 * could not run on CI, could not run on a laptop with the lid shut, and would
 * ask whoever ran it for permission. The two things worth asserting are how
 * many times a camera was opened and whether every track was stopped
 * afterwards, so the stub counts exactly those.
 *
 * Deliberately free of any vitest import: the stories use it too, and a
 * Storybook build that pulled in the test runner to render a button would be
 * a build nobody could ship.
 */
export const stubCameraEnvironment = (
  behaviour: { readonly reject?: unknown; readonly isSecureContext?: boolean } = {},
): StubCameraEnvironment => {
  let stopped = 0;
  let opened = 0;

  const getUserMedia = async (): Promise<MediaStream> => {
    if (behaviour.reject !== undefined) throw behaviour.reject;

    opened += 1;
    return {
      getTracks: () => [
        {
          stop: () => {
            stopped += 1;
          },
        },
      ],
    } as unknown as MediaStream;
  };

  return {
    mediaDevices: { getUserMedia },
    isSecureContext: behaviour.isSecureContext ?? true,
    stopped: () => stopped,
    opened: () => opened,
  };
};
