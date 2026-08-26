import { z } from 'zod';

/**
 * Manifest for externally-sourced fixtures.
 *
 * No image is committed to this repository. Large binaries bloat every clone
 * forever, and — more importantly — the corpus must stay reproducible from a
 * declaration rather than from whatever happens to be on disk.
 *
 * Every entry is pinned by SHA-256. A silently-changed upstream file would
 * otherwise shift every downstream measurement with no visible cause.
 */
export const externalFixtureSchema = z.object({
  id: z.string().min(1),
  url: z.url(),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/, { error: 'sha256 must be 64 lowercase hex characters' }),
  sizeBytes: z.number().int().positive(),
  /** Recorded so a licence question is answered in the repo, never assumed. */
  licence: z.string().min(1),
  licenceUrl: z.url(),
  attribution: z.string().min(1),
});

export const externalFixtureManifestSchema = z.object({
  version: z.number().int().positive(),
  fixtures: z.array(externalFixtureSchema),
});

export type ExternalFixture = z.infer<typeof externalFixtureSchema>;
export type ExternalFixtureManifest = z.infer<typeof externalFixtureManifestSchema>;
