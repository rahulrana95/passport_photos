import type { AnalysisResult, AnalysisStage } from '@/analysis/analysis-protocol.types';
import type { CameraEnvironment } from '@/camera/media-devices.types';
import type { ImageDecoder } from '@/ingestion/image-decoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

export interface AnalyseOptions {
  readonly onProgress: (stage: AnalysisStage, ratio: number) => void;
}

export interface CheckerPanelProps {
  /**
   * The specifications a reader may check against.
   *
   * Passed in from the server, already filtered to the verified ones, because
   * the page knows the registry and this component should not: it renders
   * whatever it is given and nothing turns on which country that is.
   */
  readonly specs: readonly ResolvedPhotoSpec[];
  /**
   * Injected so a test or a story never constructs a Worker or a canvas.
   *
   * Both default to the real thing, built lazily on first use — the models are
   * fifteen megabytes and nothing should load them because a page rendered.
   */
  readonly decoder?: ImageDecoder | undefined;
  readonly analyse?: ((frame: PixelBuffer, options: AnalyseOptions) => Promise<AnalysisResult>) | undefined;
  /**
   * The camera the live view opens, defaulting to the real navigator.
   *
   * Injected for the same reason the decoder is: jsdom has no getUserMedia, so
   * without a seam the whole camera route — including the photograph it
   * produces reaching the analysis — is reachable only in a real browser.
   */
  readonly cameraEnvironment?: CameraEnvironment | undefined;
}
