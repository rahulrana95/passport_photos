import {
  APP0_MARKER,
  JFIF_IDENTIFIER,
  JFIF_PAYLOAD_BYTES,
  JFIF_UNITS_OFFSET,
  JFIF_UNITS_PER_INCH,
  JFIF_VERSION_MAJOR,
  JFIF_VERSION_MINOR,
  JFIF_X_DENSITY_OFFSET,
  JFIF_Y_DENSITY_OFFSET,
  MARKER_BYTES,
  MARKER_PREFIX,
  SEGMENT_LENGTH_BYTES,
} from './jpeg-marker.constants';
import { scanJpegSegments, segmentIdentifiedBy } from './jpeg-segments.utils';

/**
 * WRITING THE PRINT RESOLUTION INTO THE FILE.
 *
 * This is the least interesting code in the product and one of the most
 * consequential, because a missing DPI is among the commonest reasons a
 * digitally submitted photograph comes back rejected.
 *
 * A JPEG says how large it is in pixels. It does not say how large it is in
 * millimetres unless its JFIF header carries a density, and libjpeg writes
 * that header with units 0 by default, meaning "these two numbers are an
 * aspect ratio". A 600 by 600 file with units 0 is 600 by 600 of nothing:
 * whatever software receives it picks a size, and the head that measured 33mm
 * on our crop prints at whatever that guess implies.
 *
 * So the density is written explicitly, in dots per inch, to match the DPI the
 * crop was computed at. The two must agree — they are the same number said
 * twice, once in the pixel dimensions and once in the header, and a file where
 * they disagree is a file that prints at the wrong size.
 */

export interface JfifDensity {
  readonly units: number;
  readonly x: number;
  readonly y: number;
}

/** Reads the declared density, or undefined when there is no JFIF header. */
export const readJfifDensity = (bytes: Uint8Array): JfifDensity | undefined => {
  const scan = scanJpegSegments(bytes);
  if (!scan.ok) return undefined;

  const jfif = scan.segments.find(
    (segment) =>
      segment.marker === APP0_MARKER && segmentIdentifiedBy(bytes, segment, JFIF_IDENTIFIER),
  );
  if (jfif === undefined) return undefined;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    units: Number(bytes[jfif.payloadStart + JFIF_UNITS_OFFSET]),
    x: view.getUint16(jfif.payloadStart + JFIF_X_DENSITY_OFFSET),
    y: view.getUint16(jfif.payloadStart + JFIF_Y_DENSITY_OFFSET),
  };
};

/** A complete JFIF APP0 segment declaring the given resolution. */
const buildJfifSegment = (dpi: number): Uint8Array => {
  const segment = new Uint8Array(MARKER_BYTES + SEGMENT_LENGTH_BYTES + JFIF_PAYLOAD_BYTES);
  const view = new DataView(segment.buffer);

  segment[0] = MARKER_PREFIX;
  segment[1] = APP0_MARKER;
  view.setUint16(MARKER_BYTES, SEGMENT_LENGTH_BYTES + JFIF_PAYLOAD_BYTES);

  const payload = MARKER_BYTES + SEGMENT_LENGTH_BYTES;
  for (const [index, character] of [...JFIF_IDENTIFIER].entries()) {
    segment[payload + index] = character.charCodeAt(0);
  }

  segment[payload + JFIF_IDENTIFIER.length] = JFIF_VERSION_MAJOR;
  segment[payload + JFIF_IDENTIFIER.length + 1] = JFIF_VERSION_MINOR;
  segment[payload + JFIF_UNITS_OFFSET] = JFIF_UNITS_PER_INCH;
  view.setUint16(payload + JFIF_X_DENSITY_OFFSET, dpi);
  view.setUint16(payload + JFIF_Y_DENSITY_OFFSET, dpi);

  return segment;
};

/**
 * Returns the file with its print resolution set, in dots per inch.
 *
 * Two paths, and both are real. libjpeg writes a JFIF header, so the usual
 * case is patching the three fields in place. A file without one — some
 * encoders write an Exif header instead — gets a JFIF segment inserted
 * directly after the start-of-image marker, which is where the specification
 * requires it to be.
 *
 * A file it cannot parse comes back untouched. There is nowhere safe to put a
 * segment in a structure we misread.
 */
export const setJfifDensity = (bytes: Uint8Array, dpi: number): Uint8Array => {
  const scan = scanJpegSegments(bytes);
  if (!scan.ok) return bytes;

  const jfif = scan.segments.find(
    (segment) =>
      segment.marker === APP0_MARKER && segmentIdentifiedBy(bytes, segment, JFIF_IDENTIFIER),
  );

  if (jfif === undefined) {
    const segment = buildJfifSegment(dpi);
    const output = new Uint8Array(bytes.length + segment.length);

    output.set(bytes.subarray(0, MARKER_BYTES), 0);
    output.set(segment, MARKER_BYTES);
    output.set(bytes.subarray(MARKER_BYTES), MARKER_BYTES + segment.length);

    return output;
  }

  const output = Uint8Array.from(bytes);
  const view = new DataView(output.buffer);

  output[jfif.payloadStart + JFIF_UNITS_OFFSET] = JFIF_UNITS_PER_INCH;
  view.setUint16(jfif.payloadStart + JFIF_X_DENSITY_OFFSET, dpi);
  view.setUint16(jfif.payloadStart + JFIF_Y_DENSITY_OFFSET, dpi);

  return output;
};
