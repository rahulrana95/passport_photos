import { APP1_MARKER, EXIF_IDENTIFIER } from './jpeg-marker.constants';
import { scanJpegSegments, segmentIdentifiedBy } from './jpeg-segments.utils';
import type { JpegSegment } from './jpeg-segments.utils';

/**
 * REMOVING THE METADATA IS A PRIVACY REQUIREMENT, NOT A SIZE OPTIMISATION.
 *
 * A photograph taken on a phone carries, in its Exif block, the coordinates of
 * the place it was taken — usually somebody's home, since that is where people
 * photograph themselves against a wall. It also carries the device, its serial
 * number in some makes, and the exact second the shutter fired.
 *
 * This product's promise is that a photograph never leaves the device. The
 * file it hands back, though, is a file the reader then emails to a government
 * department, uploads to a portal, or prints at a shop. Passing their home
 * coordinates along inside it would honour the letter of that promise and
 * break the thing the promise is for.
 *
 * So the Exif block is removed outright rather than filtered. Filtering means
 * keeping a list of which tags are sensitive, and that list is wrong the day a
 * manufacturer adds a tag to it — there is nothing in an Exif block that a
 * passport photograph needs.
 */

const isExifSegment = (bytes: Uint8Array, segment: JpegSegment): boolean =>
  segment.marker === APP1_MARKER && segmentIdentifiedBy(bytes, segment, EXIF_IDENTIFIER);

/**
 * Returns the file with every Exif segment removed.
 *
 * Returns the input unchanged when it carries none, which is the ordinary case
 * for a file we encoded ourselves: the encoder is handed raw pixels and has
 * nothing to copy metadata from. The function exists for the case where that
 * stops being true — a future path that re-encodes an original rather than
 * rebuilding it — and for the test that proves coordinates do not survive.
 *
 * A file it cannot parse comes back untouched rather than truncated. Half-
 * stripping a JPEG whose structure we misread would corrupt the photograph to
 * protect it.
 */
export const stripExifSegments = (bytes: Uint8Array): Uint8Array => {
  const scan = scanJpegSegments(bytes);
  if (!scan.ok) return bytes;

  const exif = scan.segments.filter((segment) => isExifSegment(bytes, segment));
  if (exif.length === 0) return bytes;

  const removed = exif.reduce((total, segment) => total + (segment.end - segment.start), 0);
  const output = new Uint8Array(bytes.length - removed);
  let cursor = 0;
  let copiedTo = 0;

  for (const segment of exif) {
    output.set(bytes.subarray(copiedTo, segment.start), cursor);
    cursor += segment.start - copiedTo;
    copiedTo = segment.end;
  }
  output.set(bytes.subarray(copiedTo), cursor);

  return output;
};

/** True when the file still carries an Exif block. For asserting, mostly. */
export const hasExifSegment = (bytes: Uint8Array): boolean => {
  const scan = scanJpegSegments(bytes);
  return scan.ok && scan.segments.some((segment) => isExifSegment(bytes, segment));
};
