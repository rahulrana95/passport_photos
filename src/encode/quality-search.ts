import { MAX_JPEG_QUALITY, MIN_JPEG_QUALITY } from './encode.constants';
import { HALF } from '@/measurement/angle.constants';
import type { JpegEncoder } from './jpeg-encoder.types';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

export interface QualitySearchOutcome {
  readonly quality: number;
  readonly bytes: Uint8Array;
  /** How many times the encoder was run. Reported so a test can bound it. */
  readonly attempts: number;
}

export type QualitySearchResult =
  | ({ readonly ok: true } & QualitySearchOutcome)
  /**
   * The ceiling cannot be met without going below the quality floor. The
   * smallest file we are willing to produce is returned anyway — see below.
   */
  | ({ readonly ok: false; readonly reason: 'ceiling-unreachable' } & QualitySearchOutcome);

/**
 * Finds the best quality whose encoded size fits under a byte ceiling.
 *
 * TERMINATION IS STRUCTURAL, NOT CAPPED. An iteration counter was the obvious
 * insurance and it is the wrong kind: a cap that nothing can reach is a branch
 * no test can take, and a cap that something can reach silently returns a
 * worse answer than the search had already found. This is an integer bisection
 * over a fixed range where every step moves one bound strictly past the
 * midpoint, so it cannot run more than the log of that range. The bound is
 * asserted in the tests instead, where it stays honest — a search that stopped
 * converging would fail there rather than quietly costing eight seconds of
 * somebody's phone battery.
 *
 * THE FLOOR IS TRIED FIRST, and that ordering is the answer to "what if the
 * ceiling is unreachable". Asking the cheapest question first means the
 * impossible case is known after one encode rather than eight, and the file it
 * produces is the one to hand back with the explanation: a photograph the
 * reader can look at and judge, rather than nothing at all.
 */
export const searchQualityForBytes = async (
  encoder: JpegEncoder,
  image: PixelBuffer,
  maxBytes: number,
): Promise<QualitySearchResult> => {
  const floor = await encoder.encode(image, MIN_JPEG_QUALITY);
  let attempts = 1;

  if (floor.length > maxBytes) {
    return {
      ok: false,
      reason: 'ceiling-unreachable',
      quality: MIN_JPEG_QUALITY,
      bytes: floor,
      attempts,
    };
  }

  let best = { quality: MIN_JPEG_QUALITY, bytes: floor };
  let low = MIN_JPEG_QUALITY + 1;
  let high = MAX_JPEG_QUALITY;

  while (low <= high) {
    const quality = Math.floor((low + high) / HALF);
    const bytes = await encoder.encode(image, quality);
    attempts += 1;

    if (bytes.length <= maxBytes) {
      best = { quality, bytes };
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  return { ok: true, quality: best.quality, bytes: best.bytes, attempts };
};
