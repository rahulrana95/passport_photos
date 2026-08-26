/**
 * The parameters a synthetic fixture is generated from.
 *
 * These values ARE the ground truth. Nothing is hand-measured, so a failing
 * assertion downstream means the code under test is wrong — not that someone
 * mis-measured a photograph.
 */
export interface SyntheticHeadSpec {
  readonly widthPx: number;
  readonly heightPx: number;

  /** Row of the topmost point of the head. May be negative — crown out of frame. */
  readonly crownY: number;
  /** Row of the bottom of the chin. May exceed heightPx — chin out of frame. */
  readonly chinY: number;
  /** Column of the facial midline. */
  readonly centreX: number;
  /** Widest horizontal extent of the head. */
  readonly headWidthPx: number;
  /** Row of the inter-ocular line. */
  readonly eyeY: number;

  /** 0–255. */
  readonly backgroundLuminance: number;
  /** 0–255. Set close to the background to reproduce the dark-hair failure. */
  readonly headLuminance: number;
  /** Extra rows of covering above the crown, e.g. a hat or hijab. */
  readonly headCoveringPx: number;

  /** Amplitude of deterministic sensor noise, 0–255. */
  readonly noiseAmplitude: number;
  readonly seed: number;
}

export interface SyntheticHeadFixture {
  readonly name: string;
  readonly description: string;
  readonly spec: SyntheticHeadSpec;
}

/** RGBA pixel buffer, the shape the analysis pipeline consumes. */
export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}
