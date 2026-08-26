import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/** Ordered, so a progress bar can be driven from the stage alone. */
export const ANALYSIS_STAGES = [
  'decoding',
  'detecting-face',
  'segmenting',
  'measuring',
  'checking-quality',
] as const;

export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

export interface LandmarkPoint {
  readonly x: number;
  readonly y: number;
}

export interface LandmarkResult {
  /** Normalised 0-1 coordinates, as every landmark model reports them. */
  readonly points: readonly LandmarkPoint[];
  readonly confidence: number;
  readonly rollDegrees: number;
  readonly yawDegrees: number;
  readonly blendshapes: Readonly<Record<string, number>>;
}

export interface SegmentationResult {
  readonly width: number;
  readonly height: number;
  /** One byte per pixel: 255 is subject, 0 is background. */
  readonly mask: Uint8ClampedArray;
  readonly confidence: number;
}

export interface AnalysisRequestPayload {
  readonly buffer: PixelBuffer;
}

export interface AnalysisResult {
  readonly landmarks: LandmarkResult | undefined;
  readonly segmentation: SegmentationResult | undefined;
}

/**
 * Errors cannot cross a worker boundary as Error instances — structured clone
 * drops the prototype and the stack. They are serialised deliberately so the
 * main thread receives something it can act on rather than "[object Object]".
 */
export interface SerialisedError {
  readonly name: string;
  readonly message: string;
  readonly code: AnalysisErrorCode;
}

export const ANALYSIS_ERROR_CODES = [
  'no-face-detected',
  'multiple-faces',
  'detector-unavailable',
  'out-of-memory',
  'timeout',
  'worker-crashed',
  'worker-unavailable',
  'cancelled',
  'unknown',
] as const;

export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];

export type WorkerRequest =
  | { readonly kind: 'analyse'; readonly id: string; readonly payload: AnalysisRequestPayload }
  | { readonly kind: 'cancel'; readonly id: string };

export type WorkerResponse =
  | {
      readonly kind: 'progress';
      readonly id: string;
      readonly stage: AnalysisStage;
      readonly ratio: number;
    }
  | { readonly kind: 'result'; readonly id: string; readonly payload: AnalysisResult }
  | { readonly kind: 'error'; readonly id: string; readonly error: SerialisedError }
  | { readonly kind: 'cancelled'; readonly id: string };

/**
 * The swap point between the real MediaPipe backend and the deterministic fake.
 *
 * Everything downstream depends on this interface rather than on MediaPipe, so
 * the segmentation model can be replaced — with an ONNX one, if the ground-truth
 * set shows MediaPipe failing on dark hair — without touching a single caller.
 */
export interface Detector {
  readonly detectLandmarks: (buffer: PixelBuffer) => Promise<LandmarkResult | undefined>;
  readonly segment: (buffer: PixelBuffer) => Promise<SegmentationResult | undefined>;
}
