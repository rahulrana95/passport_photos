/** An inclusive range a measurement must fall within, in a single unit. */
export interface Band {
  readonly min: number;
  readonly max: number;
}

export type BandStatus = 'within' | 'below' | 'above';

export interface BandEvaluation {
  readonly status: BandStatus;
  /** The unrounded measurement, as evaluated. */
  readonly value: number;
  readonly band: Band;
  /**
   * Signed distance to the nearest edge of the band, in the band's own unit.
   * Negative when below, positive when above, exactly 0 when within.
   */
  readonly delta: number;
  /**
   * Multiplier that would bring the value to the nearest edge, or 1 when
   * already within. This is what powers a physical instruction: a head that
   * must grow by 1.2x means the subject moves roughly 20% closer to the camera.
   */
  readonly scaleToBand: number;
}
