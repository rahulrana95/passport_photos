import {
  EOI_MARKER,
  MARKER_BYTES,
  MARKER_PREFIX,
  SEGMENT_LENGTH_BYTES,
  SOI_MARKER,
  SOS_MARKER,
} from './jpeg-marker.constants';

/**
 * One JPEG header segment.
 *
 * Offsets rather than a copied payload, because both callers want to rewrite
 * the file around a segment rather than read it, and slicing a payload out
 * only to search for its position again is the same work done twice.
 */
export interface JpegSegment {
  readonly marker: number;
  /** Index of the 0xff that introduces the marker. */
  readonly start: number;
  /** First byte of the segment's own data, after marker and length. */
  readonly payloadStart: number;
  /** Index one past the last byte of the segment. */
  readonly end: number;
}

export const JPEG_SCAN_FAILURES = ['not-a-jpeg', 'malformed'] as const;

export type JpegScanFailure = (typeof JPEG_SCAN_FAILURES)[number];

export type JpegScan =
  | {
      readonly ok: true;
      readonly segments: readonly JpegSegment[];
      /** Index of the marker that ended the header: start of scan, or EOI. */
      readonly headerEnd: number;
    }
  | { readonly ok: false; readonly reason: JpegScanFailure };

const asciiAt = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

/** True when a segment's payload begins with the given identifier string. */
export const segmentIdentifiedBy = (
  bytes: Uint8Array,
  segment: JpegSegment,
  identifier: string,
): boolean => asciiAt(bytes, segment.payloadStart, identifier.length) === identifier;

/**
 * Walks the header segments of a JPEG.
 *
 * Stops at start-of-scan or end-of-image, whichever comes first, because
 * everything after start-of-scan is entropy-coded image data in which a 0xff
 * byte is emphatically not a marker. A walker that kept going would find
 * thousands of imaginary segments in the compressed pixels and then rewrite
 * the file around one of them.
 *
 * Restartable and standalone markers are not handled, and cannot appear here:
 * they occur only inside the scan, which this never enters.
 */
export const scanJpegSegments = (bytes: Uint8Array): JpegScan => {
  if (bytes[0] !== MARKER_PREFIX || bytes[1] !== SOI_MARKER) {
    return { ok: false, reason: 'not-a-jpeg' };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const segments: JpegSegment[] = [];
  let offset = MARKER_BYTES;

  while (offset + MARKER_BYTES <= bytes.length) {
    if (bytes[offset] !== MARKER_PREFIX) return { ok: false, reason: 'malformed' };

    const marker = Number(bytes[offset + 1]);
    if (marker === SOS_MARKER || marker === EOI_MARKER) {
      return { ok: true, segments, headerEnd: offset };
    }

    // The loop bound proves the marker is present but not the length field,
    // and a getUint16 past the end throws rather than composing a length out
    // of nothing.
    if (offset + MARKER_BYTES + SEGMENT_LENGTH_BYTES > bytes.length) {
      return { ok: false, reason: 'malformed' };
    }

    const length = view.getUint16(offset + MARKER_BYTES);
    const end = offset + MARKER_BYTES + length;

    // A length shorter than the field itself, or one running past the end of
    // the file, is a corrupt or truncated file rather than a segment.
    if (length < SEGMENT_LENGTH_BYTES || end > bytes.length) {
      return { ok: false, reason: 'malformed' };
    }

    segments.push({
      marker,
      start: offset,
      payloadStart: offset + MARKER_BYTES + SEGMENT_LENGTH_BYTES,
      end,
    });
    offset = end;
  }

  return { ok: false, reason: 'malformed' };
};
