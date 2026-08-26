/**
 * Operational limits. Each one exists to stop a specific failure mode, named in
 * the comment so nobody relaxes it without understanding what it was guarding.
 */

/** Rejected before decode. Phone photos are large; 50MB covers any real camera. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Browsers cap canvas dimensions around 16,384px and throw or silently produce
 * a blank bitmap beyond it. Checked before decode rather than after.
 */
export const MAX_SOURCE_DIMENSION_PX = 16_384;

/**
 * Detection runs on a downscaled copy. Roughly an order of magnitude faster than
 * analysing a 12MP original, with no measurable loss in landmark accuracy.
 */
export const ANALYSIS_WORKING_EDGE_PX = 1_600;

/** Below this, no specification can be satisfied at print resolution. */
export const MIN_SOURCE_EDGE_PX = 480;

/** A worker task exceeding this is treated as hung and the worker restarted. */
export const WORKER_TASK_TIMEOUT_MS = 30_000;

/** Model fetch budget before the UI offers a retry. */
export const MODEL_LOAD_TIMEOUT_MS = 60_000;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];
