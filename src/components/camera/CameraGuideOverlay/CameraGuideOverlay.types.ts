import type { LiveGuidance } from '@/camera/guidance/guidance.types';

export interface CameraGuideOverlayProps {
  readonly guidance: LiveGuidance;
  /**
   * Suppresses the instruction while the camera is still starting.
   *
   * Without it the first thing a reader sees is "Looking for your face" before
   * there is a picture at all, which reads as a failure rather than as a
   * camera warming up.
   */
  readonly waiting?: boolean;
}
