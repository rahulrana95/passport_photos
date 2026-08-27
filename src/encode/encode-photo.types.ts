export interface EncodedPhoto {
  readonly bytes: Uint8Array;
  readonly quality: number;
  readonly widthPx: number;
  readonly heightPx: number;
  /**
   * The resolution written into the file, derived from the pixel size and the
   * physical size rather than copied from the specification. See encode-photo.
   */
  readonly dpi: number;
  /**
   * Set when the file is larger than the authority's stated ceiling even at
   * the lowest quality we are willing to produce. The file is still here: the
   * reader gets a photograph and an explanation, not a failure.
   */
  readonly overBudget: { readonly bytes: number; readonly maxBytes: number } | undefined;
}

export const ENCODE_FAILURE_REASONS = ['source-resolution-too-low'] as const;

export type EncodeFailureReason = (typeof ENCODE_FAILURE_REASONS)[number];

export type EncodePhotoResult =
  | { readonly ok: true; readonly photo: EncodedPhoto }
  | { readonly ok: false; readonly reason: EncodeFailureReason };
