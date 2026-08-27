import {
  closeMask,
  componentContaining,
  fillHoles,
  isSubject,
  openMask,
  SUBJECT_THRESHOLD,
} from './mask-cleanup.utils';
import type { Mask } from './mask-cleanup.utils';

/**
 * Which point on the head a specification means by "top of head".
 *
 * Not a detail — the two differ by the height of someone's hair, which on a
 * voluminous or curly head is tens of millimetres, far more than any
 * tolerance. The UK explicitly says the crown is the top of the head "not
 * including hair"; US guidance measures to the top of the head as photographed.
 * A single hard-coded answer is wrong for one country or the other, so this is
 * a property of the specification and travels with it.
 */
export const CROWN_DEFINITIONS = ['visible-top', 'skull'] as const;

export type CrownDefinition = (typeof CROWN_DEFINITIONS)[number];

export const CROWN_FAILURE_REASONS = [
  'no-mask',
  'no-subject',
  'crown-outside-frame',
  'mask-unreliable',
] as const;

export type CrownFailureReason = (typeof CROWN_FAILURE_REASONS)[number];

export type CrownEstimate =
  | {
      readonly ok: true;
      /** Row of the crown, in mask pixel coordinates. */
      readonly crownY: number;
      readonly confidence: number;
      /**
       * True when a head covering or hair volume may be included in the
       * measurement and cannot be separated from it. The rule engine must
       * report this rather than swallow it.
       */
      readonly mayIncludeCovering: boolean;
    }
  | { readonly ok: false; readonly reason: CrownFailureReason };

/**
 * Confidence when the silhouette is clean and well inside the frame.
 * Deliberately not 1: this is an estimate from a model's mask, and a number
 * that claims certainty would be a lie the UI would then repeat.
 */
const CONFIDENCE_CLEAN = 0.9;
const CONFIDENCE_WITH_COVERING = 0.55;

/** Rows within which a mask touching the top edge is treated as cropped. */
const TOP_EDGE_MARGIN_PX = 2;

/**
 * Below this share of the frame, the largest component is not a person.
 * Guards against a mask that found only noise.
 */
const MIN_SUBJECT_AREA_RATIO = 0.02;

/**
 * Telling a hat from hair, using the only signal a silhouette carries.
 *
 * Not absolute width — that was the first attempt and it was wrong. A
 * voluminous head of hair is as wide as a hat, so width alone flags every
 * person with thick hair and the warning becomes noise.
 *
 * The real difference is the shape of the top. A skull, and the hair over it,
 * is a dome: at the very top it is narrow, and it widens quickly as you
 * descend. A hat, turban or hijab is flat or nearly flat — its topmost row is
 * almost as wide as the rows below it, then it stops.
 *
 * So: sample the width at the crown and a few rows down. A top that is nearly
 * as wide as what is under it is flat, and flat means covering. This returns a
 * flag rather than a corrected number, because knowing a covering is present
 * is possible and knowing where the skull is underneath it is not.
 */
const TAPER_SAMPLE_ROWS = 6;
const FLAT_TOP_RATIO = 0.8;
/** A flat top narrower than this fraction of the head is jewellery, not a hat. */
const MIN_COVERING_WIDTH_RATIO = 0.35;

const rowWidth = (mask: Mask, y: number): number => {
  let minX = -1;
  let maxX = -1;

  for (let x = 0; x < mask.width; x += 1) {
    if (!isSubject(mask, x, y)) continue;
    if (minX === -1) minX = x;
    maxX = x;
  }

  return minX === -1 ? 0 : maxX - minX + 1;
};

const subjectPixelCount = (mask: Mask): number => {
  let count = 0;
  // Iterated by value rather than by index: an indexed read is optional under
  // noUncheckedIndexedAccess, and guarding an absence that the loop bound
  // already rules out is an unreachable branch.
  for (const value of mask.data) {
    if (value >= SUBJECT_THRESHOLD) count += 1;
  }
  return count;
};

export interface CrownOptions {
  /** A point known to be on the subject — the face centre from the landmarks. */
  readonly faceCentreX: number;
  readonly faceCentreY: number;
  readonly definition: CrownDefinition;
  /** Widest extent of the head in mask pixels, from the landmarks. */
  readonly headWidthPx: number;
}

/**
 * Estimates the crown row from a segmentation mask.
 *
 * Landmarks stop at the hairline, so crown-to-chin — the most common rejection
 * reason on a passport application — depends entirely on this. It is the
 * riskiest measurement in the product, and the design reflects that: it
 * declines in more cases than it succeeds in, and it never returns a number it
 * cannot stand behind.
 *
 * Cleanup runs in a fixed order and each step earns its place:
 *   open  — removes speckle and thin attachments (earrings, glasses arms)
 *           before they can be mistaken for the top of the head
 *   close — bridges a gap where the model lost the hairline, so hair stays
 *           part of the head rather than becoming its own component
 *   component containing the face — discards a second person entirely, which
 *           no amount of filtering by size reliably does
 *   fill  — closes holes the model punched in the subject
 *
 * The order matters more than it looks. Closing after component selection was
 * the first attempt and it was strictly harmful: by then there is nothing left
 * to reconnect, and closing is extensive — it can only add pixels — so its
 * only remaining effect was to grow the silhouette upward and move the crown a
 * pixel or two higher than the head actually reaches. Before selection it does
 * the job it was chosen for.
 */
export const estimateCrown = (
  mask: Mask | undefined,
  options: CrownOptions,
): CrownEstimate => {
  if (mask === undefined) return { ok: false, reason: 'no-mask' };

  const bridged = closeMask(openMask(mask));
  const face = componentContaining(
    bridged,
    Math.round(options.faceCentreX),
    Math.round(options.faceCentreY),
  );

  if (face === undefined) return { ok: false, reason: 'no-subject' };

  const cleaned = fillHoles(face.mask);

  if (subjectPixelCount(cleaned) < mask.width * mask.height * MIN_SUBJECT_AREA_RATIO) {
    return { ok: false, reason: 'mask-unreliable' };
  }

  // Taken from the component walk. Filling holes only adds pixels that were
  // already enclosed by subject, so it can never raise the top row.
  const crownY = face.minY;

  // A mask reaching the top edge is a head that continues past it. The height
  // is unmeasurable, and guessing it is exactly the error that sends someone
  // to a passport office with a photo that will be rejected.
  if (crownY <= TOP_EDGE_MARGIN_PX) return { ok: false, reason: 'crown-outside-frame' };

  const topRowWidth = rowWidth(cleaned, crownY);
  const widthBelow = rowWidth(cleaned, crownY + TAPER_SAMPLE_ROWS);
  const isFlatTopped = widthBelow > 0 && topRowWidth >= widthBelow * FLAT_TOP_RATIO;
  const isWideEnoughToBeWorn = topRowWidth >= options.headWidthPx * MIN_COVERING_WIDTH_RATIO;
  const looksLikeCovering = isFlatTopped && isWideEnoughToBeWorn;

  // Under the skull definition a covering makes the measurement impossible
  // rather than merely uncertain: what is being asked for is underneath
  // something opaque, and no silhouette contains it.
  if (looksLikeCovering && options.definition === 'skull') {
    return { ok: false, reason: 'mask-unreliable' };
  }

  return {
    ok: true,
    crownY,
    confidence: looksLikeCovering ? CONFIDENCE_WITH_COVERING : CONFIDENCE_CLEAN,
    mayIncludeCovering: looksLikeCovering,
  };
};
