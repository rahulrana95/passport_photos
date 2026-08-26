import { ANALYSIS_WORKING_EDGE_PX } from '@/constants/limits.constants';
import { planWorkingSize } from './downscale.utils';
import { readJpegExif } from './exif-reader.utils';
import { DEFAULT_ORIENTATION } from './exif-orientation.utils';
import { validateCandidateFile, validateDecodedDimensions } from './file-validation.utils';
import { ingestionFailures } from './ingestion-failure.utils';
import type { ImageDecoder, IngestedImage } from './image-decoder.types';
import type { IngestionFailure } from './ingestion-failure.types';

export type IngestionResult =
  | { readonly ok: true; readonly image: IngestedImage }
  | { readonly ok: false; readonly failure: IngestionFailure };

/**
 * Turns whatever the user chose into a normalised bitmap, or into a refusal
 * they can act on.
 *
 * Ordered so the cheapest rejection happens first and nothing large is
 * allocated for a file that was never going to work. Every exit carries a
 * remedy, because the alternative — a generic failure — is the point at which
 * someone gives up and pays a competitor.
 */
export const ingestImage = async (
  bytes: Uint8Array,
  decoder: ImageDecoder,
  maxEdgePx: number = ANALYSIS_WORKING_EDGE_PX,
): Promise<IngestionResult> => {
  const validation = validateCandidateFile({ byteLength: bytes.length, header: bytes });
  if (!validation.ok) return { ok: false, failure: validation.failure };

  const { format } = validation;

  if (!decoder.canDecode(format)) {
    // HEIC gets its own message. "Not supported" is true and useless; the user
    // has an iPhone photo in front of them and needs the four taps that fix it.
    return {
      ok: false,
      failure:
        format === 'heic'
          ? ingestionFailures.heicNotDecodable()
          : ingestionFailures.formatNotSupported(format),
    };
  }

  // Only JPEG carries the EXIF that matters here. A PNG screenshot has no
  // orientation to correct and no shutter time to report.
  const exif = format === 'jpeg' ? readJpegExif(bytes) : { orientation: DEFAULT_ORIENTATION };

  const decoded = await decoder.decode({
    bytes,
    format,
    orientation: exif.orientation,
    maxEdgePx,
  });

  if (decoded === undefined) return { ok: false, failure: ingestionFailures.decodeFailed(format) };

  if (decoded.isAnimated) {
    return { ok: false, failure: ingestionFailures.animatedSource(format) };
  }

  // Checked against the corrected source, not the stored one. A portrait photo
  // stored 4032x3024 with orientation 6 is 3024 wide once upright, and judging
  // its short edge against the stored width would measure the wrong axis.
  const dimensionFailure = validateDecodedDimensions(
    decoded.source.widthPx,
    decoded.source.heightPx,
  );
  if (dimensionFailure !== undefined) return { ok: false, failure: dimensionFailure };

  return {
    ok: true,
    image: {
      format,
      orientation: exif.orientation,
      source: decoded.source,
      working: decoded.working,
      workingSize: planWorkingSize(decoded.source, maxEdgePx),
      ...(exif.capturedAt === undefined ? {} : { capturedAt: exif.capturedAt }),
    },
  };
};
