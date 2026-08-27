import { describe, expect, it } from 'vitest';
import {
  MAX_SOURCE_DIMENSION_PX,
  MAX_UPLOAD_BYTES,
  MIN_SOURCE_EDGE_PX,
} from '@/constants/limits.constants';
import { resolveIngestionFailure } from './resolve-failure.utils';
import { validateCandidateFile, validateDecodedDimensions } from './file-validation.utils';

const headerFor = (...parts: (number | string)[]): Uint8Array => {
  const flat: number[] = [];
  for (const part of parts) {
    if (typeof part === 'number') flat.push(part);
    else for (const character of part) flat.push(character.charCodeAt(0));
  }
  while (flat.length < 32) flat.push(0);
  return Uint8Array.from(flat);
};

const JPEG_HEADER = headerFor(0xff, 0xd8, 0xff, 0xe0);
const HEIC_HEADER = headerFor(0, 0, 0, 0x20, 'ftyp', 'heic');
const TIFF_HEADER = headerFor(0x49, 0x49, 0x2a, 0x00);

const candidate = (byteLength: number, header: Uint8Array = JPEG_HEADER): {
  byteLength: number;
  header: Uint8Array;
} => ({ byteLength, header });

describe('the cheap checks run before anything is decoded', () => {
  it('rejects an empty file with something the user can act on', () => {
    const result = validateCandidateFile(candidate(0));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('empty-file');
    expect(resolveIngestionFailure(result.failure).remedy).not.toBe('');
  });

  it('rejects an oversized file before reading its content', () => {
    // A 48MP RAW would otherwise reach a decoder that allocates hundreds of
    // megabytes and then fails.
    const result = validateCandidateFile(candidate(MAX_UPLOAD_BYTES + 1));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('too-large');
  });

  it('accepts a file exactly on the size limit', () => {
    expect(validateCandidateFile(candidate(MAX_UPLOAD_BYTES)).ok).toBe(true);
  });

  it('rejects content it cannot identify', () => {
    const result = validateCandidateFile(candidate(1000, headerFor('%PDF-1.7')));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('unrecognised-format');
  });

  it('checks size before format, so a huge non-image says the useful thing', () => {
    // Told "that is not an image" about a 200MB video, a user retries with
    // another video. Told it is too large, they do not.
    const result = validateCandidateFile(candidate(MAX_UPLOAD_BYTES + 1, headerFor('%PDF')));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('too-large');
  });
});

describe('formats', () => {
  it('accepts a JPEG and marks it natively decodable', () => {
    const result = validateCandidateFile(candidate(2_000_000));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe('jpeg');
    expect(result.decodeNatively).toBe(true);
  });

  it('accepts HEIC but does not promise a native decode', () => {
    // Safari on iOS decodes HEIC, and iOS is where these files come from.
    // Refusing on format alone turns away the exact user whose phone made it.
    const result = validateCandidateFile(candidate(3_000_000, HEIC_HEADER));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe('heic');
    expect(result.decodeNatively).toBe(false);
  });

  it('refuses TIFF, which no browser decodes', () => {
    const result = validateCandidateFile(candidate(5_000_000, TIFF_HEADER));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('format-not-supported');
    expect(result.failure.detectedFormat).toBe('tiff');
  });

  it('ignores the extension entirely — a renamed HEIC is caught', () => {
    // No filename is passed in at all, deliberately. The most common upload on
    // iOS is a HEIC renamed to .jpg, because renaming is what people try when
    // a file "will not work".
    const result = validateCandidateFile(candidate(3_000_000, HEIC_HEADER));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe('heic');
  });
});

describe('dimension checks, once something has been decoded', () => {
  it('passes an ordinary phone photo', () => {
    expect(validateDecodedDimensions(4032, 3024)).toBeUndefined();
  });

  it('rejects an image beyond the browser canvas limit', () => {
    expect(validateDecodedDimensions(MAX_SOURCE_DIMENSION_PX + 1, 1000)?.code).toBe(
      'too-large-dimensions',
    );
  });

  it('checks both axes against the canvas limit', () => {
    expect(validateDecodedDimensions(1000, MAX_SOURCE_DIMENSION_PX + 1)?.code).toBe(
      'too-large-dimensions',
    );
  });

  it('accepts an image exactly on the canvas limit', () => {
    expect(validateDecodedDimensions(MAX_SOURCE_DIMENSION_PX, MAX_SOURCE_DIMENSION_PX)).toBeUndefined();
  });

  it('judges smallness by the shorter edge', () => {
    // A panorama has width to spare and still cannot yield a 35mm square at
    // print resolution.
    expect(validateDecodedDimensions(4000, MIN_SOURCE_EDGE_PX - 1)?.code).toBe('too-small');
  });

  it('accepts an image exactly on the minimum edge', () => {
    expect(validateDecodedDimensions(MIN_SOURCE_EDGE_PX, MIN_SOURCE_EDGE_PX)).toBeUndefined();
  });

  it('reports the oversize case first when an image is both', () => {
    // Impossible for a real file, but the ordering must be defined rather than
    // accidental.
    expect(validateDecodedDimensions(MAX_SOURCE_DIMENSION_PX + 1, 10)?.code).toBe(
      'too-large-dimensions',
    );
  });

  it('names the actual dimensions in the message', () => {
    // The numbers come from the pipeline and the sentence from the content
    // module; this is the seam where they meet.
    const failure = validateDecodedDimensions(300, 200);
    const resolved = failure === undefined ? undefined : resolveIngestionFailure(failure);

    expect(resolved?.message).toContain('300');
    expect(resolved?.message).toContain('200');
  });
});
