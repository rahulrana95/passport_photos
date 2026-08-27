/**
 * Everything the live view can tell somebody to do, worst problem first.
 *
 * THE ORDER IS THE DESIGN. Only the first unmet item is ever shown as the
 * instruction, because a live camera that lists five faults at once gets none
 * of them fixed — the reader reads, looks up, and the picture has changed. The
 * loop is "move closer… closer… hold there", and that only works if there is
 * exactly one thing to do at a time.
 *
 * Ordered by what has to be true before the next item can even be measured: a
 * head that is half out of frame has no meaningful head height, and telling
 * somebody their background is patterned while their chin is cut off is
 * answering a question they have not reached.
 */
export const GUIDANCE_IDS = [
  'no-face',
  'many-faces',
  'crown-hidden',
  'head-cut-off',
  'move-back',
  'move-closer',
  'move-left',
  'move-right',
  'raise-camera',
  'lower-camera',
  'level-head',
  'face-camera',
  'too-dark',
  'plain-background',
  'ready',
] as const;

export type GuidanceId = (typeof GUIDANCE_IDS)[number];

export interface LiveGuidance {
  /** The one thing to say. 'ready' when there is nothing left to fix. */
  readonly primary: GuidanceId;
  /**
   * Everything that is currently unmet, in the same order.
   *
   * Not rendered as a list — it drives the secondary indicators (the oval
   * turning green, the head-height readout) and it is what a test asserts
   * against, because asserting only the primary would let a second fault
   * appear or vanish unnoticed.
   */
  readonly unmet: readonly GuidanceId[];
  readonly ready: boolean;
  /**
   * Head height as a share of the frame, for the live readout. Undefined when
   * there was no head to measure.
   */
  readonly headFrameRatio: number | undefined;
}
