import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { CameraEnvironment } from '@/camera/media-devices.types';
import type { CrownDefinition } from '@/analysis/crown-detection.utils';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

export interface CameraCaptureProps {
  /** What the guidance is measured against. Country-specific, so never a default. */
  readonly spec: ResolvedPhotoSpec;
  readonly crownDefinition: CrownDefinition;
  /** The photograph, at the sensor's resolution. */
  readonly onCapture: (photo: Blob) => void;
  /**
   * Offered whenever the camera cannot be used, and alongside it when it can.
   *
   * Not a last resort. Most desktops have no camera worth using and plenty of
   * readers already have a better photograph on their phone; a camera-only
   * flow would turn those people away at the first screen.
   */
  readonly onUploadInstead?: (() => void) | undefined;
  /**
   * Runs one frame through the models.
   *
   * Injected rather than constructed here so this component never imports
   * MediaPipe: a unit test would otherwise instantiate a WebAssembly runtime,
   * and a story would download fifteen megabytes to render a button.
   */
  readonly analyse: (frame: PixelBuffer) => Promise<AnalysisResult>;
  /** Defaults to the real navigator. Injected in tests and stories. */
  readonly environment?: CameraEnvironment | undefined;
  readonly intervalMs?: number;
}
