import { MAX_SOURCE_DIMENSION_PX, MAX_UPLOAD_BYTES, MIN_SOURCE_EDGE_PX } from '@/constants/limits.constants';
import type { ImageFormat } from './image-format.constants';
import type { IngestionFailure } from './ingestion-failure.types';

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;

const megabytes = (bytes: number): string => `${Math.round(bytes / BYTES_PER_MEGABYTE)}MB`;

/**
 * The refusals, as identifiers and numbers.
 *
 * The words are in the content module. What is decided here is which refusal
 * applies and what the reader needs told alongside it — the size of their
 * file, the format we detected, the dimensions that fell short. Those are the
 * parts this module knows and the copy does not.
 *
 * Each one exists because a generic "please try another file" is the point at
 * which somebody gives up and pays a competitor.
 */
export const ingestionFailures = {
  emptyFile: (): IngestionFailure => ({
    code: 'empty-file',
    messageId: 'empty-file',
    params: {},
  }),

  tooLarge: (byteLength: number): IngestionFailure => ({
    code: 'too-large',
    messageId: 'too-large',
    params: { size: megabytes(byteLength), limit: megabytes(MAX_UPLOAD_BYTES) },
  }),

  unrecognisedFormat: (): IngestionFailure => ({
    code: 'unrecognised-format',
    messageId: 'unrecognised-format',
    params: {},
  }),

  formatNotSupported: (format: ImageFormat): IngestionFailure => ({
    code: 'format-not-supported',
    messageId: 'format-not-supported',
    params: { format: format.toUpperCase() },
    detectedFormat: format,
  }),

  /**
   * The same code as above, and a different explanation on purpose. A HEIC
   * this browser cannot open is three taps in Photos away from working; a
   * TIFF is a different file entirely.
   */
  heicNotDecodable: (): IngestionFailure => ({
    code: 'format-not-supported',
    messageId: 'heic-not-decodable',
    params: {},
    detectedFormat: 'heic',
  }),

  decodeFailed: (format: ImageFormat): IngestionFailure => ({
    code: 'decode-failed',
    messageId: 'decode-failed',
    params: { format: format.toUpperCase() },
    detectedFormat: format,
  }),

  tooSmall: (widthPx: number, heightPx: number): IngestionFailure => ({
    code: 'too-small',
    messageId: 'too-small',
    params: {
      width: String(widthPx),
      height: String(heightPx),
      minimum: String(MIN_SOURCE_EDGE_PX),
    },
  }),

  tooLargeDimensions: (widthPx: number, heightPx: number): IngestionFailure => ({
    code: 'too-large-dimensions',
    messageId: 'too-large-dimensions',
    params: {
      width: String(widthPx),
      height: String(heightPx),
      maximum: String(MAX_SOURCE_DIMENSION_PX),
    },
  }),

  animatedSource: (format: ImageFormat): IngestionFailure => ({
    code: 'animated-source',
    messageId: 'animated-source',
    params: { format: format.toUpperCase() },
    detectedFormat: format,
  }),
} as const;
