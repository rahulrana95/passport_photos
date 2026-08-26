import type { ImageFormat } from './image-format.constants';

export const INGESTION_FAILURE_CODES = [
  'empty-file',
  'too-large',
  'unrecognised-format',
  'format-not-supported',
  'decode-failed',
  'too-small',
  'too-large-dimensions',
  'animated-source',
] as const;

export type IngestionFailureCode = (typeof INGESTION_FAILURE_CODES)[number];

/**
 * A refusal the user can act on.
 *
 * `message` says what is wrong in one sentence. `remedy` says what to do about
 * it, and is the field that matters: "we cannot read this file" loses the user,
 * "your iPhone saved this as HEIC — open it in Photos and export as JPEG"
 * keeps them. Every failure here carries both.
 */
export interface IngestionFailure {
  readonly code: IngestionFailureCode;
  readonly message: string;
  readonly remedy: string;
  readonly detectedFormat?: ImageFormat;
}

export interface SourceImageMetadata {
  readonly format: ImageFormat;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly byteLength: number;
  /** EXIF capture time, when the file carries one. Screenshots do not. */
  readonly capturedAt?: Date;
}
