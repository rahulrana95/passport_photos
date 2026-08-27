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
 * Which words a failure is explained in.
 *
 * Usually the same as the code, and deliberately a separate field because one
 * code can need two explanations. A HEIC this browser cannot open and a TIFF
 * nobody can open are both 'format-not-supported', and the thing to do about
 * them is completely different — one is three taps in Photos, the other is a
 * different file.
 */
export const INGESTION_MESSAGE_IDS = [
  'empty-file',
  'too-large',
  'unrecognised-format',
  'format-not-supported',
  'heic-not-decodable',
  'decode-failed',
  'too-small',
  'too-large-dimensions',
  'animated-source',
] as const;

export type IngestionMessageId = (typeof INGESTION_MESSAGE_IDS)[number];

/**
 * A refusal the user can act on.
 *
 * IT CARRIES AN IDENTIFIER AND NUMBERS, NOT SENTENCES. The words live in the
 * content module with everything else the reader sees, which is what makes a
 * second language a content file rather than a second copy of this module —
 * and this is the one place a user meets the product before anything has
 * worked, so it is the worst place to have untranslatable text.
 *
 * `params` are the values the sentence interpolates: a size, a format, the
 * dimensions that were too small. Numbers, because a number is the same in
 * every language and a sentence is not.
 */
export interface IngestionFailure {
  readonly code: IngestionFailureCode;
  readonly messageId: IngestionMessageId;
  readonly params: Readonly<Record<string, string>>;
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
