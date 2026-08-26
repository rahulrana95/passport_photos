import { MAX_SOURCE_DIMENSION_PX, MAX_UPLOAD_BYTES, MIN_SOURCE_EDGE_PX } from '@/constants/limits.constants';
import { NATIVELY_DECODABLE_FORMATS } from './image-format.constants';
import { ingestionFailures } from './ingestion-failure.utils';
import { sniffImageFormat } from './magic-bytes.utils';
import type { ImageFormat } from './image-format.constants';
import type { IngestionFailure } from './ingestion-failure.types';

export type ValidationResult =
  | { readonly ok: true; readonly format: ImageFormat; readonly decodeNatively: boolean }
  | { readonly ok: false; readonly failure: IngestionFailure };

export interface CandidateFile {
  readonly byteLength: number;
  /** The leading bytes, at least FORMAT_SNIFF_BYTES of them. */
  readonly header: Uint8Array;
}

/**
 * Everything decidable before a decoder is involved.
 *
 * Ordered by cost, cheapest first: an empty or oversized file is rejected
 * without reading a byte of content, and a 48MP HEIC never reaches a decoder
 * that would allocate hundreds of megabytes before failing.
 *
 * The declared MIME type and the filename are not arguments here, deliberately.
 * Both are user-controlled and both lie routinely — a .jpg that is really a
 * HEIC is the most common upload on iOS, because renaming is what people try
 * when a file "will not work".
 */
export const validateCandidateFile = (file: CandidateFile): ValidationResult => {
  if (file.byteLength === 0) return { ok: false, failure: ingestionFailures.emptyFile() };

  if (file.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, failure: ingestionFailures.tooLarge(file.byteLength) };
  }

  const format = sniffImageFormat(file.header);
  if (format === undefined) {
    return { ok: false, failure: ingestionFailures.unrecognisedFormat() };
  }

  if (format === 'tiff') {
    return { ok: false, failure: ingestionFailures.formatNotSupported(format) };
  }

  // HEIC and AVIF are attempted rather than refused. Safari on iOS decodes both
  // natively, and iOS is where these files come from — refusing on format alone
  // would turn away the exact user whose phone produced the file.
  return {
    ok: true,
    format,
    decodeNatively: NATIVELY_DECODABLE_FORMATS.includes(format),
  };
};

/**
 * Dimension checks, which can only run once something has been decoded.
 *
 * Separate from the byte-level pass on purpose: these need a decoder, and a
 * caller that has one should not be forced to re-run the cheap checks.
 */
export const validateDecodedDimensions = (
  widthPx: number,
  heightPx: number,
): IngestionFailure | undefined => {
  if (widthPx > MAX_SOURCE_DIMENSION_PX || heightPx > MAX_SOURCE_DIMENSION_PX) {
    return ingestionFailures.tooLargeDimensions(widthPx, heightPx);
  }

  // The shorter edge decides. A panorama has plenty of width and still cannot
  // yield a 35mm square at print resolution.
  if (Math.min(widthPx, heightPx) < MIN_SOURCE_EDGE_PX) {
    return ingestionFailures.tooSmall(widthPx, heightPx);
  }

  return undefined;
};
