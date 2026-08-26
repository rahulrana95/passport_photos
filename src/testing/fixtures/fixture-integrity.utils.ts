import { externalFixtureManifestSchema, type ExternalFixtureManifest } from './fixture-integrity.schema';

export interface IntegrityResult {
  readonly id: string;
  readonly ok: boolean;
  readonly reason?: string;
}

export const parseManifest = (raw: unknown): ExternalFixtureManifest =>
  externalFixtureManifestSchema.parse(raw);

/**
 * Compares a downloaded file against its manifest entry.
 *
 * Checked on every load, not only after download. A file can be truncated by a
 * failed copy or replaced by a stale cache long after it first arrived, and a
 * corrupted fixture must fail loudly rather than quietly shifting every
 * measurement that depends on it.
 */
export const verifyFixture = (
  manifest: ExternalFixtureManifest,
  id: string,
  actual: { readonly sha256: string; readonly sizeBytes: number },
): IntegrityResult => {
  const expected = manifest.fixtures.find((fixture) => fixture.id === id);

  if (expected === undefined) {
    return { id, ok: false, reason: `No manifest entry for "${id}"` };
  }
  if (actual.sizeBytes !== expected.sizeBytes) {
    return {
      id,
      ok: false,
      reason: `Size mismatch: expected ${expected.sizeBytes} bytes, found ${actual.sizeBytes}`,
    };
  }
  if (actual.sha256 !== expected.sha256) {
    return {
      id,
      ok: false,
      reason: `Checksum mismatch: expected ${expected.sha256}, found ${actual.sha256}`,
    };
  }
  return { id, ok: true };
};
