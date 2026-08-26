import { describe, expect, it } from 'vitest';
import { parseManifest, verifyFixture } from './fixture-integrity.utils';

const VALID_HASH = 'a'.repeat(64);

const MANIFEST = parseManifest({
  version: 1,
  fixtures: [
    {
      id: 'sfhq-sample',
      url: 'https://example.com/sfhq-sample.zip',
      sha256: VALID_HASH,
      sizeBytes: 1024,
      licence: 'CC0-1.0',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attribution: 'SFHQ, synthetic faces, no real subjects',
    },
  ],
});

describe('parseManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(MANIFEST.fixtures).toHaveLength(1);
  });

  it('rejects a checksum that is not 64 hex characters', () => {
    expect(() =>
      parseManifest({
        version: 1,
        fixtures: [{ ...MANIFEST.fixtures[0], sha256: 'deadbeef' }],
      }),
    ).toThrow();
  });

  it('rejects an uppercase checksum, so comparison never depends on case', () => {
    expect(() =>
      parseManifest({
        version: 1,
        fixtures: [{ ...MANIFEST.fixtures[0], sha256: 'A'.repeat(64) }],
      }),
    ).toThrow();
  });

  it('rejects an entry with no licence recorded', () => {
    // "We assumed it was fine" is exactly how a non-commercial dataset ends up
    // in a commercial product.
    expect(() =>
      parseManifest({
        version: 1,
        fixtures: [{ ...MANIFEST.fixtures[0], licence: '' }],
      }),
    ).toThrow();
  });

  it('rejects a relative URL', () => {
    expect(() =>
      parseManifest({
        version: 1,
        fixtures: [{ ...MANIFEST.fixtures[0], url: '/local/file.zip' }],
      }),
    ).toThrow();
  });
});

describe('verifyFixture', () => {
  it('passes when hash and size both match', () => {
    expect(verifyFixture(MANIFEST, 'sfhq-sample', { sha256: VALID_HASH, sizeBytes: 1024 })).toEqual({
      id: 'sfhq-sample',
      ok: true,
    });
  });

  it('fails, and says so, when the file is truncated', () => {
    const result = verifyFixture(MANIFEST, 'sfhq-sample', { sha256: VALID_HASH, sizeBytes: 512 });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Size mismatch');
  });

  it('fails when the content changed upstream', () => {
    const result = verifyFixture(MANIFEST, 'sfhq-sample', {
      sha256: 'b'.repeat(64),
      sizeBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Checksum mismatch');
  });

  it('fails for an id the manifest does not know', () => {
    const result = verifyFixture(MANIFEST, 'unknown', { sha256: VALID_HASH, sizeBytes: 1024 });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('No manifest entry');
  });
});
