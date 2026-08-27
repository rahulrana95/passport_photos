/**
 * Where the analysis models come from, and what they cost.
 *
 * SELF-HOSTED, NOT GOOGLE'S CDN. This is a privacy decision before it is a
 * performance one. The product's whole claim is that the photo never leaves
 * the device; a third-party request from the checker page would mean Google
 * sees an IP address and a timestamp correlatable with "this person is
 * checking a passport photo". Serving the same bytes from our own origin
 * leaves nothing to explain in a privacy policy, and it also removes a DNS
 * lookup, a TLS handshake and somebody else's uptime from the critical path.
 *
 * MEASURED COST OF A FIRST CHECK
 *   WASM runtime   11.76 MB raw -> 3.42 MB gzipped
 *   Landmark model  3.76 MB raw -> 3.33 MB gzipped (float16; barely compresses)
 *   ------------------------------------------------------------------
 *   Total          15.52 MB raw -> 6.75 MB gzipped, less again with brotli
 *
 * Every byte is lazy, so LCP is untouched — nothing here loads until someone
 * chooses a photo. But it is also the whole of the wait before a first result,
 * which is why the loader reports real progress rather than showing a spinner,
 * why the Cache API copy matters so much (only the first check ever pays), and
 * why warming on pointerenter over the dropzone is worth the complexity.
 */

/** Bumped when the model or runtime changes, to invalidate cached copies. */
export const MODEL_CACHE_NAME = 'passport-photo-models-v1';

/** Served from our own origin; populated at build time by scripts/fetch-models.mjs. */
export const MODEL_BASE_PATH = '/models';

export const FACE_LANDMARKER_MODEL_PATH = `${MODEL_BASE_PATH}/face_landmarker.task`;
export const WASM_BASE_PATH = `${MODEL_BASE_PATH}/wasm`;

/**
 * Upstream source and its digest, verified at build time.
 *
 * Pinned by content, not just by URL: the URL is mutable and belongs to
 * somebody else, and a model that silently changed would move every
 * measurement this product makes without a single test failing.
 */
export const FACE_LANDMARKER_UPSTREAM_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export const FACE_LANDMARKER_SHA256 =
  '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';

export const FACE_LANDMARKER_BYTES = 3_758_596;

/** Total bytes the loader reports progress against, for an honest percentage. */
export const WASM_RUNTIME_BYTES = 11_756_954;
export const TOTAL_MODEL_BYTES = FACE_LANDMARKER_BYTES + WASM_RUNTIME_BYTES;
