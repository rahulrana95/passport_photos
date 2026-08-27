import { describe, expect, it } from 'vitest';
import { buildJpegWithExif, buildJpegWithoutExif } from '@/testing/fixtures/jpeg-exif.builder';
import { APP0_MARKER, APP1_MARKER } from './jpeg-marker.constants';
import { scanJpegSegments, segmentIdentifiedBy } from './jpeg-segments.utils';

describe('walking a JPEG header', () => {
  it('finds every segment before the scan', () => {
    const bytes = buildJpegWithExif({ withJfifSegment: true, orientation: 1 });
    const scan = scanJpegSegments(bytes);

    expect(scan.ok).toBe(true);
    if (!scan.ok) return;
    expect(scan.segments.map((segment) => segment.marker)).toEqual([APP0_MARKER, APP1_MARKER]);
  });

  it('reports where each segment starts and ends', () => {
    const bytes = buildJpegWithExif({ withJfifSegment: true });
    const scan = scanJpegSegments(bytes);

    expect(scan.ok).toBe(true);
    if (!scan.ok) return;
    // Contiguous and in order: the end of one segment is the start of the
    // next. A gap would mean the walker had lost its place.
    const [first, second] = scan.segments;
    expect(first?.end).toBe(second?.start);
  });

  it('identifies a segment by the string it opens with', () => {
    const bytes = buildJpegWithExif({ withJfifSegment: true });
    const scan = scanJpegSegments(bytes);

    expect(scan.ok).toBe(true);
    if (!scan.ok) return;
    const [jfif] = scan.segments;
    expect(jfif === undefined ? false : segmentIdentifiedBy(bytes, jfif, 'JFIF\u0000')).toBe(true);
  });

  it('handles a file whose header holds nothing at all', () => {
    const scan = scanJpegSegments(buildJpegWithoutExif());

    expect(scan.ok).toBe(true);
    if (!scan.ok) return;
    expect(scan.segments).toEqual([]);
  });

  it('refuses anything that does not begin as a JPEG', () => {
    expect(scanJpegSegments(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toEqual({
      ok: false,
      reason: 'not-a-jpeg',
    });
  });

  it('refuses a file that ends mid-segment', () => {
    // Truncated downloads are the commonest corrupt file people have, and a
    // walker that read a length past the end would compose an offset out of
    // nothing and rewrite the file around it.
    const bytes = buildJpegWithExif({ withJfifSegment: true });

    expect(scanJpegSegments(bytes.subarray(0, 10))).toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses a length field that would not fit its own bytes', () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0x00, 0x00]);

    expect(scanJpegSegments(bytes)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses a byte where a marker should be', () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0x00, 0xe0, 0x00, 0x10, 0x00, 0x00]);

    expect(scanJpegSegments(bytes)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses a file that stops between a marker and its length', () => {
    // Two bytes short of a readable segment. Composing a length from what is
    // not there would produce an offset out of nothing.
    expect(scanJpegSegments(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('refuses a header that runs out before it ends', () => {
    // No start-of-scan and no end-of-image: the file simply stops.
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff]);

    expect(scanJpegSegments(bytes)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('stops at the start of the scan rather than reading the pixels', () => {
    // Inside compressed image data an 0xff byte is not a marker. A walker that
    // kept going would find thousands of imaginary segments in the pixels.
    const bytes = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0xff, 0xe0, 0xff, 0xe1, 0xff, 0xd9,
    ]);
    const scan = scanJpegSegments(bytes);

    expect(scan.ok).toBe(true);
    if (!scan.ok) return;
    expect(scan.segments).toEqual([]);
    expect(scan.headerEnd).toBe(2);
  });
});
