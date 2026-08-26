import { describe, expect, it } from 'vitest';
import { sniffImageFormat } from './magic-bytes.utils';

const bytesFrom = (...parts: (number | string)[]): Uint8Array => {
  const flat: number[] = [];
  for (const part of parts) {
    if (typeof part === 'number') flat.push(part);
    else for (const character of part) flat.push(character.charCodeAt(0));
  }
  // Padded so every signature has the 32 bytes a sniff may read.
  while (flat.length < 32) flat.push(0);
  return Uint8Array.from(flat);
};

const isoContainer = (brand: string): Uint8Array =>
  bytesFrom(0, 0, 0, 0x20, 'ftyp', brand, 0, 0, 0, 0, brand);

describe('formats identified from content', () => {
  it('identifies a JPEG', () => {
    expect(sniffImageFormat(bytesFrom(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
  });

  it('identifies a JPEG whose third byte is a different marker', () => {
    // FF D8 FF is the whole signature; what follows varies by encoder, and
    // JFIF, Exif and raw-APP0 files all start differently at byte four.
    expect(sniffImageFormat(bytesFrom(0xff, 0xd8, 0xff, 0xe1))).toBe('jpeg');
    expect(sniffImageFormat(bytesFrom(0xff, 0xd8, 0xff, 0xdb))).toBe('jpeg');
  });

  it('identifies a PNG', () => {
    expect(sniffImageFormat(bytesFrom(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
  });

  it('identifies a WebP, which needs both the RIFF tag and the form type', () => {
    expect(sniffImageFormat(bytesFrom('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('webp');
  });

  it('does not call a non-WebP RIFF file an image', () => {
    // A WAV file is RIFF too. Matching on the container alone would accept one.
    expect(sniffImageFormat(bytesFrom('RIFF', 0, 0, 0, 0, 'WAVE'))).toBeUndefined();
  });

  it('identifies both GIF versions', () => {
    expect(sniffImageFormat(bytesFrom('GIF87a'))).toBe('gif');
    expect(sniffImageFormat(bytesFrom('GIF89a'))).toBe('gif');
  });

  it('identifies TIFF in both byte orders', () => {
    expect(sniffImageFormat(bytesFrom(0x49, 0x49, 0x2a, 0x00))).toBe('tiff');
    expect(sniffImageFormat(bytesFrom(0x4d, 0x4d, 0x00, 0x2a))).toBe('tiff');
  });

  it('identifies a BMP', () => {
    expect(sniffImageFormat(bytesFrom('BM'))).toBe('bmp');
  });

  it('identifies every HEIF brand an iPhone writes', () => {
    // mif1 and msf1 are the generic image brands. An iPhone photo can carry
    // either, and treating them as unknown refuses a file the user can plainly
    // see is a photo.
    for (const brand of ['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']) {
      expect(sniffImageFormat(isoContainer(brand)), brand).toBe('heic');
    }
  });

  it('identifies AVIF, which shares the same container', () => {
    expect(sniffImageFormat(isoContainer('avif'))).toBe('avif');
    expect(sniffImageFormat(isoContainer('avis'))).toBe('avif');
  });

  it('does not call an MP4 an image, though it is the same container', () => {
    expect(sniffImageFormat(isoContainer('isom'))).toBeUndefined();
    expect(sniffImageFormat(isoContainer('mp42'))).toBeUndefined();
  });
});

describe('it refuses to guess', () => {
  it('returns undefined for an empty buffer', () => {
    expect(sniffImageFormat(new Uint8Array(0))).toBeUndefined();
  });

  it('returns undefined for a buffer too short to hold any signature', () => {
    expect(sniffImageFormat(Uint8Array.from([0xff]))).toBeUndefined();
  });

  it('returns undefined for a PDF, a ZIP and plain text', () => {
    expect(sniffImageFormat(bytesFrom('%PDF-1.7'))).toBeUndefined();
    expect(sniffImageFormat(bytesFrom(0x50, 0x4b, 0x03, 0x04))).toBeUndefined();
    expect(sniffImageFormat(bytesFrom('hello there'))).toBeUndefined();
  });

  it('reads the content, not the name — a renamed HEIC is still a HEIC', () => {
    // The most common upload on iOS. Someone renames photo.heic to photo.jpg
    // because that is what you try when a file "will not work", and every
    // extension-trusting implementation then hands a HEIC to a JPEG decoder.
    expect(sniffImageFormat(isoContainer('heic'))).toBe('heic');
  });

  it('is not fooled by a JPEG signature appearing later in the file', () => {
    expect(sniffImageFormat(bytesFrom(0x00, 0xff, 0xd8, 0xff))).toBeUndefined();
  });
});
