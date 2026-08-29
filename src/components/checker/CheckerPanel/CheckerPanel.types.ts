import type { AnalysisResult, AnalysisStage } from '@/analysis/analysis-protocol.types';
import type { CameraEnvironment } from '@/camera/media-devices.types';
import type { ImageDecoder } from '@/ingestion/image-decoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { AnalyticsTransport } from '@/analytics/analytics-event.types';
import type { ObjectUrlPort } from '@/result/preview-object-url.types';
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
  /**
   * Where the preview's object URL comes from, defaulting to the browser's.
   *
   * Injected for the same reason the camera is: jsdom implements neither
   * createObjectURL nor revokeObjectURL, so without a seam the branch that
   * shows a reader their own annotated photograph could not be tested at all —
   * and neither could the revocation that stops it leaking.
   */
  readonly objectUrls?: ObjectUrlPort | undefined;
  /**
   * Where usage events go, defaulting to Vercel Analytics.
   *
   * Injected for the same reason everything else here is: a test that checks
   * WHICH events a check emits should not need a network, and a story should
   * not put its own renders in the production metrics.
   */
  readonly track?: AnalyticsTransport | undefined;
}
