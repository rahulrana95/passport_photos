import {
  APP0_MARKER,
  BYTE_MASK,
  BYTE_SHIFT,
  COMMENT_MARKER,
  MAX_SEGMENT_LENGTH,
  JFIF_IDENTIFIER,
  JFIF_PAYLOAD_BYTES,
  JFIF_UNITS_NONE,
  JFIF_VERSION_MAJOR,
  JFIF_VERSION_MINOR,
  MARKER_BYTES,
  MARKER_PREFIX,
  SEGMENT_LENGTH_BYTES,
  SOI_MARKER,
  EOI_MARKER,
} from './jpeg-marker.constants';
import { MAX_JPEG_QUALITY, MIN_JPEG_QUALITY } from './encode.constants';
import type { JpegEncoder } from './jpeg-encoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

/**
 * An encoder that produces a structurally valid JPEG of a predictable size.
 *
 * Predictable is the point. The quality search is the piece of this module
 * most likely to be subtly wrong — off by one at a bound, or returning the
 * last attempt rather than the best one — and against a real encoder those
 * bugs are invisible, because any answer it gives is a plausible file of a
 * plausible size. Against a fake whose size is an exact function of quality,
 * the search either finds the right number or it does not.
 *
 * The output is a real JPEG structure rather than random bytes, so the
 * metadata rewriting downstream operates on it exactly as it would on mozjpeg
 * output — including the default it has to correct, which is a JFIF header
 * declaring no physical size at all.
 */

const MAX_SEGMENT_PAYLOAD = MAX_SEGMENT_LENGTH - SEGMENT_LENGTH_BYTES;

/** A space. Filler has to be some byte, and a printable one reads clearly. */
const FILLER_BYTE = 0x20;

export interface FakeEncoderOptions {
  /** File size produced at the lowest quality the search will try. */
  readonly bytesAtMinQuality?: number;
  /** File size produced at the highest. */
  readonly bytesAtMaxQuality?: number;
  /**
   * Emits the JFIF header libjpeg writes by default, declaring units 0.
   * Turn it off to exercise the path where a density segment must be
   * inserted rather than patched.
   */
  readonly withJfifSegment?: boolean;
}

const DEFAULT_BYTES_AT_MIN = 40_000;
const DEFAULT_BYTES_AT_MAX = 400_000;

const jfifSegment = (): number[] => [
  MARKER_PREFIX,
  APP0_MARKER,
  ((SEGMENT_LENGTH_BYTES + JFIF_PAYLOAD_BYTES) >> BYTE_SHIFT) & BYTE_MASK,
  (SEGMENT_LENGTH_BYTES + JFIF_PAYLOAD_BYTES) & BYTE_MASK,
  ...[...JFIF_IDENTIFIER].map((character) => character.charCodeAt(0)),
  JFIF_VERSION_MAJOR,
  JFIF_VERSION_MINOR,
  // Units 0, densities 1 by 1: exactly what libjpeg writes when nobody tells
  // it otherwise, and exactly what the density writer has to correct.
  JFIF_UNITS_NONE,
  0x00,
  0x01,
  0x00,
  0x01,
  // A thumbnail of no width and no height.
  0x00,
  0x00,
];

/**
 * Filler occupying exactly the requested number of bytes.
 *
 * Exactly, including each segment's own four bytes of marker and length. An
 * approximation would make the fake's size a nearly-right function of quality,
 * and a search asserted against a nearly-right expectation is a search whose
 * off-by-one bugs are indistinguishable from rounding.
 */
const fillerSegments = (bytes: number): number[] => {
  const output: number[] = [];
  const overhead = MARKER_BYTES + SEGMENT_LENGTH_BYTES;
  let remaining = bytes;

  while (remaining >= overhead) {
    const payload = Math.min(remaining - overhead, MAX_SEGMENT_PAYLOAD);
    const length = payload + SEGMENT_LENGTH_BYTES;
    output.push(
      MARKER_PREFIX,
      COMMENT_MARKER,
      (length >> BYTE_SHIFT) & BYTE_MASK,
      length & BYTE_MASK,
      ...Array.from({ length: payload }, () => FILLER_BYTE),
    );
    remaining -= overhead + payload;
  }

  return output;
};

/**
 * Size falls with quality, linearly and monotonically.
 *
 * Monotonic because the search assumes it: a smaller quality that produced a
 * larger file would make bisection meaningless. Real encoders are very nearly
 * monotonic and not exactly, which is why the search keeps the best result it
 * has seen rather than trusting the last one.
 */
const sizeForQuality = (quality: number, options: FakeEncoderOptions): number => {
  const atMin = options.bytesAtMinQuality ?? DEFAULT_BYTES_AT_MIN;
  const atMax = options.bytesAtMaxQuality ?? DEFAULT_BYTES_AT_MAX;
  const span = MAX_JPEG_QUALITY - MIN_JPEG_QUALITY;
  const position = (quality - MIN_JPEG_QUALITY) / span;

  return Math.round(atMin + (atMax - atMin) * position);
};

export const createFakeJpegEncoder = (options: FakeEncoderOptions = {}): JpegEncoder => ({
  encode: (_image: PixelBuffer, quality: number): Promise<Uint8Array> => {
    const header = [
      MARKER_PREFIX,
      SOI_MARKER,
      ...(options.withJfifSegment === false ? [] : jfifSegment()),
    ];
    const trailer = [MARKER_PREFIX, EOI_MARKER];
    const filler = Math.max(0, sizeForQuality(quality, options) - header.length - trailer.length);

    return Promise.resolve(
      Uint8Array.from([...header, ...fillerSegments(filler), ...trailer]),
    );
  },
});

/** What the fake will produce for a quality, so a test can assert against it. */
export const fakeEncodedSize = (quality: number, options: FakeEncoderOptions = {}): number =>
  sizeForQuality(quality, options);
