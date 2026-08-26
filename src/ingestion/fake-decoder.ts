import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { NOMINAL_HEAD_SPEC } from '@/testing/fixtures/synthetic-head.constants';
import { NATIVELY_DECODABLE_FORMATS } from './image-format.constants';
import { fitWithin } from './downscale.utils';
import { orientedDimensions } from './exif-orientation.utils';
import type { DecodedImage, DecodeRequest, ImageDecoder } from './image-decoder.types';
import type { Dimensions } from './downscale.utils';
import type { ImageFormat } from './image-format.constants';

export interface FakeDecoderOptions {
  /** Dimensions as stored, before orientation is applied. */
  readonly storedSize?: Dimensions;
  /** Reproduces a damaged or truncated file. */
  readonly failToDecode?: boolean;
  readonly isAnimated?: boolean;
  /** Formats this decoder claims to handle. Defaults to the native set. */
  readonly supportedFormats?: readonly ImageFormat[];
}

const DEFAULT_STORED_SIZE: Dimensions = { widthPx: 4032, heightPx: 3024 };

/**
 * A decoder that produces a real bitmap without a browser.
 *
 * It renders the nominal head fixture at the requested working size, so the
 * pixels downstream code receives are the same deterministic ones the analysis
 * fixtures use — an ingestion test and an analysis test are then looking at the
 * same image, and a mismatch between them means something is genuinely wrong.
 */
export const createFakeDecoder = (options: FakeDecoderOptions = {}): ImageDecoder => {
  const supported = options.supportedFormats ?? NATIVELY_DECODABLE_FORMATS;
  const stored = options.storedSize ?? DEFAULT_STORED_SIZE;

  return {
    canDecode: (format) => supported.includes(format),

    decode: (request: DecodeRequest): Promise<DecodedImage | undefined> => {
      if (options.failToDecode === true) return Promise.resolve(undefined);

      // Orientation is applied first, exactly as a real decoder does: the
      // caller must never see stored dimensions for a rotated photo.
      const source = orientedDimensions(stored.widthPx, stored.heightPx, request.orientation);
      const working = fitWithin(source, request.maxEdgePx);

      return Promise.resolve({
        source,
        working: generateSyntheticHead({
          ...NOMINAL_HEAD_SPEC,
          widthPx: working.widthPx,
          heightPx: working.heightPx,
        }),
        isAnimated: options.isAnimated === true,
      });
    },
  };
};
